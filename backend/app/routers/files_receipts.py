from html import escape
from io import BytesIO
from uuid import UUID
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ValidationException
from app.core.permissions import PermissionChecker
from app.core.responses import success_response
from app.core.tenant import TenantContext
from app.infrastructure.models.models import (
    Branch,
    FileCategory,
    NotificationChannel,
    NotificationJob,
    NotificationRecipient,
    Organization,
    Parent,
    Payment,
    Receipt,
    Student,
    StudentFile,
    StudentParent,
    User,
)
from app.infrastructure.pdf.receipt_pdf import generate_receipt_pdf
from app.infrastructure.repositories.base import BaseRepository
from app.infrastructure.storage.local_storage import LocalFileStorage

router = APIRouter(tags=["Files & Receipts"])
settings = get_settings()


def _validate_upload(file: UploadFile, content: bytes) -> None:
    if len(content) > settings.max_upload_size_bytes:
        raise ValidationException(f"Dosya boyutu {settings.MAX_UPLOAD_SIZE_MB}MB limitini aşıyor")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in settings.allowed_file_types_list:
        raise ValidationException(f"İzin verilmeyen dosya türü: {ext}")
    signatures = {
        "pdf": (b"%PDF-",),
        "jpg": (b"\xff\xd8\xff",),
        "jpeg": (b"\xff\xd8\xff",),
        "png": (b"\x89PNG\r\n\x1a\n",),
    }
    if ext in signatures and not content.startswith(signatures[ext]):
        raise ValidationException("Dosya içeriği uzantısıyla eşleşmiyor")
    if ext == "docx":
        try:
            with ZipFile(BytesIO(content)) as archive:
                names = set(archive.namelist())
        except BadZipFile as exc:
            raise ValidationException("Geçersiz DOCX dosyası") from exc
        if "[Content_Types].xml" not in names or "word/document.xml" not in names:
            raise ValidationException("Geçersiz DOCX dosyası")


async def _build_receipt_context(db: AsyncSession, receipt: Receipt) -> dict:
    payment = (
        await db.execute(select(Payment).where(Payment.id == receipt.payment_id))
    ).scalar_one()
    student = (
        await db.execute(select(Student).where(Student.id == payment.student_id))
    ).scalar_one()
    org = (
        await db.execute(select(Organization).where(Organization.id == receipt.organization_id))
    ).scalar_one_or_none()
    branch = (
        await db.execute(select(Branch).where(Branch.id == receipt.branch_id))
    ).scalar_one_or_none()
    receiver = (
        await db.execute(select(User).where(User.id == payment.received_by))
    ).scalar_one_or_none()

    parent_name = ""
    parent_result = await db.execute(
        select(Parent)
        .join(StudentParent, StudentParent.parent_id == Parent.id)
        .where(StudentParent.student_id == student.id, StudentParent.is_primary.is_(True))
        .limit(1)
    )
    parent = parent_result.scalar_one_or_none()
    if parent:
        parent_name = f"{parent.first_name} {parent.last_name}"

    return {
        "organization_name": org.name if org else "EduPanel",
        "branch_name": branch.name if branch else "",
        "receipt_number": receipt.receipt_number,
        "issued_at": receipt.issued_at.strftime("%d.%m.%Y %H:%M"),
        "student_name": f"{student.first_name} {student.last_name}",
        "parent_name": parent_name,
        "amount": str(payment.amount),
        "payment_method": payment.payment_method.value,
        "remaining_debt": str(receipt.remaining_debt),
        "received_by": f"{receiver.first_name} {receiver.last_name}" if receiver else "",
    }


@router.get("/api/students/{student_id}/files")
async def list_student_files(
    student_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("student.read")),
    db: AsyncSession = Depends(get_db),
):
    repo = BaseRepository(db, tenant)
    await repo.get_by_id(student_id, Student)
    result = await db.execute(
        select(StudentFile)
        .where(
            StudentFile.student_id == student_id,
            StudentFile.deleted_at.is_(None),
        )
        .order_by(StudentFile.created_at.desc())
    )
    files = result.scalars().all()
    return success_response(
        [
            {
                "id": str(f.id),
                "category": f.category.value,
                "file_name": f.file_name,
                "original_name": f.original_name,
                "mime_type": f.mime_type,
                "file_size": f.file_size,
                "created_at": f.created_at.isoformat(),
            }
            for f in files
        ]
    )


@router.post("/api/students/{student_id}/files")
async def upload_student_file(
    student_id: UUID,
    category: str = Form("OTHER"),
    file: UploadFile = File(...),
    tenant: TenantContext = Depends(PermissionChecker("student.write")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = BaseRepository(db, tenant)
    student = await repo.get_by_id(student_id, Student)
    content = await file.read()
    _validate_upload(file, content)

    storage = LocalFileStorage()
    subfolder = f"students/{student_id}"
    storage_path = await storage.save_async(content, file.filename or "file", subfolder)

    student_file = StudentFile(
        organization_id=student.organization_id,
        branch_id=student.branch_id,
        student_id=student_id,
        category=FileCategory(category),
        file_name=storage_path.split("/")[-1],
        original_name=file.filename or "file",
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        storage_path=storage_path,
        uploaded_by=user.id,
    )
    db.add(student_file)
    await db.flush()
    return success_response({"id": str(student_file.id)}, "Dosya yüklendi")


@router.delete("/api/students/{student_id}/files/{file_id}")
async def delete_student_file(
    student_id: UUID,
    file_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("student.write")),
    db: AsyncSession = Depends(get_db),
):
    repo = BaseRepository(db, tenant)
    await repo.get_by_id(student_id, Student)
    result = await db.execute(
        select(StudentFile).where(
            StudentFile.id == file_id,
            StudentFile.student_id == student_id,
            StudentFile.deleted_at.is_(None),
        )
    )
    student_file = result.scalar_one_or_none()
    if not student_file:
        raise NotFoundException("Dosya bulunamadı")
    await repo.soft_delete(student_file)
    return success_response(message="Dosya silindi")


@router.get("/api/students/{student_id}/files/{file_id}/download")
async def download_student_file(
    student_id: UUID,
    file_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("student.read")),
    db: AsyncSession = Depends(get_db),
):
    repo = BaseRepository(db, tenant)
    await repo.get_by_id(student_id, Student)
    result = await db.execute(
        select(StudentFile).where(
            StudentFile.id == file_id,
            StudentFile.student_id == student_id,
            StudentFile.deleted_at.is_(None),
        )
    )
    student_file = result.scalar_one_or_none()
    if not student_file:
        raise NotFoundException("Dosya bulunamadı")
    storage = LocalFileStorage()
    full_path = storage.get_full_path(student_file.storage_path)
    if not full_path.exists():
        raise NotFoundException("Dosya diskte bulunamadı")
    return FileResponse(
        path=str(full_path),
        filename=student_file.original_name,
        media_type=student_file.mime_type,
    )


@router.get("/api/receipts/{receipt_id}/pdf")
async def download_receipt_pdf(
    receipt_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("receipt.read")),
    db: AsyncSession = Depends(get_db),
):
    receipt = await BaseRepository(db, tenant).get_by_id(receipt_id, Receipt)
    context = await _build_receipt_context(db, receipt)
    pdf_bytes = generate_receipt_pdf(context)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{receipt.receipt_number}.pdf"'},
    )


@router.get("/api/receipts/{receipt_id}/print")
async def print_receipt(
    receipt_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("receipt.read")),
    db: AsyncSession = Depends(get_db),
):
    receipt = await BaseRepository(db, tenant).get_by_id(receipt_id, Receipt)
    raw_ctx = await _build_receipt_context(db, receipt)
    ctx = {key: escape(str(value), quote=True) for key, value in raw_ctx.items()}
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Makbuz {ctx['receipt_number']}</title>
<style>
body {{ font-family: Arial, sans-serif; max-width: 210mm; margin: 20mm auto; }}
h1 {{ font-size: 18px; }} table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
td {{ padding: 8px; border-bottom: 1px solid #eee; }}
.label {{ font-weight: bold; width: 40%; }}
@media print {{ body {{ margin: 0; }} }}
</style></head><body>
<h1>{ctx['organization_name']}</h1>
<h2>TAHSİLAT MAKBUZU</h2>
<p><strong>Makbuz No:</strong> {ctx['receipt_number']} &nbsp; <strong>Tarih:</strong> {ctx['issued_at']}</p>
<table>
<tr><td class="label">Şube</td><td>{ctx['branch_name']}</td></tr>
<tr><td class="label">Öğrenci</td><td>{ctx['student_name']}</td></tr>
<tr><td class="label">Veli</td><td>{ctx['parent_name']}</td></tr>
<tr><td class="label">Ödeme Tutarı</td><td>{ctx['amount']} TL</td></tr>
<tr><td class="label">Ödeme Yöntemi</td><td>{ctx['payment_method']}</td></tr>
<tr><td class="label">Kalan Borç</td><td>{ctx['remaining_debt']} TL</td></tr>
<tr><td class="label">Tahsilatı Alan</td><td>{ctx['received_by']}</td></tr>
</table>
<script>window.onload=function(){{window.print();}}</script>
</body></html>"""
    return HTMLResponse(content=html)


async def _queue_receipt_notification(
    db: AsyncSession,
    receipt: Receipt,
    channel: NotificationChannel,
    user: User,
    address: str,
    recipient_name: str,
) -> None:
    job = NotificationJob(
        organization_id=receipt.organization_id,
        branch_id=receipt.branch_id,
        channel=channel,
        subject=f"Makbuz: {receipt.receipt_number}",
        body=f"Makbuz numaranız: {receipt.receipt_number}",
        reference_type="receipt",
        reference_id=receipt.id,
        created_by=user.id,
    )
    db.add(job)
    await db.flush()
    db.add(
        NotificationRecipient(
            notification_job_id=job.id,
            recipient_name=recipient_name,
            recipient_address=address,
        )
    )


@router.post("/api/receipts/{receipt_id}/send-email")
async def send_receipt_email(
    receipt_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("receipt.write")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    receipt = await BaseRepository(db, tenant).get_by_id(receipt_id, Receipt)
    payment = (
        await db.execute(select(Payment).where(Payment.id == receipt.payment_id))
    ).scalar_one()
    parent = (
        await db.execute(
            select(Parent)
            .join(StudentParent, StudentParent.parent_id == Parent.id)
            .where(StudentParent.student_id == payment.student_id, Parent.email.isnot(None))
            .limit(1)
        )
    ).scalar_one_or_none()
    if not parent or not parent.email:
        raise ValidationException("Veli e-posta adresi bulunamadı")
    await _queue_receipt_notification(
        db,
        receipt,
        NotificationChannel.EMAIL,
        user,
        parent.email,
        f"{parent.first_name} {parent.last_name}",
    )
    return success_response(message="Makbuz e-posta kuyruğuna alındı")


@router.post("/api/receipts/{receipt_id}/send-sms")
async def send_receipt_sms(
    receipt_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("receipt.write")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    receipt = await BaseRepository(db, tenant).get_by_id(receipt_id, Receipt)
    payment = (
        await db.execute(select(Payment).where(Payment.id == receipt.payment_id))
    ).scalar_one()
    parent = (
        await db.execute(
            select(Parent)
            .join(StudentParent, StudentParent.parent_id == Parent.id)
            .where(StudentParent.student_id == payment.student_id)
            .limit(1)
        )
    ).scalar_one_or_none()
    phone = (parent.sms_phone or parent.phone) if parent else None
    if not phone:
        raise ValidationException("Veli telefon numarası bulunamadı")
    await _queue_receipt_notification(
        db,
        receipt,
        NotificationChannel.SMS,
        user,
        phone,
        f"{parent.first_name} {parent.last_name}" if parent else "",
    )
    return success_response(message="Makbuz SMS kuyruğuna alındı")


@router.post("/api/receipts/{receipt_id}/send-whatsapp")
async def send_receipt_whatsapp(
    receipt_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("receipt.write")),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    receipt = await BaseRepository(db, tenant).get_by_id(receipt_id, Receipt)
    payment = (
        await db.execute(select(Payment).where(Payment.id == receipt.payment_id))
    ).scalar_one()
    parent = (
        await db.execute(
            select(Parent)
            .join(StudentParent, StudentParent.parent_id == Parent.id)
            .where(StudentParent.student_id == payment.student_id)
            .limit(1)
        )
    ).scalar_one_or_none()
    phone = (parent.whatsapp_phone or parent.phone) if parent else None
    if not phone:
        raise ValidationException("Veli WhatsApp numarası bulunamadı")
    await _queue_receipt_notification(
        db,
        receipt,
        NotificationChannel.WHATSAPP,
        user,
        phone,
        f"{parent.first_name} {parent.last_name}" if parent else "",
    )
    return success_response(message="Makbuz WhatsApp kuyruğuna alındı")

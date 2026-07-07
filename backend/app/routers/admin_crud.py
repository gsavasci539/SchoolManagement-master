from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from app.core.permissions import PermissionChecker
from app.core.responses import paginate, success_response
from app.core.tenant import TenantContext
from app.infrastructure.models.models import (
    Parent,
    ParentRelationType,
    Permission,
    Role,
    RolePermission,
    User,
)
from app.infrastructure.repositories.base import BaseRepository

router = APIRouter(tags=["Parents & Access Control"])


def parent_dict(parent: Parent) -> dict:
    relation = parent.relation_type.value
    return {
        "id": str(parent.id),
        "organization_id": str(parent.organization_id),
        "first_name": parent.first_name,
        "last_name": parent.last_name,
        "relation_type": relation,
        "relationship": relation,
        "phone": parent.phone,
        "sms_phone": parent.sms_phone,
        "whatsapp_phone": parent.whatsapp_phone,
        "email": parent.email,
        "address": parent.address,
        "receive_notifications": parent.receive_notifications,
        "notification_email": parent.receive_notifications,
        "notification_sms": parent.receive_notifications,
        "notification_whatsapp": parent.receive_notifications,
        "status": "ACTIVE" if parent.deleted_at is None else "PASSIVE",
    }


def permission_dict(permission: Permission) -> dict:
    return {
        "id": str(permission.id),
        "code": permission.code,
        "name": permission.name,
        "module": permission.module,
        "description": permission.description,
    }


def role_dict(role: Role) -> dict:
    return {
        "id": str(role.id),
        "name": role.name,
        "slug": role.slug,
        "description": role.description,
        "is_system": role.is_system,
        "organization_id": str(role.organization_id) if role.organization_id else None,
    }


@router.get("/api/parents")
async def list_parents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    tenant: TenantContext = Depends(PermissionChecker("student.read", "parent.read")),
    db: AsyncSession = Depends(get_db),
):
    query = select(Parent).where(Parent.deleted_at.is_(None))
    query = BaseRepository(db, tenant)._org_filter(query, Parent)
    if search:
        query = query.where(or_(Parent.first_name.ilike(f"%{search}%"), Parent.last_name.ilike(f"%{search}%")))
    items, total = await BaseRepository(db, tenant).paginate(query.order_by(Parent.last_name, Parent.first_name), page, page_size)
    return success_response(paginate([parent_dict(parent) for parent in items], total, page, page_size))


@router.post("/api/parents")
async def create_parent(
    body: dict,
    tenant: TenantContext = Depends(PermissionChecker("student.write", "parent.write")),
    db: AsyncSession = Depends(get_db),
):
    organization_id = UUID(body["organization_id"]) if body.get("organization_id") else tenant.organization_id
    if not organization_id or not tenant.can_access_organization(organization_id):
        raise ForbiddenException()
    relation = body.get("relation_type") or body.get("relationship") or "GUARDIAN"
    try:
        relation_type = ParentRelationType(str(relation).upper())
    except ValueError as exc:
        raise ValidationException("Geçersiz yakınlık türü") from exc
    parent = Parent(
        organization_id=organization_id,
        first_name=str(body.get("first_name", "")).strip(),
        last_name=str(body.get("last_name", "")).strip(),
        relation_type=relation_type,
        phone=body.get("phone"),
        sms_phone=body.get("sms_phone"),
        whatsapp_phone=body.get("whatsapp_phone"),
        email=body.get("email"),
        address=body.get("address"),
        receive_notifications=bool(body.get("receive_notifications", body.get("notification_email", True))),
        created_by=tenant.user_id,
        updated_by=tenant.user_id,
    )
    if not parent.first_name or not parent.last_name:
        raise ValidationException("Veli adı ve soyadı zorunludur")
    db.add(parent)
    await db.flush()
    return success_response(parent_dict(parent), "Veli oluşturuldu")


@router.get("/api/parents/{parent_id}")
async def get_parent(
    parent_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("student.read", "parent.read")),
    db: AsyncSession = Depends(get_db),
):
    parent = await BaseRepository(db, tenant).get_by_id(parent_id, Parent)
    return success_response(parent_dict(parent))


@router.put("/api/parents/{parent_id}")
async def update_parent(
    parent_id: UUID,
    body: dict,
    tenant: TenantContext = Depends(PermissionChecker("student.write", "parent.write")),
    db: AsyncSession = Depends(get_db),
):
    parent = await BaseRepository(db, tenant).get_by_id(parent_id, Parent)
    relation = body.get("relation_type") or body.get("relationship")
    if relation:
        try:
            parent.relation_type = ParentRelationType(str(relation).upper())
        except ValueError as exc:
            raise ValidationException("Geçersiz yakınlık türü") from exc
    for key in ("first_name", "last_name", "phone", "sms_phone", "whatsapp_phone", "email", "address"):
        if key in body:
            setattr(parent, key, body[key])
    if "receive_notifications" in body or "notification_email" in body:
        parent.receive_notifications = bool(body.get("receive_notifications", body.get("notification_email")))
    parent.updated_by = tenant.user_id
    return success_response(parent_dict(parent), "Veli güncellendi")


@router.delete("/api/parents/{parent_id}")
async def delete_parent(
    parent_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("student.write", "parent.write")),
    db: AsyncSession = Depends(get_db),
):
    parent = await BaseRepository(db, tenant).get_by_id(parent_id, Parent)
    parent.deleted_at = datetime.now(timezone.utc)
    parent.updated_by = tenant.user_id
    return success_response(message="Veli pasife alındı")


@router.get("/api/users/{user_id}/roles")
async def get_user_roles(
    user_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("user.read")),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id, User.deleted_at.is_(None)))).scalar_one_or_none()
    if not user:
        raise NotFoundException("Kullanıcı bulunamadı")
    if not tenant.is_super_admin and user.organization_id != tenant.organization_id:
        raise ForbiddenException()
    return success_response([role_dict(role) for role in user.roles])


@router.get("/api/users/{user_id}/branches")
async def get_user_branches(
    user_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("user.read")),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).options(selectinload(User.branches)).where(User.id == user_id, User.deleted_at.is_(None)))).scalar_one_or_none()
    if not user:
        raise NotFoundException("Kullanıcı bulunamadı")
    if not tenant.is_super_admin and user.organization_id != tenant.organization_id:
        raise ForbiddenException()
    return success_response([{"id": str(branch.id), "name": branch.name, "code": branch.code} for branch in user.branches])


@router.get("/api/roles/{role_id}")
async def get_role(
    role_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("user.read", "role.read")),
    db: AsyncSession = Depends(get_db),
):
    role = (await db.execute(select(Role).where(Role.id == role_id, Role.deleted_at.is_(None)))).scalar_one_or_none()
    if not role:
        raise NotFoundException("Rol bulunamadı")
    if not tenant.is_super_admin and role.organization_id not in (None, tenant.organization_id):
        raise ForbiddenException()
    return success_response(role_dict(role))


@router.post("/api/roles")
async def create_role(
    body: dict,
    tenant: TenantContext = Depends(PermissionChecker("user.write", "role.write")),
    db: AsyncSession = Depends(get_db),
):
    name = str(body.get("name", "")).strip()
    slug = str(body.get("slug", "")).strip().lower()
    if not name or not slug:
        raise ValidationException("Rol adı ve kısa kodu zorunludur")
    organization_id = tenant.organization_id
    existing = (await db.execute(select(Role).where(Role.slug == slug, Role.organization_id == organization_id, Role.deleted_at.is_(None)))).scalar_one_or_none()
    if existing:
        raise ConflictException("Bu rol kodu zaten mevcut")
    role = Role(name=name, slug=slug, description=body.get("description"), organization_id=organization_id, is_system=False)
    db.add(role)
    await db.flush()
    return success_response(role_dict(role), "Rol oluşturuldu")


@router.get("/api/roles/{role_id}/permissions")
async def get_role_permissions(
    role_id: UUID,
    tenant: TenantContext = Depends(PermissionChecker("user.read", "role.read")),
    db: AsyncSession = Depends(get_db),
):
    role = (await db.execute(select(Role).options(selectinload(Role.permissions)).where(Role.id == role_id, Role.deleted_at.is_(None)))).scalar_one_or_none()
    if not role:
        raise NotFoundException("Rol bulunamadı")
    if not tenant.is_super_admin and role.organization_id not in (None, tenant.organization_id):
        raise ForbiddenException()
    return success_response([permission_dict(permission) for permission in role.permissions])


async def _replace_role_permissions(role_id: UUID, permission_ids: list[str], tenant: TenantContext, db: AsyncSession):
    role = (await db.execute(select(Role).where(Role.id == role_id, Role.deleted_at.is_(None)))).scalar_one_or_none()
    if not role:
        raise NotFoundException("Rol bulunamadı")
    if role.is_system or (not tenant.is_super_admin and role.organization_id != tenant.organization_id):
        raise ForbiddenException("Bu rolün izinleri değiştirilemez")
    ids = [UUID(value) for value in permission_ids]
    found = list((await db.execute(select(Permission.id).where(Permission.id.in_(ids)))).scalars().all()) if ids else []
    if len(found) != len(set(ids)):
        raise ValidationException("Geçersiz izin kaydı")
    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))
    for permission_id in ids:
        db.add(RolePermission(role_id=role_id, permission_id=permission_id))
    return success_response(message="Rol izinleri güncellendi")


@router.post("/api/roles/{role_id}/permissions")
async def assign_role_permissions_post(
    role_id: UUID,
    body: dict,
    tenant: TenantContext = Depends(PermissionChecker("user.write", "role.write")),
    db: AsyncSession = Depends(get_db),
):
    return await _replace_role_permissions(role_id, body.get("permission_ids", []), tenant, db)


@router.put("/api/roles/{role_id}/permissions")
async def assign_role_permissions_put(
    role_id: UUID,
    body: dict,
    tenant: TenantContext = Depends(PermissionChecker("user.write", "role.write")),
    db: AsyncSession = Depends(get_db),
):
    return await _replace_role_permissions(role_id, body.get("permission_ids", []), tenant, db)

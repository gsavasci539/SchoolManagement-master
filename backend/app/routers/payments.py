from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.application.schemas import PaymentCreate, PaymentUpdate, PaymentResponse
from app.repositories import PaymentRepository
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_permission
from app.core.responses import success_response
from app.domain.entities.user import User

router = APIRouter(prefix="/api/payments", tags=["Payments"])


@router.post("", response_model=PaymentResponse)
@require_permission("payments.create")
async def create_payment(
    payment: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = PaymentRepository()
    payment_data = payment.model_dump()
    payment_data["created_by"] = current_user.id
    payment_data["organization_id"] = current_user.organization_id
    
    # TODO: Update debt remaining amount
    # TODO: Create receipt
    
    db_payment = await repo.create(db, payment_data)
    return success_response(db_payment, "Ödeme oluşturuldu")


@router.get("", response_model=list[PaymentResponse])
@require_permission("payments.view")
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    student_id: Optional[UUID] = None,
    debt_id: Optional[UUID] = None,
    payment_method: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = PaymentRepository()
    
    filters = {"organization_id": current_user.organization_id}
    if student_id:
        filters["student_id"] = student_id
    if debt_id:
        filters["debt_id"] = debt_id
    if payment_method:
        filters["payment_method"] = payment_method
    
    payments = await repo.get_multi(db, skip, limit, filters)
    return success_response(payments)


@router.get("/{payment_id}", response_model=PaymentResponse)
@require_permission("payments.view")
async def get_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = PaymentRepository()
    payment = await repo.get(db, payment_id)
    
    if not payment or payment.organization_id != current_user.organization_id:
        return success_response(None, "Ödeme bulunamadı", success=False)
    
    return success_response(payment)


@router.put("/{payment_id}", response_model=PaymentResponse)
@require_permission("payments.update")
async def update_payment(
    payment_id: UUID,
    payment: PaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = PaymentRepository()
    db_payment = await repo.get(db, payment_id)
    
    if not db_payment or db_payment.organization_id != current_user.organization_id:
        return success_response(None, "Ödeme bulunamadı", success=False)
    
    payment_data = payment.model_dump(exclude_unset=True)
    payment_data["updated_by"] = current_user.id
    
    updated_payment = await repo.update(db, db_payment, payment_data)
    return success_response(updated_payment, "Ödeme güncellendi")


@router.delete("/{payment_id}")
@require_permission("payments.delete")
async def delete_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = PaymentRepository()
    db_payment = await repo.get(db, payment_id)
    
    if not db_payment or db_payment.organization_id != current_user.organization_id:
        return success_response(None, "Ödeme bulunamadı", success=False)
    
    # TODO: Reverse payment, update debt, delete receipt
    
    await repo.soft_delete(db, payment_id)
    return success_response(message="Ödeme silindi")

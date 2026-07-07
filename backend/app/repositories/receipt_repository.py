from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.receipt import Receipt
from app.repositories.base_repository import BaseRepository


class ReceiptRepository(BaseRepository[Receipt]):
    async def get_by_receipt_number(
        self, db: AsyncSession, receipt_number: str
    ) -> Optional[Receipt]:
        result = await db.execute(
            select(Receipt).where(Receipt.receipt_number == receipt_number)
        )
        return result.scalar_one_or_none()

    async def get_by_payment(
        self, db: AsyncSession, payment_id: UUID
    ) -> Optional[Receipt]:
        result = await db.execute(
            select(Receipt).where(Receipt.payment_id == payment_id)
        )
        return result.scalar_one_or_none()

    async def get_by_student(
        self, db: AsyncSession, student_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Receipt]:
        result = await db.execute(
            select(Receipt)
            .where(Receipt.student_id == student_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_organization(
        self, db: AsyncSession, organization_id: UUID, skip: int = 0, limit: int = 100
    ) -> List[Receipt]:
        result = await db.execute(
            select(Receipt)
            .where(Receipt.organization_id == organization_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_date_range(
        self,
        db: AsyncSession,
        organization_id: UUID,
        start_date: datetime,
        end_date: datetime
    ) -> List[Receipt]:
        result = await db.execute(
            select(Receipt).where(
                and_(
                    Receipt.organization_id == organization_id,
                    Receipt.payment_date >= start_date,
                    Receipt.payment_date <= end_date
                )
            )
        )
        return result.scalars().all()

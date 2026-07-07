from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from datetime import datetime, date

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_permission
from app.core.responses import success_response
from app.domain.entities.user import User
from app.infrastructure.reports import ReportService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/overview")
@require_permission("dashboard.view")
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard overview statistics"""
    
    from app.repositories import (
        StudentRepository,
        ClassRepository,
        DebtRepository,
        PaymentRepository,
        AttendanceRepository
    )
    
    student_repo = StudentRepository()
    class_repo = ClassRepository()
    debt_repo = DebtRepository()
    payment_repo = PaymentRepository()
    attendance_repo = AttendanceRepository()
    
    # Get counts
    total_students = await student_repo.count(db, {"organization_id": current_user.organization_id})
    total_classes = await class_repo.count(db, {"organization_id": current_user.organization_id})
    
    # Get financial summary
    debts = await debt_repo.get_by_organization(db, current_user.organization_id)
    total_debt = sum(d.remaining_amount for d in debts if d.remaining_amount > 0)
    
    payments = await payment_repo.get_by_organization(db, current_user.organization_id)
    total_payments = sum(p.amount for p in payments if p.status == "completed")
    
    # Get today's attendance
    today = datetime.utcnow().date()
    today_attendance = []
    for cls in await class_repo.get_active_classes(db, current_user.organization_id):
        class_attendance = await attendance_repo.get_by_class_and_date(
            db, cls.id, datetime(today.year, today.month, today.day)
        )
        today_attendance.extend(class_attendance)
    
    present_today = len([a for a in today_attendance if a.status == "present"])
    absent_today = len([a for a in today_attendance if a.status == "absent"])
    
    return success_response({
        "total_students": total_students,
        "total_classes": total_classes,
        "total_debt": float(total_debt),
        "total_payments": float(total_payments),
        "present_today": present_today,
        "absent_today": absent_today,
        "attendance_rate": round(present_today / (present_today + absent_today) * 100, 1) if (present_today + absent_today) > 0 else 0
    })


@router.get("/recent-activity")
@require_permission("dashboard.view")
async def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recent activity"""
    
    from sqlalchemy import select, desc
    from app.domain.entities.audit_log import AuditLog
    
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.organization_id == current_user.organization_id)
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )
    activities = result.scalars().all()
    
    return success_response(activities)


@router.get("/upcoming-events")
@require_permission("dashboard.view")
async def get_upcoming_events(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get upcoming events (announcements, payment due dates, etc.)"""
    
    from sqlalchemy import select, and_
    from app.domain.entities.announcement import Announcement
    from app.domain.entities.debt import Debt
    
    # Get upcoming announcements
    result = await db.execute(
        select(Announcement)
        .where(
            and_(
                Announcement.organization_id == current_user.organization_id,
                Announcement.status == "scheduled",
                Announcement.scheduled_for >= datetime.utcnow()
            )
        )
        .order_by(Announcement.scheduled_for)
        .limit(limit)
    )
    announcements = result.scalars().all()
    
    # Get overdue debts
    result = await db.execute(
        select(Debt)
        .where(
            and_(
                Debt.organization_id == current_user.organization_id,
                Debt.due_date >= datetime.utcnow(),
                Debt.remaining_amount > 0
            )
        )
        .order_by(Debt.due_date)
        .limit(limit)
    )
    upcoming_payments = result.scalars().all()
    
    return success_response({
        "announcements": announcements,
        "upcoming_payments": upcoming_payments
    })


@router.get("/financial-summary")
@require_permission("dashboard.financial")
async def get_financial_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get financial summary for dashboard"""
    
    report_service = ReportService(db)
    report = await report_service.get_financial_report(
        current_user.organization_id,
        None,
        start_date,
        end_date
    )
    
    return success_response(report)


@router.get("/attendance-summary")
@require_permission("dashboard.attendance")
async def get_attendance_summary(
    class_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance summary for dashboard"""
    
    report_service = ReportService(db)
    report = await report_service.get_attendance_report(
        current_user.organization_id,
        class_id,
        start_date,
        end_date
    )
    
    return success_response(report)

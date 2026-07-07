from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.application.schemas import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from app.repositories import AttendanceRepository
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_permission
from app.core.responses import success_response
from app.domain.entities.user import User

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("", response_model=AttendanceResponse)
@require_permission("attendance.create")
async def create_attendance(
    attendance: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AttendanceRepository()
    attendance_data = attendance.model_dump()
    attendance_data["created_by"] = current_user.id
    attendance_data["organization_id"] = current_user.organization_id
    
    # Check if attendance already exists for this student on this date
    existing = await repo.get_by_student_and_date(db, attendance.student_id, attendance.date)
    if existing:
        return success_response(None, "Bu öğrenci için bu tarihte zaten yoklama var", success=False)
    
    db_attendance = await repo.create(db, attendance_data)
    return success_response(db_attendance, "Yoklama oluşturuldu")


@router.get("", response_model=list[AttendanceResponse])
@require_permission("attendance.view")
async def list_attendance(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    class_id: Optional[UUID] = None,
    student_id: Optional[UUID] = None,
    date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AttendanceRepository()
    
    if class_id and date:
        attendance = await repo.get_by_class_and_date(db, class_id, date)
    elif student_id and date:
        attendance = await repo.get_by_student_and_date(db, student_id, date)
    else:
        attendance = await repo.get_multi(db, skip, limit, {"organization_id": current_user.organization_id})
    
    return success_response(attendance)


@router.get("/{attendance_id}", response_model=AttendanceResponse)
@require_permission("attendance.view")
async def get_attendance(
    attendance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AttendanceRepository()
    attendance = await repo.get(db, attendance_id)
    
    if not attendance or attendance.organization_id != current_user.organization_id:
        return success_response(None, "Yoklama bulunamadı", success=False)
    
    return success_response(attendance)


@router.put("/{attendance_id}", response_model=AttendanceResponse)
@require_permission("attendance.update")
async def update_attendance(
    attendance_id: UUID,
    attendance: AttendanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AttendanceRepository()
    db_attendance = await repo.get(db, attendance_id)
    
    if not db_attendance or db_attendance.organization_id != current_user.organization_id:
        return success_response(None, "Yoklama bulunamadı", success=False)
    
    attendance_data = attendance.model_dump(exclude_unset=True)
    attendance_data["updated_by"] = current_user.id
    
    updated_attendance = await repo.update(db, db_attendance, attendance_data)
    return success_response(updated_attendance, "Yoklama güncellendi")


@router.delete("/{attendance_id}")
@require_permission("attendance.delete")
async def delete_attendance(
    attendance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AttendanceRepository()
    db_attendance = await repo.get(db, attendance_id)
    
    if not db_attendance or db_attendance.organization_id != current_user.organization_id:
        return success_response(None, "Yoklama bulunamadı", success=False)
    
    await repo.delete(db, attendance_id)
    return success_response(message="Yoklama silindi")

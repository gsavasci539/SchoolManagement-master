from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.application.schemas import StudentCreate, StudentUpdate, StudentResponse
from app.repositories import StudentRepository
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_permission
from app.core.responses import success_response
from app.domain.entities.user import User

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.post("", response_model=StudentResponse)
@require_permission("students.create")
async def create_student(
    student: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = StudentRepository()
    student_data = student.model_dump(exclude={"parent_ids"})
    student_data["created_by"] = current_user.id
    student_data["organization_id"] = current_user.organization_id
    
    db_student = await repo.create(db, student_data)
    
    # TODO: Handle parent relationships
    
    return success_response(db_student, "Öğrenci oluşturuldu")


@router.get("", response_model=list[StudentResponse])
@require_permission("students.view")
async def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    branch_id: Optional[UUID] = None,
    class_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = StudentRepository()
    
    filters = {"organization_id": current_user.organization_id}
    if branch_id:
        filters["branch_id"] = branch_id
    if class_id:
        filters["class_id"] = class_id
    
    if search:
        students = await repo.search_students(
            db, current_user.organization_id, search, skip, limit
        )
    else:
        students = await repo.get_multi(db, skip, limit, filters)
    
    return success_response(students)


@router.get("/{student_id}", response_model=StudentResponse)
@require_permission("students.view")
async def get_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = StudentRepository()
    student = await repo.get(db, student_id)
    
    if not student or student.organization_id != current_user.organization_id:
        return success_response(None, "Öğrenci bulunamadı", success=False)
    
    return success_response(student)


@router.put("/{student_id}", response_model=StudentResponse)
@require_permission("students.update")
async def update_student(
    student_id: UUID,
    student: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = StudentRepository()
    db_student = await repo.get(db, student_id)
    
    if not db_student or db_student.organization_id != current_user.organization_id:
        return success_response(None, "Öğrenci bulunamadı", success=False)
    
    student_data = student.model_dump(exclude_unset=True, exclude={"parent_ids"})
    student_data["updated_by"] = current_user.id
    
    updated_student = await repo.update(db, db_student, student_data)
    
    # TODO: Handle parent relationships if provided
    
    return success_response(updated_student, "Öğrenci güncellendi")


@router.delete("/{student_id}")
@require_permission("students.delete")
async def delete_student(
    student_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = StudentRepository()
    db_student = await repo.get(db, student_id)
    
    if not db_student or db_student.organization_id != current_user.organization_id:
        return success_response(None, "Öğrenci bulunamadı", success=False)
    
    await repo.soft_delete(db, student_id)
    
    return success_response(message="Öğrenci silindi")

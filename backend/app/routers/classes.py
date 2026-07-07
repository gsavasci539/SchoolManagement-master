from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.application.schemas import ClassCreate, ClassUpdate, ClassResponse
from app.repositories import ClassRepository
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_permission
from app.core.responses import success_response
from app.domain.entities.user import User

router = APIRouter(prefix="/api/classes", tags=["Classes"])


@router.post("", response_model=ClassResponse)
@require_permission("classes.create")
async def create_class(
    class_data: ClassCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ClassRepository()
    class_dict = class_data.model_dump()
    class_dict["created_by"] = current_user.id
    class_dict["organization_id"] = current_user.organization_id
    
    db_class = await repo.create(db, class_dict)
    return success_response(db_class, "Sınıf oluşturuldu")


@router.get("", response_model=list[ClassResponse])
@require_permission("classes.view")
async def list_classes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    branch_id: Optional[UUID] = None,
    teacher_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ClassRepository()
    
    if branch_id:
        classes = await repo.get_by_branch(db, branch_id, skip, limit)
    elif teacher_id:
        classes = await repo.get_by_teacher(db, teacher_id, skip, limit)
    else:
        classes = await repo.get_by_organization(db, current_user.organization_id, skip, limit)
    
    return success_response(classes)


@router.get("/{class_id}", response_model=ClassResponse)
@require_permission("classes.view")
async def get_class(
    class_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ClassRepository()
    db_class = await repo.get(db, class_id)
    
    if not db_class or db_class.organization_id != current_user.organization_id:
        return success_response(None, "Sınıf bulunamadı", success=False)
    
    return success_response(db_class)


@router.put("/{class_id}", response_model=ClassResponse)
@require_permission("classes.update")
async def update_class(
    class_id: UUID,
    class_data: ClassUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ClassRepository()
    db_class = await repo.get(db, class_id)
    
    if not db_class or db_class.organization_id != current_user.organization_id:
        return success_response(None, "Sınıf bulunamadı", success=False)
    
    class_dict = class_data.model_dump(exclude_unset=True)
    class_dict["updated_by"] = current_user.id
    
    updated_class = await repo.update(db, db_class, class_dict)
    return success_response(updated_class, "Sınıf güncellendi")


@router.delete("/{class_id}")
@require_permission("classes.delete")
async def delete_class(
    class_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ClassRepository()
    db_class = await repo.get(db, class_id)
    
    if not db_class or db_class.organization_id != current_user.organization_id:
        return success_response(None, "Sınıf bulunamadı", success=False)
    
    await repo.soft_delete(db, class_id)
    return success_response(message="Sınıf silindi")

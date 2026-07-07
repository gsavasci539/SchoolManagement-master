from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.application.schemas import ParentCreate, ParentUpdate, ParentResponse
from app.repositories import ParentRepository
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_permission
from app.core.responses import success_response
from app.domain.entities.user import User

router = APIRouter(prefix="/api/parents", tags=["Parents"])


@router.post("", response_model=ParentResponse)
@require_permission("parents.create")
async def create_parent(
    parent: ParentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ParentRepository()
    parent_data = parent.model_dump()
    parent_data["created_by"] = current_user.id
    parent_data["organization_id"] = current_user.organization_id
    
    db_parent = await repo.create(db, parent_data)
    return success_response(db_parent, "Veli oluşturuldu")


@router.get("", response_model=list[ParentResponse])
@require_permission("parents.view")
async def list_parents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ParentRepository()
    
    if search:
        parents = await repo.search_parents(db, current_user.organization_id, search, skip, limit)
    else:
        parents = await repo.get_by_organization(db, current_user.organization_id, skip, limit)
    
    return success_response(parents)


@router.get("/{parent_id}", response_model=ParentResponse)
@require_permission("parents.view")
async def get_parent(
    parent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ParentRepository()
    parent = await repo.get(db, parent_id)
    
    if not parent or parent.organization_id != current_user.organization_id:
        return success_response(None, "Veli bulunamadı", success=False)
    
    return success_response(parent)


@router.put("/{parent_id}", response_model=ParentResponse)
@require_permission("parents.update")
async def update_parent(
    parent_id: UUID,
    parent: ParentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ParentRepository()
    db_parent = await repo.get(db, parent_id)
    
    if not db_parent or db_parent.organization_id != current_user.organization_id:
        return success_response(None, "Veli bulunamadı", success=False)
    
    parent_data = parent.model_dump(exclude_unset=True)
    parent_data["updated_by"] = current_user.id
    
    updated_parent = await repo.update(db, db_parent, parent_data)
    return success_response(updated_parent, "Veli güncellendi")


@router.delete("/{parent_id}")
@require_permission("parents.delete")
async def delete_parent(
    parent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = ParentRepository()
    db_parent = await repo.get(db, parent_id)
    
    if not db_parent or db_parent.organization_id != current_user.organization_id:
        return success_response(None, "Veli bulunamadı", success=False)
    
    await repo.soft_delete(db, parent_id)
    return success_response(message="Veli silindi")

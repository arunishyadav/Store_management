import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole, ActivityLog, ActionType, Location
from app.schemas.user import UserCreate, UserUpdate, UserResponse, ResetPasswordRequest
from app.services.auth_service import hash_password
from app.middleware.auth import require_super_admin, get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


async def _log(db, user, actor, action, details=None, request=None):
    ip = request.client.host if request and request.client else None
    device = request.headers.get("User-Agent", "")[:500] if request else None
    log = ActivityLog(
        user_id=actor.id, user_name=actor.full_name, user_role=actor.role.value,
        action=action, details=details or {}, device_info=device, ip_address=ip,
    )
    db.add(log)


@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await db.execute(select(User).order_by(User.full_name))
    return result.scalars().all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    # Check user_id uniqueness
    existing = await db.execute(select(User).where(User.user_id == payload.user_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"User ID '{payload.user_id}' already exists")

    # Validate location for non-super-admin
    location_id = None
    if payload.role != UserRole.super_admin:
        if not payload.assigned_location_id:
            raise HTTPException(status_code=400, detail="Location is required for site_admin and user roles")
        loc = await db.execute(select(Location).where(Location.id == uuid.UUID(payload.assigned_location_id)))
        if not loc.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Location not found")
        location_id = uuid.UUID(payload.assigned_location_id)

    user = User(
        user_id=payload.user_id,
        full_name=payload.full_name,
        role=payload.role,
        assigned_location_id=location_id,
        hashed_password=hash_password(payload.password),
        created_by=current_user.user_id,
    )
    db.add(user)
    await db.flush()
    await _log(db, user, current_user, ActionType.user_create, {"new_user_id": payload.user_id}, request)
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/{user_uuid}", response_model=UserResponse)
async def get_user(
    user_uuid: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_uuid}", response_model=UserResponse)
async def update_user(
    user_uuid: uuid.UUID,
    payload: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.assigned_location_id is not None:
        user.assigned_location_id = uuid.UUID(payload.assigned_location_id)

    await _log(db, user, current_user, ActionType.user_update, {"user_id": user.user_id}, request)
    return user


@router.delete("/{user_uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_uuid: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.super_admin:
        raise HTTPException(status_code=400, detail="Cannot delete the Super Admin")

    await _log(db, user, current_user, ActionType.user_delete, {"deleted_user_id": user.user_id}, request)
    await db.delete(user)


@router.post("/{user_uuid}/reset-password")
async def reset_password(
    user_uuid: uuid.UUID,
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    await _log(db, user, current_user, ActionType.password_reset, {"target_user_id": user.user_id}, request)
    return {"message": "Password reset successfully"}

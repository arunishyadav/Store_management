from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole, ActivityLog, ActionType
from app.schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest, RefreshRequest
from app.services.auth_service import verify_password, hash_password, create_access_token, create_refresh_token, decode_token
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def _log_activity(db: AsyncSession, user: User, action: ActionType, details: dict = None, request: Request = None):
    ip = None
    device = None
    if request:
        ip = request.client.host if request.client else None
        device = request.headers.get("User-Agent", "")[:500]

    log = ActivityLog(
        user_id=user.id,
        user_name=user.full_name,
        user_role=user.role.value,
        location_id=user.assigned_location_id,
        location_name=user.assigned_location.name if user.assigned_location else None,
        action=action,
        details=details or {},
        device_info=device,
        ip_address=ip,
    )
    db.add(log)
    await db.flush()


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.user_id == payload.user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID or password",
        )

    token_data = {"sub": str(user.id), "role": user.role.value, "user_id": user.user_id}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    await _log_activity(db, user, ActionType.login, {"user_id": user.user_id}, request)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user_id=user.user_id,
        full_name=user.full_name,
        role=user.role.value,
        assigned_location_id=str(user.assigned_location_id) if user.assigned_location_id else None,
        assigned_location_name=user.assigned_location.name if user.assigned_location else None,
    )


@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _log_activity(db, current_user, ActionType.logout, {}, request)
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    token_payload = decode_token(payload.refresh_token)
    if not token_payload or token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    import uuid as _uuid
    user_uuid = _uuid.UUID(token_payload["sub"])
    result = await db.execute(select(User).where(User.id == user_uuid, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    token_data = {"sub": str(user.id), "role": user.role.value, "user_id": user.user_id}
    access_token = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        token_type="bearer",
        user_id=user.user_id,
        full_name=user.full_name,
        role=user.role.value,
        assigned_location_id=str(user.assigned_location_id) if user.assigned_location_id else None,
        assigned_location_name=user.assigned_location.name if user.assigned_location else None,
    )


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    await _log_activity(db, current_user, ActionType.password_reset, {}, request)
    return {"message": "Password changed successfully"}

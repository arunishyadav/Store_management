import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, UserRole, Location, ActivityLog, ActionType
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse
from app.middleware.auth import get_current_user, require_super_admin

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("/", response_model=list[LocationResponse])
async def list_locations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.super_admin:
        result = await db.execute(select(Location).where(Location.is_active == True).order_by(Location.name))
    else:
        result = await db.execute(
            select(Location).where(
                Location.id == current_user.assigned_location_id,
                Location.is_active == True,
            )
        )
    return result.scalars().all()


@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    payload: LocationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    existing = await db.execute(select(Location).where(Location.code == payload.code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Location code '{payload.code}' already exists")

    location = Location(
        name=payload.name,
        code=payload.code.upper(),
        address=payload.address,
    )
    db.add(location)
    await db.flush()

    log = ActivityLog(
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role.value,
        action=ActionType.location_create, details={"location_name": payload.name},
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    return location


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if current_user.role != UserRole.super_admin and str(current_user.assigned_location_id) != str(location_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return loc


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: uuid.UUID,
    payload: LocationUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if payload.name is not None:
        loc.name = payload.name
    if payload.address is not None:
        loc.address = payload.address
    if payload.is_active is not None:
        loc.is_active = payload.is_active

    log = ActivityLog(
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role.value,
        action=ActionType.location_update, details={"location_id": str(location_id)},
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    return loc


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    loc.is_active = False  # Soft delete
    log = ActivityLog(
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role.value,
        action=ActionType.location_delete, details={"location_name": loc.name},
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)

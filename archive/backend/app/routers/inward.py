import uuid
from datetime import date, time, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Material, Inward, ActivityLog, ActionType
from app.schemas.inward import InwardCreate, InwardResponse
from app.services.stock_service import get_current_stock
from app.middleware.auth import get_current_user, require_site_admin_or_above, check_location_access
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/inward", tags=["Material Inward"])


@router.get("/", response_model=list[InwardResponse])
async def list_inwards(
    location_id: uuid.UUID = Query(...),
    material_id: uuid.UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_location_access(current_user, location_id)
    query = select(Inward).where(Inward.location_id == location_id)
    if material_id:
        query = query.where(Inward.material_id == material_id)
    if date_from:
        query = query.where(Inward.entry_date >= date_from)
    if date_to:
        query = query.where(Inward.entry_date <= date_to)
    query = query.order_by(Inward.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=InwardResponse, status_code=status.HTTP_201_CREATED)
async def create_inward(
    payload: InwardCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_site_admin_or_above),
):
    check_location_access(current_user, payload.location_id)

    # Verify material exists at this location
    mat_result = await db.execute(
        select(Material).where(Material.id == payload.material_id, Material.location_id == payload.location_id, Material.is_active == True)
    )
    material = mat_result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found at this location")

    now = datetime.now()
    inward = Inward(
        material_id=payload.material_id,
        location_id=payload.location_id,
        quantity=payload.quantity,
        supplier_name=payload.supplier_name,
        vehicle_number=payload.vehicle_number,
        invoice_number=payload.invoice_number,
        purchase_order_number=payload.purchase_order_number,
        entry_date=payload.entry_date or now.date(),
        entry_time=payload.entry_time or now.time(),
        added_by=current_user.user_id,
        remarks=payload.remarks,
    )
    db.add(inward)
    await db.flush()

    # Calculate new stock
    new_stock = await get_current_stock(db, payload.material_id, payload.location_id)

    # Activity log
    log = ActivityLog(
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role.value,
        location_id=payload.location_id, action=ActionType.material_inward,
        details={"material_name": material.name, "quantity": payload.quantity, "unit": material.unit, "new_stock": new_stock},
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    await db.flush()

    # Broadcast via WebSocket
    await ws_manager.broadcast_to_location(str(payload.location_id), {
        "event": "stock_update",
        "material_id": str(payload.material_id),
        "material_name": material.name,
        "current_stock": new_stock,
        "unit": material.unit,
        "action": "inward",
        "quantity": payload.quantity,
    })

    return inward


@router.get("/{inward_id}", response_model=InwardResponse)
async def get_inward(
    inward_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Inward).where(Inward.id == inward_id))
    inward = result.scalar_one_or_none()
    if not inward:
        raise HTTPException(status_code=404, detail="Inward record not found")
    check_location_access(current_user, inward.location_id)
    return inward

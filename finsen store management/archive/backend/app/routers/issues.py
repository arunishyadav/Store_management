import uuid
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, Material, Issue, ActivityLog, ActionType
from app.schemas.issue import IssueCreate, IssueResponse
from app.services.stock_service import get_current_stock, get_stock_status
from app.middleware.auth import get_current_user, require_site_admin_or_above, check_location_access
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/issues", tags=["Material Issue"])


@router.get("/", response_model=list[IssueResponse])
async def list_issues(
    location_id: uuid.UUID = Query(...),
    material_id: uuid.UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    contractor: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_location_access(current_user, location_id)
    query = select(Issue).where(Issue.location_id == location_id)
    if material_id:
        query = query.where(Issue.material_id == material_id)
    if date_from:
        query = query.where(Issue.entry_date >= date_from)
    if date_to:
        query = query.where(Issue.entry_date <= date_to)
    if contractor:
        query = query.where(Issue.contractor_name.ilike(f"%{contractor}%"))
    query = query.order_by(Issue.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    payload: IssueCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_site_admin_or_above),
):
    check_location_access(current_user, payload.location_id)

    # Verify material exists
    mat_result = await db.execute(
        select(Material).where(
            Material.id == payload.material_id,
            Material.location_id == payload.location_id,
            Material.is_active == True,
        )
    )
    material = mat_result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found at this location")

    # Check sufficient stock
    current_stock = await get_current_stock(db, payload.material_id, payload.location_id)
    if payload.quantity > current_stock:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {current_stock} {material.unit}, Requested: {payload.quantity} {material.unit}",
        )

    now = datetime.now()
    issue = Issue(
        material_id=payload.material_id,
        location_id=payload.location_id,
        quantity=payload.quantity,
        issued_to=payload.issued_to,
        contractor_name=payload.contractor_name,
        supervisor_name=payload.supervisor_name,
        employee_name=payload.employee_name,
        department=payload.department,
        entry_date=payload.entry_date or now.date(),
        entry_time=payload.entry_time or now.time(),
        issued_by=current_user.user_id,
        remarks=payload.remarks,
    )
    db.add(issue)
    await db.flush()

    new_stock = current_stock - payload.quantity

    log = ActivityLog(
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role.value,
        location_id=payload.location_id, action=ActionType.material_issue,
        details={
            "material_name": material.name, "quantity": payload.quantity,
            "unit": material.unit, "new_stock": new_stock,
            "issued_to": payload.issued_to or "", "contractor": payload.contractor_name or "",
        },
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    await db.flush()

    # Broadcast real-time update
    await ws_manager.broadcast_to_location(str(payload.location_id), {
        "event": "stock_update",
        "material_id": str(payload.material_id),
        "material_name": material.name,
        "current_stock": new_stock,
        "unit": material.unit,
        "action": "issue",
        "quantity": payload.quantity,
        "status": get_stock_status(new_stock, material.minimum_quantity),
    })

    return issue


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue record not found")
    check_location_access(current_user, issue.location_id)
    return issue

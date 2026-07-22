import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models import User, UserRole, Material, Location, ActivityLog, ActionType
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse, MaterialWithStock
from app.services.stock_service import get_current_stock, get_stock_status
from app.middleware.auth import get_current_user, require_site_admin_or_above, check_location_access

router = APIRouter(prefix="/materials", tags=["Materials"])


@router.get("/search", response_model=list[dict])
async def global_search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Global search across all locations (Super Admin only)."""
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Global search requires Super Admin access")

    result = await db.execute(
        select(Material).where(
            Material.is_active == True,
            or_(
                Material.name.ilike(f"%{q}%"),
                Material.material_code.ilike(f"%{q}%"),
                Material.category.ilike(f"%{q}%"),
            )
        ).order_by(Material.name)
    )
    materials = result.scalars().all()

    search_results = []
    for mat in materials:
        stock = await get_current_stock(db, mat.id, mat.location_id)
        search_results.append({
            "material_id": str(mat.id),
            "material_code": mat.material_code,
            "name": mat.name,
            "category": mat.category,
            "unit": mat.unit,
            "location_id": str(mat.location_id),
            "location_name": mat.location.name if mat.location else "",
            "current_stock": stock,
            "status": get_stock_status(stock, mat.minimum_quantity),
        })
    return search_results


@router.get("/", response_model=list[MaterialWithStock])
async def list_materials(
    location_id: uuid.UUID = Query(...),
    category: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_location_access(current_user, location_id)

    query = select(Material).where(Material.location_id == location_id, Material.is_active == True)
    if category:
        query = query.where(Material.category == category)
    query = query.order_by(Material.name)

    result = await db.execute(query)
    materials = result.scalars().all()

    enriched = []
    for mat in materials:
        stock = await get_current_stock(db, mat.id, mat.location_id)
        enriched.append(MaterialWithStock(
            id=mat.id, material_code=mat.material_code, name=mat.name, category=mat.category,
            size=mat.size, brand=mat.brand, unit=mat.unit, description=mat.description,
            minimum_quantity=mat.minimum_quantity, location_id=mat.location_id,
            location_name=mat.location.name if mat.location else "",
            is_active=mat.is_active, created_at=mat.created_at, updated_at=mat.updated_at,
            created_by=mat.created_by, current_stock=stock,
            status=get_stock_status(stock, mat.minimum_quantity),
        ))
    return enriched


@router.post("/", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    payload: MaterialCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_site_admin_or_above),
):
    check_location_access(current_user, payload.location_id)

    # Verify location exists
    loc = await db.execute(select(Location).where(Location.id == payload.location_id))
    if not loc.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Location not found")

    material = Material(
        material_code=payload.material_code,
        name=payload.name,
        category=payload.category,
        size=payload.size,
        brand=payload.brand,
        unit=payload.unit,
        description=payload.description,
        minimum_quantity=payload.minimum_quantity,
        location_id=payload.location_id,
        created_by=current_user.user_id,
    )
    db.add(material)
    await db.flush()

    log = ActivityLog(
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role.value,
        location_id=payload.location_id, action=ActionType.material_add,
        details={"material_name": payload.name, "material_code": payload.material_code},
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    return material


@router.get("/{material_id}", response_model=MaterialWithStock)
async def get_material(
    material_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Material).where(Material.id == material_id, Material.is_active == True))
    mat = result.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    check_location_access(current_user, mat.location_id)

    stock = await get_current_stock(db, mat.id, mat.location_id)
    return MaterialWithStock(
        id=mat.id, material_code=mat.material_code, name=mat.name, category=mat.category,
        size=mat.size, brand=mat.brand, unit=mat.unit, description=mat.description,
        minimum_quantity=mat.minimum_quantity, location_id=mat.location_id,
        location_name=mat.location.name if mat.location else "",
        is_active=mat.is_active, created_at=mat.created_at, updated_at=mat.updated_at,
        created_by=mat.created_by, current_stock=stock,
        status=get_stock_status(stock, mat.minimum_quantity),
    )


@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: uuid.UUID,
    payload: MaterialUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_site_admin_or_above),
):
    result = await db.execute(select(Material).where(Material.id == material_id))
    mat = result.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    check_location_access(current_user, mat.location_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(mat, field, value)

    log = ActivityLog(
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role.value,
        location_id=mat.location_id, action=ActionType.material_update,
        details={"material_id": str(material_id), "material_name": mat.name},
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    return mat


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_site_admin_or_above),
):
    result = await db.execute(select(Material).where(Material.id == material_id))
    mat = result.scalar_one_or_none()
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    check_location_access(current_user, mat.location_id)
    mat.is_active = False

    log = ActivityLog(
        user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role.value,
        location_id=mat.location_id, action=ActionType.material_delete,
        details={"material_name": mat.name},
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)

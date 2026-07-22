import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import Inward, Issue, Transfer, Material


async def get_current_stock(db: AsyncSession, material_id: uuid.UUID, location_id: uuid.UUID) -> float:
    """
    current_stock = total_inward + transfers_in - total_issued - transfers_out
    """
    # Total inward
    inward_result = await db.execute(
        select(func.coalesce(func.sum(Inward.quantity), 0.0)).where(
            Inward.material_id == material_id,
            Inward.location_id == location_id,
        )
    )
    total_inward = float(inward_result.scalar())

    # Total issued
    issue_result = await db.execute(
        select(func.coalesce(func.sum(Issue.quantity), 0.0)).where(
            Issue.material_id == material_id,
            Issue.location_id == location_id,
        )
    )
    total_issued = float(issue_result.scalar())

    # Total transferred out
    transfer_out_result = await db.execute(
        select(func.coalesce(func.sum(Transfer.quantity), 0.0)).where(
            Transfer.material_id == material_id,
            Transfer.from_location_id == location_id,
        )
    )
    total_transfer_out = float(transfer_out_result.scalar())

    # Total transferred in
    transfer_in_result = await db.execute(
        select(func.coalesce(func.sum(Transfer.quantity), 0.0)).where(
            Transfer.material_id == material_id,
            Transfer.to_location_id == location_id,
        )
    )
    total_transfer_in = float(transfer_in_result.scalar())

    return total_inward + total_transfer_in - total_issued - total_transfer_out


def get_stock_status(current_stock: float, minimum_quantity: float) -> str:
    if current_stock <= 0:
        return "out_of_stock"
    elif current_stock <= minimum_quantity:
        return "low_stock"
    return "in_stock"


async def get_stock_with_status(db: AsyncSession, material: Material) -> dict:
    current_stock = await get_current_stock(db, material.id, material.location_id)
    status = get_stock_status(current_stock, material.minimum_quantity)
    return {
        "current_stock": current_stock,
        "status": status,
        "minimum_quantity": material.minimum_quantity,
        "unit": material.unit,
    }

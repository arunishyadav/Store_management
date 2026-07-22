from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date, time
import uuid

class InwardBase(BaseModel):
    material_id: uuid.UUID
    location_id: uuid.UUID
    quantity: float
    supplier_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    invoice_number: Optional[str] = None
    purchase_order_number: Optional[str] = None
    entry_date: Optional[date] = None
    entry_time: Optional[time] = None
    remarks: Optional[str] = None

class InwardCreate(InwardBase):
    pass

class InwardResponse(InwardBase):
    id: uuid.UUID
    added_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class MaterialBase(BaseModel):
    material_code: str
    name: str
    category: str
    size: Optional[str] = None
    brand: Optional[str] = None
    unit: str
    description: Optional[str] = None
    minimum_quantity: float = 0.0
    location_id: uuid.UUID
    is_active: bool = True

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    size: Optional[str] = None
    brand: Optional[str] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    minimum_quantity: Optional[float] = None
    is_active: Optional[bool] = None

class MaterialResponse(MaterialBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class MaterialWithStock(MaterialResponse):
    location_name: str
    current_stock: float
    status: str

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
import uuid

class LocationBase(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    is_active: bool = True

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class LocationResponse(LocationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

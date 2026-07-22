from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date, time
import uuid

class IssueBase(BaseModel):
    material_id: uuid.UUID
    location_id: uuid.UUID
    quantity: float
    issued_to: Optional[str] = None
    contractor_name: Optional[str] = None
    supervisor_name: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    entry_date: Optional[date] = None
    entry_time: Optional[time] = None
    remarks: Optional[str] = None

class IssueCreate(IssueBase):
    pass

class IssueResponse(IssueBase):
    id: uuid.UUID
    issued_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

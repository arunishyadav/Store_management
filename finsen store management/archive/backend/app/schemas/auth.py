from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    user_id: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: str
    full_name: str
    role: str
    assigned_location_id: Optional[str]
    assigned_location_name: Optional[str]

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

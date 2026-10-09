from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from app.models.users import RoleEnum

class UserBase(BaseModel):
    email: str
    role: RoleEnum
    is_active: bool

class UserResponse(UserBase):
    id: UUID
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict, field_validator
from uuid import UUID
from datetime import datetime
from app.models.branches import BranchStatus
import re

class BranchBase(BaseModel):
    name: str
    code: str
    city: str
    address: str
    contact_number: str
    status: BranchStatus = BranchStatus.active
    seat_capacity_default: int | None = None

    @field_validator('code')
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.upper()
        
    @field_validator('contact_number')
    @classmethod
    def validate_contact(cls, v: str) -> str:
        if not re.match(r'^\+?[0-9\-\s]+$', v):
            raise ValueError('Invalid contact number format')
        return v

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    city: str | None = None
    address: str | None = None
    contact_number: str | None = None
    status: BranchStatus | None = None
    seat_capacity_default: int | None = None

    @field_validator('code')
    @classmethod
    def uppercase_code(cls, v: str | None) -> str | None:
        return v.upper() if v else None
        
    @field_validator('contact_number')
    @classmethod
    def validate_contact(cls, v: str | None) -> str | None:
        if v and not re.match(r'^\+?[0-9\-\s]+$', v):
            raise ValueError('Invalid contact number format')
        return v

class BranchResponse(BranchBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID
from datetime import datetime
from app.models.courses import CourseStatus

class CourseBase(BaseModel):
    code: str
    title: str
    credit_hours: int = Field(ge=1, le=6)
    department: str
    status: CourseStatus = CourseStatus.active

    @field_validator('code')
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.upper()

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    code: str | None = None
    title: str | None = None
    credit_hours: int | None = Field(default=None, ge=1, le=6)
    department: str | None = None
    status: CourseStatus | None = None

    @field_validator('code')
    @classmethod
    def uppercase_code(cls, v: str | None) -> str | None:
        return v.upper() if v else None

class CourseResponse(CourseBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

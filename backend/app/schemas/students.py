from pydantic import BaseModel, ConfigDict, Field, EmailStr
from uuid import UUID
from datetime import date, datetime
from app.models.students import GenderEnum

class StudentPersonalBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    cnic_or_bform: str
    date_of_birth: date
    gender: GenderEnum
    address: str
    profile_photo_url: str | None = None

class StudentGuardianBase(BaseModel):
    father_or_guardian_name: str
    guardian_cnic: str
    guardian_occupation: str
    guardian_contact: str
    emergency_contact: str

class StudentAcademicBase(BaseModel):
    registration_no: str
    program: str
    semester: int = Field(ge=1, le=12)
    session_batch: str
    previous_qualification: str
    previous_institute: str
    marks_or_cgpa: float = Field(ge=0)
    branch_id: UUID | None = None

class StudentCreate(BaseModel):
    personal: StudentPersonalBase
    guardian: StudentGuardianBase
    academic: StudentAcademicBase

class StudentUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    profile_photo_url: str | None = None
    branch_id: UUID | None = None

class StudentResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: str
    phone: str
    cnic_or_bform: str
    date_of_birth: date
    gender: GenderEnum
    address: str
    profile_photo_url: str | None
    
    father_or_guardian_name: str
    guardian_cnic: str
    guardian_occupation: str
    guardian_contact: str
    emergency_contact: str
    
    registration_no: str
    program: str
    semester: int
    session_batch: str
    previous_qualification: str
    previous_institute: str
    marks_or_cgpa: float
    
    branch_id: UUID | None
    branch_locked: bool
    datesheet_locked: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

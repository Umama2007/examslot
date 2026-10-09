import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Date, Enum, text, Integer, ForeignKey, Numeric, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"

class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Personal
    full_name = Column(String, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=False)
    cnic_or_bform = Column(String, unique=True, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(Enum(GenderEnum, name="gender_enum"), nullable=False)
    address = Column(String, nullable=False)
    profile_photo_url = Column(String, nullable=True)
    
    # Guardian
    father_or_guardian_name = Column(String, nullable=False)
    guardian_cnic = Column(String, nullable=False)
    guardian_occupation = Column(String, nullable=False)
    guardian_contact = Column(String, nullable=False)
    emergency_contact = Column(String, nullable=False)
    
    # Academic
    registration_no = Column(String, unique=True, nullable=False, index=True)
    program = Column(String, nullable=False)
    semester = Column(Integer, nullable=False)
    session_batch = Column(String, nullable=False)
    previous_qualification = Column(String, nullable=False)
    previous_institute = Column(String, nullable=False)
    marks_or_cgpa = Column(Numeric(precision=5, scale=2), nullable=False)
    
    # Branch
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    branch_locked = Column(Boolean, default=False, nullable=False)
    datesheet_locked = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint('semester >= 1 AND semester <= 12', name='check_semester_range'),
        CheckConstraint('marks_or_cgpa >= 0', name='check_marks_positive'),
    )

    user = relationship("User", backref="student_profile")
    branch = relationship("Branch")

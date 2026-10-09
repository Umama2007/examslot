import uuid
from sqlalchemy import Column, String, Integer, DateTime, Enum, text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base
from sqlalchemy.sql import func
import enum

class CourseStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"

class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False, index=True) # uppercase
    title = Column(String, nullable=False, index=True)
    credit_hours = Column(Integer, nullable=False)
    department = Column(String, nullable=False)
    status = Column(Enum(CourseStatus, name="course_status"), nullable=False, default=CourseStatus.active)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint('credit_hours >= 1 AND credit_hours <= 6', name='check_credit_hours_range'),
    )

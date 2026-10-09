import uuid
from sqlalchemy import Column, DateTime, text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

class StudentCourse(Base):
    __tablename__ = "student_courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', name='uq_student_course'),
    )

    student = relationship("Student", backref="student_courses")
    course = relationship("Course", backref="student_courses")

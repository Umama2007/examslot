import uuid
from sqlalchemy import Column, Integer, DateTime, Date, Time, Boolean, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship


class ExamSlot(Base):
    __tablename__ = "exam_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)

    exam_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=True)
    capacity = Column(Integer, nullable=True)

    # Added in Phase B migration
    is_cancelled = Column(Boolean, nullable=False, default=False, server_default="false")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('course_id', 'exam_date', 'start_time', name='uq_course_exam_time'),
        CheckConstraint('end_time IS NULL OR end_time > start_time', name='check_end_time_after_start'),
    )

    course = relationship("Course", backref="exam_slots")

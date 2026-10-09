import uuid
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, TSRANGE
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class Selection(Base):
    __tablename__ = "selections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    slot_id = Column(UUID(as_uuid=True), ForeignKey("exam_slots.id", ondelete="CASCADE"), nullable=False)

    # tsrange copied from slot on insert: tsrange(slot_start_ts, end_ts, '[)')
    slot_range = Column(TSRANGE(), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', name='uq_selection_student_course'),
        UniqueConstraint('student_id', 'slot_id', name='uq_selection_student_slot'),
        # The EXCLUDE USING gist constraint is created via migration only
    )

    student = relationship("Student", backref="selections")
    course = relationship("Course", backref="selections")
    slot = relationship("ExamSlot", backref="selections")

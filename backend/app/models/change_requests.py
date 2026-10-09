import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class ChangeRequestType(str, enum.Enum):
    change_branch = "change_branch"
    change_datesheet = "change_datesheet"


class ChangeRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)

    request_type = Column(
        Enum(ChangeRequestType, name="change_request_type_enum"), nullable=False
    )
    reason = Column(String, nullable=False)
    status = Column(
        Enum(ChangeRequestStatus, name="change_request_status_enum"),
        nullable=False,
        default=ChangeRequestStatus.pending,
    )
    admin_remark = Column(String, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    student = relationship("Student", backref="change_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    unlocks = relationship("Unlock", back_populates="change_request")

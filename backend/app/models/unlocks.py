import uuid
from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
from app.models.change_requests import ChangeRequestType
from sqlalchemy import Enum


class Unlock(Base):
    __tablename__ = "unlocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    request_type = Column(
        Enum(ChangeRequestType, name="change_request_type_enum"), nullable=False
    )
    change_request_id = Column(
        UUID(as_uuid=True), ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False
    )
    granted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("Student", backref="unlocks")
    change_request = relationship("ChangeRequest", back_populates="unlocks")

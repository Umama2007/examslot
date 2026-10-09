import uuid
from sqlalchemy import Column, String, DateTime, Enum, text, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base
from sqlalchemy.sql import func
import enum

class BranchStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"

class Branch(Base):
    __tablename__ = "branches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    code = Column(String, unique=True, nullable=False, index=True) # uppercase
    city = Column(String, nullable=False)
    address = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)
    status = Column(Enum(BranchStatus, name="branch_status"), nullable=False, default=BranchStatus.active)
    seat_capacity_default = Column(Integer, nullable=True) # used in Part 3
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

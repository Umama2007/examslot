from sqlalchemy import Column, String, DateTime, Enum, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

class TokenPurpose(str, enum.Enum):
    set_password = "set_password"
    reset_password = "reset_password"

class PasswordToken(Base):
    __tablename__ = "password_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    token_hash = Column(String, unique=True, nullable=False)
    purpose = Column(Enum(TokenPurpose, name="token_purpose", create_type=False), nullable=False)
    
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    token_hash = Column(String, unique=True, nullable=False)
    
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")

from sqlalchemy import Column, String, Boolean, DateTime, Enum, text
from sqlalchemy.dialects.postgresql import UUID, CITEXT
from app.db import Base
from sqlalchemy.sql import func
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    student = "student"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String, unique=True, index=True, nullable=False) # Postgres citext can be used, but String with lowercasing is safer in ORM
    password_hash = Column(String, nullable=True) # Nullable until set
    role = Column(Enum(RoleEnum, name="role_enum", create_type=False), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

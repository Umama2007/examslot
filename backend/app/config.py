from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, EmailStr, PostgresDsn
import secrets
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "ExamSlot API"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    
    # DB
    DATABASE_URL: str
    
    # Auth
    SECRET_KEY: str = secrets.token_urlsafe(32) # Should be set in env in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Email
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "onboarding@resend.dev"
    
    # Storage
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()

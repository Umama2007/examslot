from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas.tokens import LoginRequest, TokenResponse, ForgotPasswordRequest, SetPasswordRequest
from app.schemas.users import UserResponse
from app.models.users import User, RoleEnum
from app.models.tokens import RefreshToken, PasswordToken, TokenPurpose
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, set_refresh_cookie, clear_refresh_cookie, hash_token
from app.core.ratelimit import rate_limit_login
from app.core.email import email_service
from app.deps import get_current_user
from app.config import settings
import secrets
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(request: Request, response: Response, data: LoginRequest, db: Session = Depends(get_db)):
    rate_limit_login(request)
    
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    user.last_login_at = datetime.now(timezone.utc)
    
    access_token = create_access_token(user.id)
    raw_refresh_token = secrets.token_urlsafe(32)
    refresh_token_hash = hash_token(raw_refresh_token)
    
    db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(db_refresh)
    db.commit()
    
    set_refresh_cookie(response, raw_refresh_token)
    
    return {"access_token": access_token}

@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    token_hash = hash_token(token)
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked_at.is_(None)
    ).first()
    
    if not db_token:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
    expires_at = db_token.expires_at.replace(tzinfo=timezone.utc) if db_token.expires_at.tzinfo is None else db_token.expires_at
    if expires_at < datetime.now(timezone.utc):
        clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
    # Rotate
    db_token.revoked_at = datetime.now(timezone.utc)
    
    user = db_token.user
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token = create_access_token(user.id)
    raw_refresh_token = secrets.token_urlsafe(32)
    new_token_hash = hash_token(raw_refresh_token)
    
    new_db_refresh = RefreshToken(
        user_id=user.id,
        token_hash=new_token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    db.add(new_db_refresh)
    db.commit()
    
    set_refresh_cookie(response, raw_refresh_token)
    
    return {"access_token": access_token}

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        token_hash = hash_token(token)
        db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if db_token:
            db_token.revoked_at = datetime.now(timezone.utc)
            db.commit()
    
    clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Always return success message for privacy (byte-identical)
    success_msg = {"message": "If an account with that email exists, a password reset link has been sent."}
    
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not user.is_active:
        return success_msg
        
    raw_token = secrets.token_urlsafe(32)
    db_token = PasswordToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        purpose=TokenPurpose.reset_password,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(db_token)
    db.commit()
    
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    background_tasks.add_task(
        email_service.send_email,
        to=user.email,
        subject="Reset your ExamSlot password",
        html_body=f"<p>Click <a href='{reset_link}'>here</a> to reset your password. The link expires in 24 hours.</p>",
        text_body=f"Click the link to reset your password: {reset_link}"
    )
    
    return success_msg

@router.post("/set-password")
def set_password(data: SetPasswordRequest, db: Session = Depends(get_db)):
    return _process_password_token(data, TokenPurpose.set_password, db)

@router.post("/reset-password")
def reset_password(data: SetPasswordRequest, db: Session = Depends(get_db)):
    return _process_password_token(data, TokenPurpose.reset_password, db)

def _process_password_token(data: SetPasswordRequest, purpose: TokenPurpose, db: Session):
    token_hash = hash_token(data.token)
    db_token = db.query(PasswordToken).filter(
        PasswordToken.token_hash == token_hash,
        PasswordToken.purpose == purpose,
        PasswordToken.used_at.is_(None)
    ).first()
    
    if not db_token:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    expires_at = db_token.expires_at.replace(tzinfo=timezone.utc) if db_token.expires_at.tzinfo is None else db_token.expires_at
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    # Validate password policy
    if len(data.new_password) < 8 or not any(c.isalpha() for c in data.new_password) or not any(c.isdigit() for c in data.new_password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long and contain at least one letter and one digit")
        
    user = db_token.user
    user.password_hash = get_password_hash(data.new_password)
    db_token.used_at = datetime.now(timezone.utc)
    
    db.commit()
    return {"message": "Password updated successfully"}

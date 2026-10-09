from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db import get_db
from app.schemas.students import StudentCreate, StudentUpdate, StudentResponse
from app.models.students import Student
from app.models.users import User, RoleEnum
from app.models.tokens import PasswordToken, TokenPurpose
from app.deps import require_role
from app.core.pagination import paginate, PaginatedResponse
from app.services.audit import log_audit
from app.core.security import hash_token
from app.core.email import email_service
from uuid import UUID
import secrets
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/admin/students", tags=["admin-students"], dependencies=[Depends(require_role(RoleEnum.admin))])

@router.get("", response_model=PaginatedResponse[StudentResponse])
def list_students(
    q: str | None = None,
    program: str | None = None,
    semester: int | None = None,
    branch_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    stmt = db.query(Student)
    if q:
        stmt = stmt.filter(or_(
            Student.full_name.ilike(f"%{q}%"),
            Student.email.ilike(f"%{q}%"),
            Student.registration_no.ilike(f"%{q}%"),
            Student.program.ilike(f"%{q}%")
        ))
    if program:
        stmt = stmt.filter(Student.program == program)
    if semester:
        stmt = stmt.filter(Student.semester == semester)
    if branch_id:
        stmt = stmt.filter(Student.branch_id == branch_id)
        
    stmt = stmt.order_by(Student.created_at.desc())
    
    items, total, total_pages = paginate(db, stmt, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}

@router.post("", response_model=StudentResponse)
def create_student(data: StudentCreate, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    email = data.personal.email.lower()
    
    # Uniqueness checks
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail={"field": "email", "message": "Email already exists"})
    if db.query(Student).filter(Student.cnic_or_bform == data.personal.cnic_or_bform).first():
        raise HTTPException(status_code=409, detail={"field": "cnic_or_bform", "message": "CNIC/B-Form already exists"})
    if db.query(Student).filter(Student.registration_no == data.academic.registration_no).first():
        raise HTTPException(status_code=409, detail={"field": "registration_no", "message": "Registration number already exists"})
        
    user = User(
        email=email,
        role=RoleEnum.student
    )
    db.add(user)
    db.flush()
    
    student = Student(
        user_id=user.id,
        **data.personal.model_dump(),
        **data.guardian.model_dump(),
        **data.academic.model_dump()
    )
    db.add(student)
    db.flush()
    
    # Token generation and email
    _issue_and_send_setup_email(db, user, student)
    
    log_audit(db, current_user, "CREATE_STUDENT", "Student", str(student.id), data.model_dump())
    db.commit()
    db.refresh(student)
    return student

def _issue_and_send_setup_email(db: Session, user: User, student: Student):
    # Invalidate old tokens
    db.query(PasswordToken).filter(
        PasswordToken.user_id == user.id,
        PasswordToken.purpose == TokenPurpose.set_password,
        PasswordToken.used_at.is_(None)
    ).update({"used_at": datetime.now(timezone.utc)})
    
    raw_token = secrets.token_urlsafe(32)
    db_token = PasswordToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        purpose=TokenPurpose.set_password,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(db_token)
    
    setup_link = f"http://localhost:5173/set-password?token={raw_token}"
    email_service.send_email(
        to=user.email,
        subject="Welcome to ExamSlot - Set your password",
        html_body=f"<p>Hello {student.full_name},</p><p>Your registration number is {student.registration_no}.</p><p>Click <a href='{setup_link}'>here</a> to set your password. This link expires in 24 hours.</p>",
        text_body=f"Hello {student.full_name},\nYour registration number is {student.registration_no}.\nClick the link to set your password: {setup_link}"
    )

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: UUID, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(student_id: UUID, data: StudentUpdate, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(student, key, value)
        
    log_audit(db, current_user, "UPDATE_STUDENT", "Student", str(student.id), update_data)
    db.commit()
    db.refresh(student)
    return student

@router.delete("/{student_id}")
def delete_student(student_id: UUID, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if student.datesheet_locked:
        raise HTTPException(status_code=409, detail="Cannot delete a student with a saved date sheet")
        
    user = student.user
    db.delete(user) # This cascades and deletes the student, tokens, etc.
    log_audit(db, current_user, "DELETE_STUDENT", "Student", str(student_id))
    db.commit()
    return {"message": "Student and user deleted successfully"}

@router.post("/{student_id}/resend-setup-email")
def resend_setup_email(student_id: UUID, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.user.password_hash:
        raise HTTPException(status_code=400, detail="Student has already set a password")
        
    _issue_and_send_setup_email(db, student.user, student)
    db.commit()
    return {"message": "Setup email resent"}

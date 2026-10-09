from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db import get_db
from app.schemas.courses import CourseCreate, CourseUpdate, CourseResponse
from app.models.courses import Course, CourseStatus
from app.models.student_courses import StudentCourse
from app.models.exam_slots import ExamSlot
from app.models.users import RoleEnum
from app.deps import require_role
from app.core.pagination import paginate, PaginatedResponse
from app.services.audit import log_audit
from uuid import UUID

router = APIRouter(prefix="/admin/courses", tags=["admin-courses"], dependencies=[Depends(require_role(RoleEnum.admin))])

@router.get("", response_model=PaginatedResponse[CourseResponse])
def list_courses(
    q: str | None = None,
    department: str | None = None,
    status: CourseStatus | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    stmt = db.query(Course)
    if q:
        stmt = stmt.filter(or_(
            Course.code.ilike(f"%{q}%"),
            Course.title.ilike(f"%{q}%")
        ))
    if department:
        stmt = stmt.filter(Course.department == department)
    if status:
        stmt = stmt.filter(Course.status == status)
    
    stmt = stmt.order_by(Course.created_at.desc())
    
    items, total, total_pages = paginate(db, stmt, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}

@router.post("", response_model=CourseResponse)
def create_course(data: CourseCreate, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    if db.query(Course).filter(Course.code == data.code).first():
        raise HTTPException(status_code=409, detail="Course code already exists")
        
    course = Course(**data.model_dump())
    db.add(course)
    db.flush()
    
    log_audit(db, current_user, "CREATE_COURSE", "Course", str(course.id), data.model_dump())
    db.commit()
    db.refresh(course)
    return course

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: UUID, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.put("/{course_id}", response_model=CourseResponse)
def update_course(course_id: UUID, data: CourseUpdate, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if data.code and data.code != course.code:
        if db.query(Course).filter(Course.code == data.code).first():
            raise HTTPException(status_code=409, detail="Course code already exists")
            
    update_data = data.model_dump(exclude_unset=True)
    changed_fields = {}
    for key, value in update_data.items():
        if getattr(course, key) != value:
            if key not in ["password", "token"]:
                changed_fields[key] = {"old": getattr(course, key), "new": value}
            setattr(course, key, value)
        
    if changed_fields:
        log_audit(db, current_user, "UPDATE_COURSE", "Course", str(course.id), changed_fields)
    db.commit()
    db.refresh(course)
    return course

@router.delete("/{course_id}")
def delete_course(course_id: UUID, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if db.query(StudentCourse).filter(StudentCourse.course_id == course_id).first():
        raise HTTPException(status_code=409, detail="Cannot delete course assigned to students")
        
    if db.query(ExamSlot).filter(ExamSlot.course_id == course_id).first():
        raise HTTPException(status_code=409, detail="Cannot delete course with exam slots")
        
    db.delete(course)
    log_audit(db, current_user, "DELETE_COURSE", "Course", str(course.id))
    db.commit()
    return {"message": "Course deleted successfully"}

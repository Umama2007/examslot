from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_user
from app.models.users import User, RoleEnum
from app.models.students import Student
from app.models.student_courses import StudentCourse
from pydantic import BaseModel, Field
from typing import List
from uuid import UUID

router = APIRouter(prefix="/student/courses", tags=["student_courses"])


class BulkCoursesRequest(BaseModel):
    course_ids: List[UUID] = Field(..., min_length=4, max_length=6)

def get_student(db: Session, user: User) -> Student:
    if user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not a student")
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.put("/bulk")
def submit_courses(req: BulkCoursesRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = get_student(db, current_user)
    
    # 1. Service-level lock on student
    db.query(Student).filter(Student.id == student.id).with_for_update().first()
    
    if student.datesheet_locked:
        raise HTTPException(status_code=423, detail="Datesheet is locked")
        
    # Delete existing
    db.query(StudentCourse).filter(StudentCourse.student_id == student.id).delete()
    
    # Insert new
    for cid in req.course_ids:
        db.add(StudentCourse(student_id=student.id, course_id=cid))
        
    db.commit()
    return {"message": "Courses updated successfully", "count": len(req.course_ids)}

@router.post("/{course_id}")
def add_course(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = get_student(db, current_user)
    
    # Service-level lock
    db.query(Student).filter(Student.id == student.id).with_for_update().first()
    
    if student.datesheet_locked:
        raise HTTPException(status_code=423, detail="Datesheet is locked")
        
    # Check current count
    count = db.query(StudentCourse).filter(StudentCourse.student_id == student.id).count()
    if count >= 6:
        raise HTTPException(status_code=409, detail="Maximum 6 courses allowed")
        
    # Check if already exists
    exists = db.query(StudentCourse).filter(StudentCourse.student_id == student.id, StudentCourse.course_id == course_id).first()
    if exists:
        raise HTTPException(status_code=409, detail="Course already added")
        
    db.add(StudentCourse(student_id=student.id, course_id=course_id))
    db.commit()
    return {"message": "Course added"}

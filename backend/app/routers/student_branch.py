from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_user
from app.models.users import User, RoleEnum
from app.models.students import Student
from app.models.branches import Branch, BranchStatus
from uuid import UUID

router = APIRouter(prefix="/student/branch", tags=["student_branch"])

def _get_student(db: Session, user: User) -> Student:
    if user.role != RoleEnum.student:
        raise HTTPException(status_code=403, detail="Not a student")
    s = db.query(Student).filter(Student.user_id == user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return s

@router.post("/{branch_id}", status_code=200)
def select_branch(
    branch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Lock student row
    s = db.query(Student).filter(Student.user_id == current_user.id).with_for_update().first()
    if not s:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Already selected — one-time only
    if s.branch_id is not None:
        raise HTTPException(status_code=409, detail="Branch already selected")

    # Branch must exist and be active
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    if branch.status != BranchStatus.active:
        raise HTTPException(status_code=422, detail="Branch is not active")

    s.branch_id = branch_id
    db.commit()
    return {"branch_id": str(branch_id), "message": "Branch selected"}

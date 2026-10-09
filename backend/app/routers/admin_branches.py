from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db import get_db
from app.schemas.branches import BranchCreate, BranchUpdate, BranchResponse
from app.schemas.users import UserResponse
from app.models.branches import Branch, BranchStatus
from app.models.students import Student
from app.models.users import RoleEnum
from app.deps import require_role
from app.core.pagination import paginate, PaginatedResponse
from app.services.audit import log_audit
from uuid import UUID

router = APIRouter(prefix="/admin/branches", tags=["admin-branches"], dependencies=[Depends(require_role(RoleEnum.admin))])

@router.get("", response_model=PaginatedResponse[BranchResponse])
def list_branches(
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    stmt = db.query(Branch)
    if q:
        stmt = stmt.filter(or_(
            Branch.name.ilike(f"%{q}%"),
            Branch.code.ilike(f"%{q}%"),
            Branch.city.ilike(f"%{q}%")
        ))
    
    # default sort by created_at desc
    stmt = stmt.order_by(Branch.created_at.desc())
    
    items, total, total_pages = paginate(db, stmt, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}

@router.post("", response_model=BranchResponse)
def create_branch(data: BranchCreate, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    if db.query(Branch).filter(Branch.code == data.code).first():
        raise HTTPException(status_code=409, detail="Branch code already exists")
        
    branch = Branch(**data.model_dump())
    db.add(branch)
    db.flush()
    
    log_audit(db, current_user, "CREATE_BRANCH", "Branch", str(branch.id), data.model_dump())
    db.commit()
    db.refresh(branch)
    return branch

@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(branch_id: UUID, db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch

@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(branch_id: UUID, data: BranchUpdate, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    if data.code and data.code != branch.code:
        if db.query(Branch).filter(Branch.code == data.code).first():
            raise HTTPException(status_code=409, detail="Branch code already exists")
            
    update_data = data.model_dump(exclude_unset=True)
    changed_fields = {}
    for key, value in update_data.items():
        if getattr(branch, key) != value:
            if key not in ["password", "token"]:
                changed_fields[key] = {"old": getattr(branch, key), "new": value}
            setattr(branch, key, value)
        
    if changed_fields:
        log_audit(db, current_user, "UPDATE_BRANCH", "Branch", str(branch.id), changed_fields)
    db.commit()
    db.refresh(branch)
    return branch

@router.delete("/{branch_id}")
def delete_branch(branch_id: UUID, db: Session = Depends(get_db), current_user = Depends(require_role(RoleEnum.admin))):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
        
    # Check if referenced by any student
    if db.query(Student).filter(Student.branch_id == branch_id).first():
        raise HTTPException(status_code=409, detail="Cannot delete branch referenced by students")
        
    branch.status = BranchStatus.inactive
    log_audit(db, current_user, "DELETE_BRANCH", "Branch", str(branch.id), {"status": "inactive"})
    db.commit()
    return {"message": "Branch set to inactive"}

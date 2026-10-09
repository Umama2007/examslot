from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas.audit_logs import AuditLogResponse
from app.models.audit_logs import AuditLog
from app.models.users import RoleEnum
from app.deps import require_role
from app.core.pagination import paginate, PaginatedResponse

router = APIRouter(prefix="/admin/audit-logs", tags=["admin-audit"], dependencies=[Depends(require_role(RoleEnum.admin))])

@router.get("", response_model=PaginatedResponse[AuditLogResponse])
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    stmt = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    items, total, total_pages = paginate(db, stmt, page, page_size)
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}

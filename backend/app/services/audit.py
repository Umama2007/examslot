from sqlalchemy.orm import Session
from app.models.audit_logs import AuditLog
from app.models.users import User
from typing import Any

def log_audit(db: Session, actor: User, action: str, entity_type: str, entity_id: str, details: dict[str, Any] | None = None):
    if details:
        # Filter out sensitive fields
        safe_details = {}
        for k, v in details.items():
            if "password" not in k.lower() and "token" not in k.lower():
                safe_details[k] = v
        details = safe_details
    
    log = AuditLog(
        actor_user_id=actor.id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details
    )
    db.add(log)

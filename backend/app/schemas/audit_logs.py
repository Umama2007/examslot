from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Any

class AuditLogResponse(BaseModel):
    id: UUID
    actor_user_id: UUID | None
    action: str
    entity_type: str
    entity_id: str
    details: dict[str, Any] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

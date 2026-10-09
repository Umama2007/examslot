from typing import Generic, TypeVar, Sequence, Tuple
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.sql.selectable import Select

T = TypeVar("T")

class PaginatedResponse(BaseModel, Generic[T]):
    items: Sequence[T]
    total: int
    page: int
    page_size: int
    total_pages: int

def paginate(db: Session, stmt: Select, page: int, page_size: int) -> Tuple[Sequence, int, int]:
    """
    Executes a SELECT statement with LIMIT and OFFSET, and calculates total count and pages.
    Returns (items, total_count, total_pages).
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10
    if page_size > 100:
        page_size = 100
        
    # Count total items matching the statement (after filters, before limit/offset)
    count_stmt = stmt.with_only_columns(func.count()).order_by(None)
    total = db.scalar(count_stmt) or 0
    
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
    
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    
    return items, total, total_pages

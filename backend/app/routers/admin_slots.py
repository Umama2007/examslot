from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.db import get_db
from app.deps import require_role
from app.models.users import RoleEnum
from app.models.exam_slots import ExamSlot
from app.models.selections import Selection
from app.models.courses import Course
from app.models.notifications import Notification
from app.models.students import Student
from app.services import notification as notif_svc
from app.core.pagination import paginate, PaginatedResponse
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, time

router = APIRouter(prefix="/admin/slots", tags=["admin-slots"],
                   dependencies=[Depends(require_role(RoleEnum.admin))])


class SlotCreate(BaseModel):
    course_id: UUID
    exam_date: date
    start_time: time
    end_time: Optional[time] = None
    capacity: Optional[int] = None


class SlotResponse(BaseModel):
    id: UUID
    course_id: UUID
    exam_date: date
    start_time: time
    end_time: Optional[time] = None
    capacity: Optional[int] = None
    booked_count: int = 0
    is_cancelled: bool = False

    model_config = {"from_attributes": True}


@router.get("", response_model=PaginatedResponse[SlotResponse])
def list_slots(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    course_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
):
    stmt = db.query(ExamSlot)
    if course_id:
        stmt = stmt.filter(ExamSlot.course_id == course_id)
    stmt = stmt.order_by(ExamSlot.exam_date, ExamSlot.start_time)
    items, total, total_pages = paginate(db, stmt, page, page_size)

    # Attach booked counts
    slot_ids = [s.id for s in items]
    counts = {}
    if slot_ids:
        rows = db.query(Selection.slot_id, func.count(Selection.id)).filter(
            Selection.slot_id.in_(slot_ids)
        ).group_by(Selection.slot_id).all()
        counts = {r[0]: r[1] for r in rows}

    result = []
    for s in items:
        d = SlotResponse.model_validate(s)
        d.booked_count = counts.get(s.id, 0)
        result.append(d)

    return {"items": result, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@router.post("", response_model=SlotResponse, status_code=201)
def create_slot(data: SlotCreate, db: Session = Depends(get_db)):
    # Validate course exists
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # end_time must be after start_time
    if data.end_time and data.end_time <= data.start_time:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")

    # Duplicate slot check
    existing = db.query(ExamSlot).filter(
        ExamSlot.course_id == data.course_id,
        ExamSlot.exam_date == data.exam_date,
        ExamSlot.start_time == data.start_time,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Duplicate slot for this course/date/time")

    slot = ExamSlot(**data.model_dump())
    db.add(slot)
    db.commit()
    db.refresh(slot)
    d = SlotResponse.model_validate(slot)
    d.booked_count = 0
    return d


@router.post("/{slot_id}/cancel")
def cancel_slot(slot_id: UUID, db: Session = Depends(get_db),
                current_user=Depends(require_role(RoleEnum.admin))):
    slot = db.query(ExamSlot).filter(ExamSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_cancelled:
        raise HTTPException(status_code=409, detail="Slot already cancelled")

    slot.is_cancelled = True

    # Notify all booked students
    selections = db.query(Selection).filter(Selection.slot_id == slot_id).all()
    for sel in selections:
        student = sel.student
        user = student.user
        notif_svc.queue_and_send(
            db, user,
            subject="Exam slot cancelled",
            html_body=f"<p>Dear {student.full_name}, your exam slot on {slot.exam_date} at {slot.start_time} has been cancelled.</p>",
            text_body=f"Dear {student.full_name}, your exam slot on {slot.exam_date} at {slot.start_time} has been cancelled.",
        )

    db.commit()
    return {"message": "Slot cancelled", "notifications_queued": len(selections)}


@router.delete("/{slot_id}")
def delete_slot(slot_id: UUID, db: Session = Depends(get_db)):
    slot = db.query(ExamSlot).filter(ExamSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    booked = db.query(Selection).filter(Selection.slot_id == slot_id).count()
    if booked > 0:
        raise HTTPException(status_code=409, detail="Cannot delete slot with active bookings; use cancel instead")

    db.delete(slot)
    db.commit()
    return {"message": "Slot deleted"}

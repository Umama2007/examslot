"""
Notification service — stores every email in the notifications table,
then attempts to send.  Failures are recorded (not raised) so the
caller's transaction always commits.
"""
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.notifications import Notification
from app.models.users import User
from app.core.email import email_service
import logging

logger = logging.getLogger(__name__)


def queue_and_send(
    db: Session,
    user: User,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> Notification:
    """
    Create a Notification row and attempt to send immediately.
    The row is flushed (not committed) — caller must commit.
    Failures are stored in last_error and never raised.
    """
    notif = Notification(
        user_id=user.id,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        attempts=0,
    )
    db.add(notif)
    db.flush()

    try:
        ok = email_service.send_email(
            to=user.email,
            subject=subject,
            html_body=html_body,
            text_body=text_body or "",
        )
        notif.attempts = 1
        if ok:
            notif.sent_at = datetime.now(timezone.utc)
        else:
            notif.last_error = "send_email returned False"
    except Exception as exc:
        notif.attempts = 1
        notif.last_error = str(exc)
        logger.warning("Failed to send notification %s: %s", notif.id, exc)

    return notif


def retry_unsent(db: Session, max_attempts: int = 5) -> int:
    """Retry all unsent notifications with fewer than max_attempts."""
    rows = (
        db.query(Notification)
        .filter(Notification.sent_at.is_(None), Notification.attempts < max_attempts)
        .all()
    )
    sent = 0
    for notif in rows:
        user = notif.user
        if not user:
            continue
        try:
            ok = email_service.send_email(
                to=user.email,
                subject=notif.subject,
                html_body=notif.html_body,
                text_body=notif.text_body or "",
            )
            notif.attempts += 1
            if ok:
                notif.sent_at = datetime.now(timezone.utc)
                sent += 1
            else:
                notif.last_error = "send_email returned False"
        except Exception as exc:
            notif.attempts += 1
            notif.last_error = str(exc)
    db.commit()
    return sent

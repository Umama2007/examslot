import resend
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        if settings.RESEND_API_KEY:
            resend.api_key = settings.RESEND_API_KEY
            self.use_api = True
        else:
            self.use_api = False
            logger.warning("RESEND_API_KEY is missing. Falling back to console logging for emails.")

    def send_email(self, to: str, subject: str, html_body: str, text_body: str) -> bool:
        if self.use_api:
            try:
                response = resend.Emails.send({
                    "from": settings.EMAIL_FROM,
                    "to": to,
                    "subject": subject,
                    "html": html_body,
                    "text": text_body
                })
                logger.info(f"Email sent successfully via Resend to {to}")
                return True
            except Exception as e:
                logger.error(f"Failed to send email to {to} via Resend: {e}")
                return False
        else:
            logger.info("=" * 40)
            logger.info(f"MOCK EMAIL TO: {to}")
            logger.info(f"SUBJECT: {subject}")
            logger.info(f"TEXT BODY: {text_body}")
            logger.info("=" * 40)
            return True

email_service = EmailService()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.config import settings
from app.db import engine, Base
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title=settings.PROJECT_NAME)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["Content-Security-Policy"] = "default-src 'self' * 'unsafe-inline' 'unsafe-eval'; img-src * data: blob:;"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, admin_branches, admin_courses, admin_students, admin_audit, student_courses, student_branch

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(admin_branches.router, prefix=settings.API_V1_STR)
app.include_router(admin_courses.router, prefix=settings.API_V1_STR)
app.include_router(admin_students.router, prefix=settings.API_V1_STR)
app.include_router(admin_audit.router, prefix=settings.API_V1_STR)
app.include_router(student_courses.router, prefix=settings.API_V1_STR)
app.include_router(student_branch.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to ExamSlot API"}

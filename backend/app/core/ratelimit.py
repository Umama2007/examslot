import time
from fastapi import Request, HTTPException, status
from collections import defaultdict

# In-memory store: { ip: [timestamp1, timestamp2, ...] }
# Note: For a production environment with multiple workers, Redis should be used instead.
RATE_LIMIT_STORE = defaultdict(list)
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 60

from app.config import settings

def rate_limit_login(request: Request):
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and settings.TRUST_PROXY:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Clean up old timestamps
    RATE_LIMIT_STORE[ip] = [t for t in RATE_LIMIT_STORE[ip] if now - t < WINDOW_SECONDS]
    
    if len(RATE_LIMIT_STORE[ip]) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later."
        )
    
    RATE_LIMIT_STORE[ip].append(now)

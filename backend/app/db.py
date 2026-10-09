from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Supabase pgBouncer requires disabling prepared statements for psycopg3.
connect_args = {"prepare_threshold": None}

engine = create_engine(
    settings.DATABASE_URL.replace("postgres://", "postgresql+psycopg://").replace("postgresql://", "postgresql+psycopg://"),
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

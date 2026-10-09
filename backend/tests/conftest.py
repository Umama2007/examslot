import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db import Base, get_db
from app.models.users import User, RoleEnum
from app.core.security import get_password_hash
import os

# Use TEST_DATABASE_URL for Postgres tests, fallback to SQLite
SQLALCHEMY_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///./test.db")

if "sqlite" not in SQLALCHEMY_DATABASE_URL:
    if os.environ.get("ALLOW_DESTRUCTIVE_TESTS") != "true" and "test" not in SQLALCHEMY_DATABASE_URL.lower():
        raise RuntimeError("Safety Check Failed: The database URL does not contain 'test' and ALLOW_DESTRUCTIVE_TESTS is not true. Aborting to prevent data loss.")

# Connect args specific to SQLite
connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {"prepare_threshold": None}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    
    # Add trigger for Postgres
    if "sqlite" not in SQLALCHEMY_DATABASE_URL:
        with engine.connect() as conn:
            conn.execute(text("""
            CREATE OR REPLACE FUNCTION enforce_4_to_6_rule()
            RETURNS TRIGGER AS $$
            DECLARE
                course_count INT;
                v_student_id UUID;
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    v_student_id := OLD.student_id;
                ELSE
                    v_student_id := NEW.student_id;
                END IF;
                SELECT COUNT(*) INTO course_count FROM student_courses WHERE student_id = v_student_id;
                IF course_count > 0 AND (course_count < 4 OR course_count > 6) THEN
                    RAISE EXCEPTION 'A student must have between 4 and 6 courses.';
                END IF;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;
            """))
            conn.execute(text("""
            DROP TRIGGER IF EXISTS check_4_to_6_courses ON student_courses;
            """))
            conn.execute(text("""
            CREATE CONSTRAINT TRIGGER check_4_to_6_courses
            AFTER INSERT OR UPDATE OR DELETE ON student_courses
            DEFERRABLE INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE FUNCTION enforce_4_to_6_rule();
            """))
            conn.commit()
            
    yield engine
    Base.metadata.drop_all(bind=engine)
    try:
        if os.path.exists("./test.db"):
            os.remove("./test.db")
    except PermissionError:
        pass

@pytest.fixture(scope="function")
def db_session(db_engine):
    from app.core.ratelimit import RATE_LIMIT_STORE
    RATE_LIMIT_STORE.clear()
    
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app, base_url="https://testserver")
    del app.dependency_overrides[get_db]

@pytest.fixture(scope="function")
def test_admin(db_session):
    admin = User(email="testadmin@examslot.test", role=RoleEnum.admin, password_hash=get_password_hash("Admin123!"))
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin

@pytest.fixture(scope="function")
def admin_token(client, test_admin):
    res = client.post("/api/v1/auth/login", json={"email": "testadmin@examslot.test", "password": "Admin123!"})
    return res.json()["access_token"]

@pytest.fixture(scope="function")
def test_student(db_session):
    student = User(email="teststudent@examslot.test", role=RoleEnum.student, password_hash=get_password_hash("Student123!"))
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    return student

@pytest.fixture(scope="function")
def student_token(client, test_student):
    res = client.post("/api/v1/auth/login", json={"email": "teststudent@examslot.test", "password": "Student123!"})
    return res.json()["access_token"]

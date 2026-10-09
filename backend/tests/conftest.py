import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db import Base, get_db
from app.models.users import User, RoleEnum
from app.core.security import get_password_hash
import os

# Use SQLite for tests to keep it simple and isolated
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test.db"):
        os.remove("./test.db")

@pytest.fixture(scope="function")
def db_session(db_engine):
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
    yield TestClient(app)
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

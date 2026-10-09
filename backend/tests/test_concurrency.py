import pytest
import threading
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_lock_timeout(dbapi_connection, connection_record):
    if hasattr(dbapi_connection, 'cursor'):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("SET lock_timeout = '5s'")
            dbapi_connection.commit()
        except Exception:
            dbapi_connection.rollback()
        finally:
            cursor.close()

# We will use this fixture in the implementation to provide a multi-threaded client
@pytest.fixture(scope="function")
def concurrent_client(app, db_engine):
    # Setup for concurrent client overriding get_db with actual connection pooling
    pass

def setup_real_data(db_engine):
    from sqlalchemy.orm import sessionmaker
    from app.models.users import User, RoleEnum
    from app.models.students import Student, GenderEnum
    from app.models.courses import Course
    import uuid
    from datetime import date
    from app.core.security import get_password_hash
    SessionLocal = sessionmaker(bind=db_engine)
    db = SessionLocal()
    
    u = User(email=f"conc_{uuid.uuid4()}@test.com", role=RoleEnum.student, password_hash=get_password_hash("test"))
    db.add(u)
    db.commit()
    
    s = Student(user_id=u.id, full_name="Conc", email=u.email, phone="123", cnic_or_bform=str(uuid.uuid4()), date_of_birth=date(2000, 1, 1), gender=GenderEnum.male, address="Test", father_or_guardian_name="x", guardian_cnic="x", guardian_occupation="x", guardian_contact="x", emergency_contact="x", registration_no=str(uuid.uuid4()), program="x", semester=1, session_batch="x", previous_qualification="x", previous_institute="x", marks_or_cgpa=3.5)
    db.add(s)
    db.commit()
    db.refresh(s)
    
    courses = [Course(code=f"CS20{i}_{uuid.uuid4().hex[:4]}", title=f"Title {i}", credit_hours=3, department="CS") for i in range(7)]
    for c in courses:
        db.add(c)
    db.commit()
    for c in courses:
        db.refresh(c)
        
    return db, u, s, courses

# GROUP 1: 4-to-6 Rule Limits
def test_concurrency_4_to_6_rule_api_422(client: TestClient, db_session):
    """API should reject 3 or 7 courses upfront with 422 before any write during datesheet submission."""
    import uuid
    from app.models.users import User, RoleEnum
    from app.models.students import Student, GenderEnum
    from datetime import date
    
    u = User(email=f"conc_{uuid.uuid4()}@test.com", role=RoleEnum.student)
    db_session.add(u)
    db_session.commit()
    s = Student(user_id=u.id, full_name="Conc", email=u.email, phone="123", cnic_or_bform=str(uuid.uuid4()), date_of_birth=date(2000, 1, 1), gender=GenderEnum.male, address="Test", father_or_guardian_name="x", guardian_cnic="x", guardian_occupation="x", guardian_contact="x", emergency_contact="x", registration_no=str(uuid.uuid4()), program="x", semester=1, session_batch="x", previous_qualification="x", previous_institute="x", marks_or_cgpa=3.5)
    db_session.add(s)
    db_session.commit()
    
    from app.main import app
    from app.deps import get_current_user
    app.dependency_overrides[get_current_user] = lambda: u
    
    try:
        res3 = client.put("/api/v1/student/courses/bulk", json={"course_ids": [str(uuid.uuid4()) for _ in range(3)]})
        assert res3.status_code == 422
        res7 = client.put("/api/v1/student/courses/bulk", json={"course_ids": [str(uuid.uuid4()) for _ in range(7)]})
        assert res7.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)

def test_concurrency_4_to_6_rule_db_trigger(db_engine):
    """The DB trigger should backstop direct SQL writes that violate the 4-to-6 rule at commit time."""
    import sqlalchemy.exc
    if db_engine.dialect.name == 'sqlite':
        pytest.skip("Deferred constraint triggers require Postgres")
        
    db, u, s, courses = setup_real_data(db_engine)
    from app.models.student_courses import StudentCourse
    
    for c in courses[:3]:
        db.add(StudentCourse(student_id=s.id, course_id=c.id))
        
    db.flush()
    with pytest.raises((sqlalchemy.exc.ProgrammingError, sqlalchemy.exc.IntegrityError)):
        db.commit()
    db.rollback()
    
    # cleanup: delete student before user (FK constraint)
    db.delete(s)
    db.delete(u)
    db.commit()
    db.close()

def test_concurrency_4_to_6_rule_parallel_inserts(db_engine):
    """Two parallel inserts via API from a student who has 5 courses, one committing a 6th and one a 7th, where exactly one succeeds and one fails (409 or trigger error), final count exactly 6."""
    from app.models.student_courses import StudentCourse
    from fastapi.testclient import TestClient
    from app.main import app
    from app.deps import get_current_user
    import threading
    
    if db_engine.dialect.name == 'sqlite':
        pytest.skip("Concurrency requires Postgres")

    db, u, s, courses = setup_real_data(db_engine)
    
    for i in range(5):
        db.add(StudentCourse(student_id=s.id, course_id=courses[i].id))
    db.commit()
    
    app.dependency_overrides[get_current_user] = lambda: u

    barrier = threading.Barrier(2)
    results = []
    
    def try_add_course(course_idx):
        client = TestClient(app)
        barrier.wait()
        res = client.post(f"/api/v1/student/courses/{courses[course_idx].id}")
        results.append(res.status_code)
            
    t1 = threading.Thread(target=try_add_course, args=(5,))
    t2 = threading.Thread(target=try_add_course, args=(6,))
    t1.start()
    t2.start()
    t1.join(timeout=90)
    t2.join(timeout=90)
    
    app.dependency_overrides.pop(get_current_user, None)

    assert not t1.is_alive() and not t2.is_alive(), "Threads did not finish"
    assert all(code in (200, 201, 409) for code in results), f"Unexpected status code: {results}"
    success_count = results.count(200) + results.count(201)
    assert success_count == 1, f"Expected exactly one 200/201, got: {results}"
    assert results.count(409) == 1, f"Expected exactly one 409, got: {results}"
    
    count = db.query(StudentCourse).filter_by(student_id=s.id).count()
    assert count == 6, f"Expected 6 courses, got {count}"
    
    # Cleanup
    db.query(StudentCourse).filter_by(student_id=s.id).delete()
    db.delete(s)
    db.delete(u)
    for c in courses:
        db.delete(c)
    db.commit()
    db.close()

# GROUP 2: Branch Selection
def test_concurrency_branch_selection_inactive_422(db_engine):
    """Inactive branch returns 422."""
    from app.models.branches import Branch, BranchStatus
    from sqlalchemy.orm import sessionmaker
    from fastapi.testclient import TestClient
    from app.main import app
    from app.deps import get_current_user
    if db_engine.dialect.name == 'sqlite':
        pytest.skip("Postgres only")
    db, u, s, courses = setup_real_data(db_engine)

    branch = Branch(name=f"Inact{u.id.hex[:4]}", code=f"IB{u.id.hex[:4]}", city="X", address="X", contact_number="0", status=BranchStatus.inactive)
    db.add(branch)
    db.commit()
    db.refresh(branch)

    app.dependency_overrides[get_current_user] = lambda: u
    try:
        client = TestClient(app)
        res = client.post(f"/api/v1/student/branch/{branch.id}")
        assert res.status_code == 422, res.json()
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # cleanup
    db.query(type(s)).filter_by(id=s.id).delete()
    db.delete(u)
    db.delete(branch)
    for c in courses: db.delete(c)
    db.commit(); db.close()

def test_concurrency_branch_selection_second_rejected_409(db_engine):
    """Second branch selection by same student returns 409."""
    from app.models.branches import Branch, BranchStatus
    from fastapi.testclient import TestClient
    from app.main import app
    from app.deps import get_current_user
    if db_engine.dialect.name == 'sqlite':
        pytest.skip("Postgres only")
    db, u, s, courses = setup_real_data(db_engine)

    b1 = Branch(name=f"B1{u.id.hex[:4]}", code=f"B1{u.id.hex[:4]}", city="X", address="X", contact_number="0", status=BranchStatus.active)
    b2 = Branch(name=f"B2{u.id.hex[:4]}", code=f"B2{u.id.hex[:4]}", city="X", address="X", contact_number="0", status=BranchStatus.active)
    db.add(b1); db.add(b2); db.commit()
    db.refresh(b1); db.refresh(b2)

    app.dependency_overrides[get_current_user] = lambda: u
    try:
        client = TestClient(app)
        res1 = client.post(f"/api/v1/student/branch/{b1.id}")
        assert res1.status_code == 200, res1.json()
        res2 = client.post(f"/api/v1/student/branch/{b2.id}")
        assert res2.status_code == 409, res2.json()
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # cleanup
    db.query(type(s)).filter_by(id=s.id).delete()
    db.delete(u)
    db.delete(b1); db.delete(b2)
    for c in courses: db.delete(c)
    db.commit(); db.close()

def test_concurrency_branch_selection_parallel(db_engine):
    """Two parallel branch-selection requests via API: exactly one wins, one loses. branch_id matches winner."""
    from app.models.branches import Branch, BranchStatus
    from fastapi.testclient import TestClient
    from app.main import app
    from app.deps import get_current_user
    import threading
    
    if db_engine.dialect.name == 'sqlite':
        pytest.skip("Postgres only")
        
    db, u, s, courses = setup_real_data(db_engine)

    b1 = Branch(name=f"BP1{u.id.hex[:4]}", code=f"BP1{u.id.hex[:4]}", city="X", address="X", contact_number="0", status=BranchStatus.active)
    b2 = Branch(name=f"BP2{u.id.hex[:4]}", code=f"BP2{u.id.hex[:4]}", city="X", address="X", contact_number="0", status=BranchStatus.active)
    db.add(b1); db.add(b2); db.commit()
    db.refresh(b1); db.refresh(b2)
    
    app.dependency_overrides[get_current_user] = lambda: u

    barrier = threading.Barrier(2)
    results = []  # (status_code, branch_id)

    def try_select(branch):
        client = TestClient(app)
        barrier.wait()
        res = client.post(f"/api/v1/student/branch/{branch.id}")
        results.append((res.status_code, branch.id))

    t1 = threading.Thread(target=try_select, args=(b1,))
    t2 = threading.Thread(target=try_select, args=(b2,))
    t1.start(); t2.start()
    t1.join(timeout=90); t2.join(timeout=90)
    
    app.dependency_overrides.pop(get_current_user, None)

    assert not t1.is_alive() and not t2.is_alive(), "Threads did not finish"
    
    status_codes = [r[0] for r in results]
    assert all(code in (200, 201, 409) for code in status_codes), f"Unexpected status code: {status_codes}"
    
    success_count = status_codes.count(200) + status_codes.count(201)
    assert success_count == 1, f"Expected exactly one 200/201 success, got: {status_codes}"
    assert status_codes.count(409) == 1, f"Expected exactly one 409 failure, got: {status_codes}"

    db.refresh(s)
    winner_branch_id = next(r[1] for r in results if r[0] in (200, 201))
    assert s.branch_id == winner_branch_id, "branch_id must match winner"

    # cleanup
    db.query(type(s)).filter_by(id=s.id).delete()
    db.delete(u)
    db.delete(b1); db.delete(b2)
    for c in courses: db.delete(c)
    db.commit(); db.close()

# GROUP 3: Capacity Row Lock
@pytest.mark.skip(reason="Pending implementation")
def test_concurrency_capacity_lock():
    """Capacity is 1. Two parallel bookings from different students (winner and loser). Exactly one 201, one 409. Slot's selection count is exactly 1."""
    pass

# GROUP 4: Overlapping Slots & GIST Exclusion
@pytest.mark.skip(reason="Pending implementation")
def test_concurrency_overlapping_slots():
    """
    - Adjacent slots [) accepted.
    - Two different students book the same overlapping slots: Both succeed (exclusion is per student).
    - Same student books two overlapping slots in parallel: exactly one 201, one 409.
    """
    pass

# GROUP 5: Null End Time
@pytest.mark.skip(reason="Pending implementation")
def test_concurrency_null_end_time():
    """10:00 with null end conflicts with 10:30-11:30 (409), and does not conflict with 11:00-12:00 (201)."""
    pass

# GROUP 6: Submit Lock & Unlock Races
@pytest.mark.skip(reason="Pending implementation")
def test_concurrency_submit_lock():
    """
    - Double-click submit: One 201 success, one 409 conflict.
    - Double-click unlock re-submit: One unlock exists. Two parallel re-submits: one 201, one 409.
    - Two parallel duplicate pending requests of the same type: one 201, one 409.
    - Once the first pending request is approved/rejected, a new request of that type is allowed (tests partial index).
    """
    pass

# GROUP 7: Admin Edits & Slot Deletes
@pytest.mark.skip(reason="Pending implementation")
def test_concurrency_admin_edit_after_lock():
    """Admin edit after datesheet is locked returns 423 Locked."""
    pass

@pytest.mark.skip(reason="Pending implementation")
def test_concurrency_admin_edit_with_unlock():
    """Admin edits a course assignment when the sheet is locked but an active 'change_datesheet' unlock exists. Succeeds exactly once."""
    pass

@pytest.mark.skip(reason="Pending implementation")
def test_concurrency_slot_delete_with_selection():
    """A slot delete with an active student selection returns 409. Cancel endpoint still succeeds and notifies."""
    pass

from fastapi.testclient import TestClient

def test_student_gets_403_on_admin(client: TestClient, student_token: str):
    response = client.get("/api/v1/admin/branches", headers={"Authorization": f"Bearer {student_token}"})
    assert response.status_code == 403

def test_admin_gets_200_on_admin(client: TestClient, admin_token: str):
    response = client.get("/api/v1/admin/branches", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200

def test_create_branch_unique_code(client: TestClient, admin_token: str):
    # Create first
    res1 = client.post("/api/v1/admin/branches", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "name": "Test", "code": "TST-01", "city": "Test", "address": "Test", "contact_number": "12345"
    })
    assert res1.status_code == 200
    
    # Create second with same code
    res2 = client.post("/api/v1/admin/branches", headers={"Authorization": f"Bearer {admin_token}"}, json={
        "name": "Test 2", "code": "TST-01", "city": "Test", "address": "Test", "contact_number": "12345"
    })
    assert res2.status_code == 409

def test_branch_pagination(client: TestClient, admin_token: str):
    for i in range(15):
        client.post("/api/v1/admin/branches", headers={"Authorization": f"Bearer {admin_token}"}, json={
            "name": f"Pagin Test {i}", "code": f"PAG-{i}", "city": "City", "address": "Address", "contact_number": "123"
        })
        
    res = client.get("/api/v1/admin/branches?page=1&page_size=10", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 10
    assert data["total"] >= 15
    assert data["page"] == 1
    assert data["page_size"] == 10
    
    res_search = client.get("/api/v1/admin/branches?q=Pagin Test 1&page=1&page_size=10", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_search.status_code == 200
    # Should match "Pagin Test 1", "Pagin Test 10", "11", "12", "13", "14" -> 6 matches
    assert res_search.json()["total"] == 6

def test_delete_student_with_locked_datesheet(client: TestClient, admin_token: str, db_session):
    from app.models.students import Student
    from app.models.users import User, RoleEnum
    import uuid
    from datetime import date
    
    user = User(email=f"deltest_{uuid.uuid4()}@test.com", role=RoleEnum.student)
    db_session.add(user)
    db_session.flush()
    student = Student(
        user_id=user.id, full_name="Del Test", email=user.email, phone="123", cnic_or_bform=str(uuid.uuid4()),
        date_of_birth=date(2000, 1, 1), gender="male", address="123",
        father_or_guardian_name="123", guardian_cnic="123", guardian_occupation="123",
        guardian_contact="123", emergency_contact="123",
        registration_no=f"REG-{uuid.uuid4()}", program="CS", semester=1, session_batch="2026",
        previous_qualification="FSc", previous_institute="123", marks_or_cgpa=80,
        datesheet_locked=True
    )
    db_session.add(student)
    db_session.commit()
    
    res = client.delete(f"/api/v1/admin/students/{student.id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 409
    assert res.json()["detail"] == "Cannot delete a student with a saved date sheet"

def test_delete_course_with_slots(client: TestClient, admin_token: str, db_session):
    from app.models.courses import Course
    from app.models.exam_slots import ExamSlot
    from datetime import date, time
    import uuid
    
    course = Course(code=f"C-{uuid.uuid4()}", title="Test", credit_hours=3, department="CS")
    db_session.add(course)
    db_session.flush()
    
    slot = ExamSlot(course_id=course.id, exam_date=date(2026,1,1), start_time=time(9,0), capacity=50)
    db_session.add(slot)
    db_session.commit()
    
    res = client.delete(f"/api/v1/admin/courses/{course.id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 409
    assert "Cannot delete course with exam slots" in res.json()["detail"]

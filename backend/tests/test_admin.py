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

from fastapi.testclient import TestClient

def test_login_success(client: TestClient, test_admin):
    response = client.post("/api/v1/auth/login", json={"email": "testadmin@examslot.test", "password": "Admin123!"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert response.cookies.get("refresh_token") is not None

def test_login_failure(client: TestClient, test_admin):
    response = client.post("/api/v1/auth/login", json={"email": "testadmin@examslot.test", "password": "WrongPassword!"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_refresh_token(client: TestClient, test_admin):
    response = client.post("/api/v1/auth/login", json={"email": "testadmin@examslot.test", "password": "Admin123!"})
    assert response.status_code == 200
    
    response2 = client.post("/api/v1/auth/refresh")
    assert response2.status_code == 200
    assert "access_token" in response2.json()

def test_logout(client: TestClient, test_admin):
    response = client.post("/api/v1/auth/login", json={"email": "testadmin@examslot.test", "password": "Admin123!"})
    
    response2 = client.post("/api/v1/auth/logout")
    assert response2.status_code == 200
    # Next refresh should fail
    response3 = client.post("/api/v1/auth/refresh")
    assert response3.status_code == 401

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

def test_rate_limit_spoof(client: TestClient):
    # Make 5 failed login attempts
    for _ in range(5):
        res = client.post("/api/v1/auth/login", json={"email": "wrong", "password": "wrong"})
        assert res.status_code == 401
    
    # 6th attempt should be 429
    res = client.post("/api/v1/auth/login", json={"email": "wrong", "password": "wrong"})
    assert res.status_code == 429
    
    # 7th attempt with spoofed X-Forwarded-For should ALSO be 429
    res = client.post("/api/v1/auth/login", json={"email": "wrong", "password": "wrong"}, headers={"X-Forwarded-For": "1.2.3.4"})
    assert res.status_code == 429

def test_forgot_password_timing_byte_identical(client: TestClient, test_admin):
    # Existing user
    res1 = client.post("/api/v1/auth/forgot-password", json={"email": "testadmin@examslot.test"})
    assert res1.status_code == 200
    
    # Non-existent user
    res2 = client.post("/api/v1/auth/forgot-password", json={"email": "nobody@examslot.test"})
    assert res2.status_code == 200
    
    # Assert byte-identical response bodies
    assert res1.content == res2.content

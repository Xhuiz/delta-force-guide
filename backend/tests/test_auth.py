import pytest


@pytest.mark.asyncio
async def test_register(client):
    response = await client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post("/api/auth/register", json={
        "username": "user1",
        "email": "dup@example.com",
        "password": "pass123"
    })
    response = await client.post("/api/auth/register", json={
        "username": "user2",
        "email": "dup@example.com",
        "password": "pass456"
    })
    assert response.status_code in [400, 409, 422]


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "mypassword"
    })
    response = await client.post("/api/auth/login", json={
        "email": "login@example.com",
        "password": "mypassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "username": "wrongpass",
        "email": "wrong@example.com",
        "password": "correct"
    })
    response = await client.post("/api/auth/login", json={
        "email": "wrong@example.com",
        "password": "wrong"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client):
    reg = await client.post("/api/auth/register", json={
        "username": "meuser",
        "email": "me@example.com",
        "password": "pass123"
    })
    token = reg.json()["access_token"]
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["username"] == "meuser"


@pytest.mark.asyncio
async def test_get_me_no_token(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 403

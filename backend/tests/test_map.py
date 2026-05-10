import pytest


@pytest.mark.asyncio
async def test_list_maps_empty(client):
    response = await client.get("/api/maps")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_point_requires_admin(client):
    reg = await client.post("/api/auth/register", json={"username": "normal", "email": "normal@example.com", "password": "pass123"})
    token = reg.json()["access_token"]
    response = await client.post("/api/maps/1/points", json={"map_id": 1, "name": "test", "category": "spawn", "lng": 100.0, "lat": 50.0}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_points_empty(client):
    response = await client.get("/api/maps/1/points")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert data["features"] == []

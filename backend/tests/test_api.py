from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_without_database_credentials():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_api_route_is_not_a_frontend_page():
    assert client.get("/api/members").status_code == 404

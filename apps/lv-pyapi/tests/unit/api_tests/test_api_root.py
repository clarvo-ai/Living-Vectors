from fastapi.testclient import TestClient
from main import app


def test_hello_endpoint_returns_message():
    client = TestClient(app)
    res = client.get("/")
    assert res.status_code == 200
    assert "message" in res.json()


def test_health_endpoint_returns_healthy_status():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "lv-pyapi"}

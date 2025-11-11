from fastapi.testclient import TestClient
from main import app

def test_health_endpoint_returns_healthy_status():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "lv-pyapi"}

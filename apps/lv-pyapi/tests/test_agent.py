from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_agent_endpoint():
    """Test agent endpoint with OpenAI Agents SDK"""
    response = client.post("/api/agent", json={"prompt": "Say hello"})
    data = response.json()
    assert response.status_code == 200
    assert data["status"] == 200
    assert len(data["message"]) > 0
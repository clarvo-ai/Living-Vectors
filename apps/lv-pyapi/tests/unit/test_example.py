"""Basic API endpoint tests (no mocks)."""
import sys
from unittest.mock import MagicMock

# Mock LiveKit so main/agent can be imported when livekit-agents is missing or structure differs (e.g. in CI)
sys.modules["livekit"] = MagicMock()
sys.modules["livekit.agents"] = MagicMock()
sys.modules["livekit.agents.voice"] = MagicMock()
mock_room_io = MagicMock()
mock_room_io.RoomOptions = MagicMock()
mock_room_io.AudioInputOptions = MagicMock()
sys.modules["livekit.agents.voice.room_io"] = mock_room_io
sys.modules["livekit.plugins"] = MagicMock()
sys.modules["livekit.plugins.google"] = MagicMock()

from fastapi.testclient import TestClient
from main import app


def test_hello_returns_message():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "Hello" in data["message"]


def test_health_endpoint_returns_healthy_status():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "lv-pyapi"}

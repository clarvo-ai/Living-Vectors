"""Tests for GET /users/{user_id} with mocked database."""
from unittest.mock import MagicMock
import uuid
from fastapi.testclient import TestClient
from main import app
from tests.conftest import with_db_override


def _make_mock_user(user_id: str, email: str = "test@example.com", name: str = "Test User"):
    user = MagicMock()
    user.id = uuid.UUID(user_id)
    user.email = email
    user.name = name
    return user


def test_get_user_returns_200_when_user_exists():
    user_id = str(uuid.uuid4())
    mock_user = _make_mock_user(user_id, "jane@example.com", "Jane Doe")
    db = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = mock_user
    db.execute.return_value = result

    with with_db_override(db):
        client = TestClient(app)
        response = client.get(f"/users/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id
        assert data["email"] == "jane@example.com"
        assert data["name"] == "Jane Doe"


def test_get_user_returns_404_when_user_not_found():
    user_id = str(uuid.uuid4())
    db = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute.return_value = result

    with with_db_override(db):
        client = TestClient(app)
        response = client.get(f"/users/{user_id}")
        assert response.status_code == 404
        assert response.json()["detail"] == "User not found"

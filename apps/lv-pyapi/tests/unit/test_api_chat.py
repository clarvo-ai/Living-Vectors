"""Tests for POST /api/chat/start and /api/chat/answer with mocked Gemini."""
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app

from tests.conftest import with_db_override


def _mock_gemini_response(text: str = "Mocked AI response"):
    response = MagicMock()
    response.text = text
    return response


def test_chat_start_returns_200_and_structure():
    expected_message = "Hello! I'm your career assistant. First question: What matters to you?"
    with patch("main.client.models.generate_content") as mock_generate_content:
        mock_generate_content.return_value = _mock_gemini_response(expected_message)
        client = TestClient(app)
        response = client.post("/api/chat/start")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "goalCategory" in data
        assert "questionId" in data
        assert data["questionId"] == {"goalIndex": 0, "questionIndex": 0}
        assert data["message"] == expected_message


def test_chat_start_returns_fallback_when_gemini_raises():
    with patch("main.client.models.generate_content") as mock_generate_content:
        mock_generate_content.side_effect = Exception("API error")
        client = TestClient(app)
        response = client.post("/api/chat/start")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "questionId" in data
        assert data["questionId"] == {"goalIndex": 0, "questionIndex": 0}


def test_chat_answer_returns_200_with_mocked_gemini():
    db = MagicMock()
    with with_db_override(db):
        with patch("main.client.models.generate_content") as mock_generate_content:
            mock_generate_content.return_value = _mock_gemini_response("That's great! Next: what skills do you enjoy using?")
            client = TestClient(app)
            response = client.post(
                "/api/chat/answer",
                json={
                    "userAnswer": "I want to help people.",
                    "questionId": {"goalIndex": 0, "questionIndex": 0},
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "nextQuestionId" in data
            assert "completed" in data


def test_chat_answer_with_user_id_succeeds():
    db = MagicMock()
    with with_db_override(db):
        with patch("main.client.models.generate_content") as mock_generate_content:
            mock_generate_content.return_value = _mock_gemini_response("Thanks for sharing.")
            client = TestClient(app)
            response = client.post(
                "/api/chat/answer",
                json={
                    "userId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
                    "userAnswer": "I like coding.",
                    "questionId": {"goalIndex": 0, "questionIndex": 0},
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "nextQuestionId" in data
            assert "completed" in data


def test_chat_answer_returns_422_when_body_invalid():
    client = TestClient(app)
    response = client.post("/api/chat/answer", json={})
    assert response.status_code == 422


def test_chat_answer_returns_422_when_question_id_missing():
    client = TestClient(app)
    response = client.post(
        "/api/chat/answer",
        json={"userAnswer": "Yes"},
    )
    assert response.status_code == 422


def test_chat_answer_returns_500_when_gemini_raises():
    db = MagicMock()
    with with_db_override(db):
        with patch("main.client.models.generate_content") as mock_generate_content:
            mock_generate_content.side_effect = Exception("Gemini error")
            client = TestClient(app)
            response = client.post(
                "/api/chat/answer",
                json={
                    "userAnswer": "test",
                    "questionId": {"goalIndex": 0, "questionIndex": 0},
                },
            )
            assert response.status_code == 500
            data = response.json()
            assert "message" in data

from typing import Any


import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

REPO_ROOT: Path = PROJECT_ROOT.parents[1]
PYUTILS_SRC: Path = REPO_ROOT / "packages" / "python-utils" / "src"
if str(PYUTILS_SRC) not in sys.path:
    sys.path.append(str(PYUTILS_SRC))

os.environ.setdefault(key="DATABASE_URL", value="sqlite:///dummy.db")

import main


class StubModels:
    """Capture prompt/model arguments and return deterministic text."""

    def __init__(self, calls, response_text) -> None:
        self._calls = calls
        self._response_text = response_text

    def generate_content(self, model, contents) -> SimpleNamespace:
        self._calls.append({"model": model, "contents": contents})
        return SimpleNamespace(text=self._response_text)


class StubClient:
    """Thin wrapper matching the structure used in main.client."""

    def __init__(self, calls, response_text="AI response") -> None:
        self.models: StubModels = StubModels(calls, response_text)


@pytest.fixture()
def api_client() -> Any:
    return TestClient(main.app)


def test_interview_chat_returns_ai_message(monkeypatch, api_client) -> None:
    calls: list[Any] = []
    monkeypatch.setattr(main, "client", StubClient(calls, response_text="Career advice"))

    payload: dict[str, Any] = {
        "message": "I'm exploring new career directions.",
        "conversation_history": [],
    }

    response: Any = api_client.post("/api/interview/chat", json=payload)
    data: Any = response.json()

    assert response.status_code == 200
    assert data["role"] == "ai"
    assert data["content"] == "Career advice"
    assert calls[0]["model"] == "gemini-2.5-flash"
    assert "User: I'm exploring new career directions." in calls[0]["contents"]
    assert "Build Trust & Explore Current Motivation" in calls[0]["contents"]


def test_interview_chat_includes_conversation_history(monkeypatch, api_client) -> None:
    calls: list[Any] = []
    monkeypatch.setattr(main, "client", StubClient(calls))

    payload: dict[str, Any] = {
        "message": "I'd like to know my next step.",
        "conversation_history": [
            {"role": "user", "content": "Hi there"},
            {"role": "ai", "content": "Hello!"},
        ],
    }

    response: Any = api_client.post("/api/interview/chat", json=payload)

    assert response.status_code == 200
    prompt = calls[0]["contents"]
    assert "Conversation so far" in prompt
    assert "User: Hi there" in prompt
    assert "Assistant: Hello!" in prompt
    assert "User: I'd like to know my next step." in prompt


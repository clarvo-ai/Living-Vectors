import uuid
from unittest.mock import MagicMock, patch

from helper import update_completed_tasks, fetch_completed_tasks, fetch_user_insights


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user_id() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# update_completed_tasks
# ---------------------------------------------------------------------------

class TestUpdateCompletedTasks:
    """Tests for helper.update_completed_tasks"""

    def test_posts_to_backend_endpoint(self):
        """Happy path: POSTs task completion to the backend endpoint."""
        user_id = _make_user_id()
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        with patch("helper.requests.post", return_value=mock_response) as mock_post:
            update_completed_tasks(user_id, "opening")

        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert f"/internal/users/{user_id}/completed-tasks" in call_args[0][0]
        assert call_args[1]["json"] == {"task_id": "opening"}
        assert call_args[1]["headers"] == {"x-internal-secret": ""}
        mock_response.raise_for_status.assert_called_once()

    def test_handles_request_error(self):
        """If the request fails, logs error and continues (no raise)."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception("Connection refused")

        with patch("helper.requests.post", return_value=mock_response):
            # Should not raise
            update_completed_tasks(_make_user_id(), "logistics")

    def test_all_task_ids_are_posted(self):
        """Each discovery task ID can be posted without error."""
        task_ids = ["opening", "logistics", "industry", "location",
                    "background", "culture", "value_vision", "alignment"]
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        for task_id in task_ids:
            with patch("helper.requests.post", return_value=mock_response) as mock_post:
                update_completed_tasks(_make_user_id(), task_id)
            call_args = mock_post.call_args
            assert call_args[1]["json"] == {"task_id": task_id}


# ---------------------------------------------------------------------------
# fetch_completed_tasks
# ---------------------------------------------------------------------------

class TestFetchCompletedTasks:
    """Tests for helper.fetch_completed_tasks"""

    def test_returns_task_ids_from_backend(self):
        """Returns a list of taskId strings from the backend response."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"completed_tasks": ["opening", "logistics"]}

        with patch("helper.requests.get", return_value=mock_response) as mock_get:
            result = fetch_completed_tasks(_make_user_id())

        assert result == ["opening", "logistics"]
        mock_get.assert_called_once()

    def test_returns_empty_list_when_no_tasks(self):
        """Returns [] when the backend returns empty list."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"completed_tasks": []}

        with patch("helper.requests.get", return_value=mock_response):
            result = fetch_completed_tasks(_make_user_id())

        assert result == []

    def test_returns_empty_list_on_request_error(self):
        """Returns [] instead of raising when the backend call fails."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception("connection refused")

        with patch("helper.requests.get", return_value=mock_response):
            result = fetch_completed_tasks(_make_user_id())

        assert result == []

    def test_returns_empty_list_when_key_missing(self):
        """Returns [] when 'completed_tasks' key is missing from response."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {}

        with patch("helper.requests.get", return_value=mock_response):
            result = fetch_completed_tasks(_make_user_id())

        assert result == []


# ---------------------------------------------------------------------------
# fetch_user_insights
# ---------------------------------------------------------------------------

class TestFetchUserInsights:
    """Tests for helper.fetch_user_insights"""

    def test_returns_insights_from_backend(self):
        """Returns a list of insight strings from the backend response."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"insights": ["Likes remote work", "Targeting fintech"]}

        with patch("helper.requests.get", return_value=mock_response) as mock_get:
            result = fetch_user_insights(_make_user_id())

        assert result == ["Likes remote work", "Targeting fintech"]
        mock_get.assert_called_once()

    def test_returns_empty_list_when_no_insights(self):
        """Returns [] when the backend returns empty list."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"insights": []}

        with patch("helper.requests.get", return_value=mock_response):
            result = fetch_user_insights(_make_user_id())

        assert result == []

    def test_returns_empty_list_on_request_error(self):
        """Returns [] instead of raising when the backend call fails."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception("timeout")

        with patch("helper.requests.get", return_value=mock_response):
            result = fetch_user_insights(_make_user_id())

        assert result == []

    def test_returns_empty_list_when_key_missing(self):
        """Returns [] when 'insights' key is missing from response."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {}

        with patch("helper.requests.get", return_value=mock_response):
            result = fetch_user_insights(_make_user_id())

        assert result == []

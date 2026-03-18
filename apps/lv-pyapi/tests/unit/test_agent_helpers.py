import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

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

    def test_adds_record_to_db(self):
        """Happy path: a CompletedTask row is added and committed."""
        user_id = _make_user_id()
        mock_db = MagicMock()

        with patch("helper.SessionLocal", return_value=mock_db):
            update_completed_tasks(user_id, "opening")

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert str(added.userId) == user_id
        assert added.taskId == "opening"
        assert isinstance(added.completedAt, datetime)
        mock_db.commit.assert_called_once()
        mock_db.close.assert_called_once()

    def test_rollback_on_db_error(self):
        """If commit raises, the session is rolled back and closed."""
        mock_db = MagicMock()
        mock_db.commit.side_effect = Exception("DB is down")

        with patch("helper.SessionLocal", return_value=mock_db):
            update_completed_tasks(_make_user_id(), "logistics")

        mock_db.rollback.assert_called_once()
        mock_db.close.assert_called_once()

    def test_all_task_ids_are_accepted(self):
        """Each discovery task ID can be stored without error."""
        task_ids = ["opening", "logistics", "industry", "location",
                    "background", "culture", "value_vision", "alignment"]
        for task_id in task_ids:
            mock_db = MagicMock()
            with patch("helper.SessionLocal", return_value=mock_db):
                update_completed_tasks(_make_user_id(), task_id)
            added = mock_db.add.call_args[0][0]
            assert added.taskId == task_id


# ---------------------------------------------------------------------------
# fetch_completed_tasks
# ---------------------------------------------------------------------------

class TestFetchCompletedTasks:
    """Tests for helper.fetch_completed_tasks"""

    def test_returns_task_ids(self):
        """Returns a list of taskId strings from the DB rows."""
        mock_db = MagicMock()
        row1, row2 = MagicMock(taskId="opening"), MagicMock(taskId="logistics")
        mock_db.execute.return_value.all.return_value = [row1, row2]

        with patch("helper.SessionLocal", return_value=mock_db):
            result = fetch_completed_tasks(_make_user_id())

        assert result == ["opening", "logistics"]
        mock_db.close.assert_called_once()

    def test_returns_empty_list_when_no_rows(self):
        """Returns [] when the user has no completed tasks."""
        mock_db = MagicMock()
        mock_db.execute.return_value.all.return_value = []

        with patch("helper.SessionLocal", return_value=mock_db):
            result = fetch_completed_tasks(_make_user_id())

        assert result == []

    def test_returns_empty_list_on_db_error(self):
        """Returns [] instead of raising when the DB call fails."""
        mock_db = MagicMock()
        mock_db.execute.side_effect = Exception("connection refused")

        with patch("helper.SessionLocal", return_value=mock_db):
            result = fetch_completed_tasks(_make_user_id())

        assert result == []
        mock_db.close.assert_called_once()


# ---------------------------------------------------------------------------
# fetch_user_insights
# ---------------------------------------------------------------------------

class TestFetchUserInsights:
    """Tests for helper.fetch_user_insights"""

    def test_returns_summaries(self):
        """Returns a list of summary strings ordered by createdAt."""
        mock_db = MagicMock()
        row1 = MagicMock(summary="Likes remote work")
        row2 = MagicMock(summary="Targeting fintech")
        mock_db.execute.return_value.all.return_value = [row1, row2]

        with patch("helper.SessionLocal", return_value=mock_db):
            result = fetch_user_insights(_make_user_id())

        assert result == ["Likes remote work", "Targeting fintech"]
        mock_db.close.assert_called_once()

    def test_returns_empty_list_when_no_insights(self):
        """Returns [] when the user has no Learning rows."""
        mock_db = MagicMock()
        mock_db.execute.return_value.all.return_value = []

        with patch("helper.SessionLocal", return_value=mock_db):
            result = fetch_user_insights(_make_user_id())

        assert result == []

    def test_returns_empty_list_on_db_error(self):
        """Returns [] instead of raising when the DB call fails."""
        mock_db = MagicMock()
        mock_db.execute.side_effect = Exception("timeout")

        with patch("helper.SessionLocal", return_value=mock_db):
            result = fetch_user_insights(_make_user_id())

        assert result == []
        mock_db.close.assert_called_once()

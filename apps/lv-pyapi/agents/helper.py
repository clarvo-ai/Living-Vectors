import logging
import os
from typing import List
import requests

logger = logging.getLogger("career-agent")

BACKEND_URL = os.getenv("BACKEND_URL", "http://lv-pyapi:8080")
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "")


def update_completed_tasks(user_id: str, task_id: str) -> None:
    """Mark a task as completed by calling the backend API."""
    try:
        response = requests.post(
            f"{BACKEND_URL}/internal/users/{user_id}/completed-tasks",
            json={"task_id": task_id},
            headers={"x-internal-secret": INTERNAL_API_SECRET},
            timeout=10,
        )
        response.raise_for_status()
        logger.info(f"Marked task {task_id} as completed for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to update completed tasks for user {user_id}: {e}")


def fetch_completed_tasks(user_id: str) -> List[str]:
    """Fetch list of completed task IDs from the backend API."""
    try:
        response = requests.get(
            f"{BACKEND_URL}/internal/users/{user_id}/completed-tasks",
            headers={"x-internal-secret": INTERNAL_API_SECRET},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("completed_tasks", [])
    except Exception as e:
        logger.error(f"Failed to fetch completed tasks for user {user_id}: {e}")
        return []


def fetch_user_insights(user_id: str) -> List[str]:
    """Fetch user learnings/insights from the backend API."""
    try:
        response = requests.get(
            f"{BACKEND_URL}/internal/users/{user_id}/insights",
            headers={"x-internal-secret": INTERNAL_API_SECRET},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("insights", [])
    except Exception as e:
        logger.error(f"Failed to fetch user insights for user {user_id}: {e}")
        return []

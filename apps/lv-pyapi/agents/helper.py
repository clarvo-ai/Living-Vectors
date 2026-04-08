import logging
from datetime import datetime
from typing import List

from sqlalchemy import select

from database import SessionLocal
from python_utils.sqlalchemy_models import CompletedTask, Learning

logger = logging.getLogger("career-agent")


def update_completed_tasks(user_id: str, task_id: str) -> None:
    db = None
    try:
        db = SessionLocal()
        db.add(CompletedTask(userId=user_id, taskId=task_id, completedAt=datetime.now()))
        db.commit()
    except Exception as e:
        logger.error(f"Failed to update completed tasks for user {user_id}: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()


def fetch_completed_tasks(user_id: str) -> List[str]:
    try:
        db = SessionLocal()
        rows = db.execute(
            select(CompletedTask.taskId)
            .where(CompletedTask.userId == user_id)
        ).all()
        return [row.taskId for row in rows]
    except Exception as e:
        logger.error(f"Failed to fetch completed tasks for user {user_id}: {e}")
        return []
    finally:
        db.close()


def fetch_user_insights(user_id: str) -> List[str]:
    try:
        db = SessionLocal()
        rows = db.execute(
            select(Learning.id, Learning.summary)
            .where(Learning.userId == user_id)
            .order_by(Learning.createdAt)
        ).all()
        return [row.summary for row in rows]
    except Exception as e:
        logger.error(f"Failed to fetch user insights for user {user_id}: {e}")
        return []
    finally:
        db.close()

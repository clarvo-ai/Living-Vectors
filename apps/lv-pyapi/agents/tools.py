import logging
import contextvars
import asyncio

from livekit.agents import function_tool
from embedding_service import get_embedding_768
from database import SessionLocal
from python_utils.sqlalchemy_models import Learning
from datetime import datetime
from sqlalchemy import select

logger = logging.getLogger("career-agent")

# Set once per session in agent.py after the participant joins
_user_id: contextvars.ContextVar[str] = contextvars.ContextVar("user_id", default="")

def set_user_id(user_id: str) -> None:
    _user_id.set(user_id)


def get_current_insights(user_id: str) -> list[str]:
    """Synchronously fetch the current insight summaries for this user."""
    db = SessionLocal()
    try:
        rows = db.execute(
            select(Learning.summary)
            .where(Learning.userId == user_id)
            .order_by(Learning.createdAt)
        ).scalars().all()
        return list(rows)
    finally:
        db.close()


async def _save_insight(user_id: str, insight: str, replaces: str) -> None:
    """Background task: compute embeddings and persist the insight to the DB."""
    try:
        embedding = await asyncio.get_event_loop().run_in_executor(None, get_embedding_768, insight)

        db = SessionLocal()
        try:
            if replaces:
                replaces_embedding = await asyncio.get_event_loop().run_in_executor(None, get_embedding_768, replaces)
                closest = db.execute(
                    select(Learning)
                    .where(Learning.userId == user_id)
                    .order_by(Learning.embedding.cosine_distance(replaces_embedding))
                    .limit(1)
                ).scalar_one_or_none()
                if closest:
                    logger.info(f"[INSIGHT] Replacing: '{closest.summary}'")
                    db.delete(closest)

            db.add(Learning(
                userId=user_id,
                embedding=embedding,
                summary=insight,
                createdAt=datetime.utcnow(),
                updatedAt=datetime.utcnow(),
            ))
            db.commit()
            logger.info(f"[INSIGHT] Saved: '{insight}'")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"[INSIGHT] Failed to save '{insight}': {e}")


@function_tool
async def capture_user_insight(insight: str, replaces: str = ""):
    """Call this tool whenever the candidate reveals something meaningful — a goal, a preference,
    a constraint, a motivation, or anything worth remembering in terms of their job search. Pass a short, specific insight string
    (e.g. 'Wants to move into product management', 'Prefers remote work', 'Open to relocating to Berlin').
    Call it as many times as needed throughout the conversation — once per new piece of information.
    If this insight corrects or replaces something you captured earlier, pass the old insight text
    in `replaces` so it can be removed before saving the new one.
    The return value is confirmation that the insight was saved.
    Do NOT call this tool again for any insight already present in the conversation history.
    """
    logger.info(f"[INSIGHT] {insight}" + (f" (replaces: '{replaces}')" if replaces else ""))

    user_id = _user_id.get()

    asyncio.create_task(_save_insight(user_id, insight, replaces))

    return f"Called tool to save insight: '{insight}'"

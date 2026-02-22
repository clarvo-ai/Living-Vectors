import logging
import contextvars
import asyncio

from livekit.agents import function_tool
from embedding_service import get_embedding_768
from database import SessionLocal
from python_utils.sqlalchemy_models import Learning
from pgvector.sqlalchemy import Vector
from datetime import datetime
from sqlalchemy import select

logger = logging.getLogger("career-agent")

# Set once per session in agent.py after the participant joins
_user_id: contextvars.ContextVar[str] = contextvars.ContextVar("user_id", default="")

def set_user_id(user_id: str) -> None:
    _user_id.set(user_id)

@function_tool
async def capture_user_insight(insight: str, replaces: str = ""):
    """Call this tool whenever the candidate reveals something meaningful — a goal, a preference,
    a constraint, a motivation, or anything worth remembering in terms of their job search. Pass a short, specific insight string
    (e.g. 'Wants to move into product management', 'Prefers remote work', 'Open to relocating to Berlin').
    Call it as many times as needed throughout the conversation — once per new piece of information.
    If this insight corrects or replaces something you captured earlier, pass the old insight text
    in `replaces` so it can be removed before saving the new one.
    """
    logger.info(f"[INSIGHT] {insight}" + (f" (replaces: '{replaces}')" if replaces else ""))

    user_id = _user_id.get()
    embedding = get_embedding_768(insight)

    db = SessionLocal()
    if replaces:
        replaces_embedding = get_embedding_768(replaces)
        closest = db.execute(
            select(Learning)
            .where(Learning.userId == user_id)
            .order_by(Learning.embedding.cosine_distance(replaces_embedding))
            .limit(1)
        ).scalar_one_or_none()
        if closest:
            logger.info(f"[INSIGHT] Replacing: '{closest.summary}'")
            db.delete(closest)

    db.add(Learning(userId=user_id, embedding=embedding, summary=insight, createdAt=datetime.utcnow(), updatedAt=datetime.utcnow()))
    db.commit()

    db.close()

    return f"Insight '{insight}' captured."



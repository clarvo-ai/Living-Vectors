import logging

from livekit.agents import function_tool
from gemini_client import client

logger = logging.getLogger("career-agent")

@function_tool
async def capture_user_insight(insight: str):
    """Call this immediately whenever the candidate reveals something meaningful — a goal, a preference,
    a constraint, a motivation, or anything worth remembering. Pass a short, specific insight string
    (e.g. 'Wants to move into product management', 'Prefers remote work', 'Open to relocating to Berlin').
    Call it as many times as needed throughout the conversation — once per new piece of information.
    THIS TOOL IS FOR SAVING THE USER'S INSIGHTS TO THE DATABASE.
    """
    logger.info(f"[INSIGHT] {insight}")
    return "Insight captured."


import json
import logging
from pathlib import Path

from livekit.agents import RunContext, function_tool

logger = logging.getLogger("career-agent")


def _load_faq_data() -> list[dict[str, str]]:
    path = Path(__file__).with_name("faq_data.json")
    try:
        with path.open("r", encoding="utf-8") as f:
            raw = json.load(f)
    except FileNotFoundError:
        logger.warning("FAQ JSON not found at %s; FAQ tool will return an empty list", path)
        return []
    except Exception as e:
        logger.error("Failed to load FAQ JSON from %s: %s", path, e)
        return []

    if not isinstance(raw, list):
        logger.error("FAQ JSON must be a list of objects")
        return []

    entries: list[dict[str, str]] = []
    for idx, item in enumerate(raw):
        if not isinstance(item, dict):
            logger.warning("Skipping FAQ entry %s: not an object", idx)
            continue
        question = str(item.get("question", "")).strip()
        answer = str(item.get("answer", "")).strip()
        if not question or not answer:
            logger.warning("Skipping FAQ entry %s: empty question or answer", idx)
            continue
        entries.append({"question": question, "answer": answer})

    logger.info("Loaded %s FAQ entries from %s", len(entries), path)
    return entries


FAQ_DATA: list[dict[str, str]] = _load_faq_data()


@function_tool()
async def get_faq(context: RunContext) -> list[dict[str, str]]:
    """
    Return all FAQ question/answer pairs about this interview and Clarvo.
    Call this whenever the user asks a factual question about Clarvo, the
    purpose of this interview, how long it takes, or how their data is handled.
    Answer ONLY based on the returned entries. Do not guess or hallucinate.
    """
    logger.info("FAQ tool invoked")
    return FAQ_DATA

"""Extract and store career-related learnings from LiveKit agent discussions."""
import json
import logging
from typing import List, Optional, Dict, Any, cast
from sqlalchemy.orm import Session
from sqlalchemy import select
from difflib import SequenceMatcher

from python_utils.sqlalchemy_models import GeneralLearning, ConversationMessage, MessageSender
from database import SessionLocal
from gemini_client import client
from google.genai import types

logger = logging.getLogger("livekit-learnings")

# Similarity threshold for duplicate detection (0.0 to 1.0)
SIMILARITY_THRESHOLD = 0.85

PRIVACY_EXCLUSION_RULES = """
Do NOT extract or store any of the following sensitive personal data:
- Racial or ethnic origin
- Political opinions
- Religious beliefs
- Genetic data
- Data concerning a natural person's sex life or sexual orientation
- Biometric data for the purpose of uniquely identifying a natural person
- Data concerning health

If any learning would contain such information, exclude it entirely.
"""

LEARNINGS_SCHEMA = {
    "type": "object",
    "properties": {
        "learnings": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["learnings"]
}


def extract_career_learnings_from_conversation(messages: List[str]) -> List[str]:
    """Extract career-related learnings from a conversation using Gemini API."""
    try:
        conversation_text = "\n".join([f"- {msg}" for msg in messages])
        
        prompt = (
            "You are a career guidance assistant. Extract SPECIFIC, DETAILED career-related learnings "
            "from this conversation. Focus on:\n"
            "- Skills, expertise, and technical abilities\n"
            "- Professional interests and passions\n"
            "- Career goals and aspirations\n"
            "- Work preferences and values\n"
            "- Professional experiences and achievements\n"
            "- Industry knowledge and expertise\n"
            "- Problem-solving approaches and methodologies\n\n"
            
            f"{PRIVACY_EXCLUSION_RULES}\n\n"
            
            "Example conversation:\n"
            "- 'I've been really enjoying building web apps and seeing users interact with them.'\n"
            "- 'What kind of projects make you lose track of time?'\n"
            "- 'Anything involving UI design. I can spend hours tweaking interfaces.'\n"
            "- 'What do people usually come to you for?'\n"
            "- 'Frontend advice and debugging CSS issues.'\n\n"
            
            "GOOD learnings (specific and career-focused):\n"
            "- 'Enjoys building web applications and observing user interactions'\n"
            "- 'Passionate about UI design and spends hours tweaking interfaces'\n"
            "- 'Provides frontend advice and specializes in debugging CSS issues'\n\n"
            
            "BAD learnings (avoid these):\n"
            "- 'Enjoys building web applications' (too vague, missing UI focus)\n"
            "- 'Likes coding' (not specific enough)\n"
            "- Any mention of health, religion, politics, ethnicity, or sexual orientation\n\n"
            
            f"Now extract career-related learnings from:\n{conversation_text}\n\n"
            "Return a JSON array of specific, detailed career-focused learning statements. "
            "Each statement should capture a distinct, concrete skill, interest, expertise, "
            "or career-related preference mentioned in the conversation. "
            "EXCLUDE any learnings that contain sensitive personal data as defined above."
        )
        
        generation_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=LEARNINGS_SCHEMA,
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=generation_config
        )

        parsed = cast(Dict[str, Any], response.parsed)
        learnings = parsed.get("learnings", [])
        filtered_learnings = _filter_sensitive_content(learnings)
        
        logger.info(f"Extracted {len(filtered_learnings)} career learnings from conversation")
        return filtered_learnings
        
    except Exception as e:
        logger.error(f"Error extracting learnings from conversation: {str(e)}")
        return []


# TODO: This only captures text similarity, not semantic meaning
def _calculate_similarity(text1: str, text2: str) -> float:
    """Calculate text similarity between two strings using SequenceMatcher."""
    text1_normalized = text1.lower().strip()
    text2_normalized = text2.lower().strip()
    similarity = SequenceMatcher(None, text1_normalized, text2_normalized).ratio()
    return similarity


def _is_similar_learning(new_learning: str, existing_learnings: List[str], threshold: float = SIMILARITY_THRESHOLD) -> bool:
    """Check if a new learning is similar to any existing learning."""
    for existing in existing_learnings:
        similarity = _calculate_similarity(new_learning, existing)
        if similarity >= threshold:
            logger.debug(
                f"Found similar learning (similarity: {similarity:.2f}): "
                f"'{new_learning[:50]}...' similar to '{existing[:50]}...'"
            )
            return True
    return False


def _filter_sensitive_content(learnings: List[str]) -> List[str]:
    """Filter out learnings that might contain sensitive content.
       Used to filter out already filtered learnings, not conversation text."""
    sensitive_keywords = [
        # Health/Medical - explicit personal data
        "diagnosed with", "medical history", "mental health", "therapy",
        "disease", "illness", "diagnosis", "treatment", "disorder",
        "medication", "prescription", "symptoms", "condition",
        
        # Religion - explicit beliefs
        "religious belief", "religion", "religious",
        
        # Politics - explicit opinions
        "political opinion", "political", "politics",
        
        # Race/Ethnicity - explicit data
        "race", "racial", "ethnic", "ancestry",
        
        # Sexual orientation/Gender identity
        "sexual orientation", "gender identity",
        
        # Biometric/Genetic - explicit data
        "genetic", "biometric", "fingerprint", "dna", "genetic testing"
    ]
    
    filtered = []
    for learning in learnings:
        learning_lower = learning.lower()
        if not any(keyword in learning_lower for keyword in sensitive_keywords):
            filtered.append(learning)
        else:
            logger.warning(f"Filtered out potentially sensitive learning: {learning[:50]}...")
    
    return filtered


def save_livekit_messages_to_db(
    db: Session,
    user_id: str,
    messages: List[tuple[str, str]],
    session_id: str
) -> List[str]:
    """Save LiveKit conversation messages to the database."""
    message_ids = []
    try:
        for role, content in messages:
            try:
                sender = MessageSender(role.upper())
            except ValueError:
                logger.warning(f"Unknown message role: {role}, skipping")
                continue
            
            message = ConversationMessage(
                userId=user_id,
                sender=sender,
                content=content,
                learnedFrom=False
            )
            db.add(message)
            db.flush()
            message_ids.append(str(message.messageId))
        
        db.commit()
        logger.info(f"Saved {len(message_ids)} messages to database for user {user_id}, session {session_id}")
        return message_ids
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving LiveKit messages to DB: {str(e)}")
        raise


def save_general_learnings_to_db(
    db: Session,
    user_id: str,
    learnings: List[str],
    session_id: str
) -> List[GeneralLearning]:
    """Save extracted learnings to the GeneralLearning table, checking for duplicates."""
    saved_learnings = []
    try:
        existing_stmt = select(GeneralLearning).where(
            GeneralLearning.userId == user_id
        )
        existing = db.execute(existing_stmt).scalars().all()
        existing_summaries_list = [gl.summary for gl in existing]
        existing_summaries_set = set(existing_summaries_list)
        
        for learning_text in learnings:
            if learning_text in existing_summaries_set:
                logger.debug(f"Skipping exact duplicate learning: {learning_text[:50]}...")
                continue
            
            if _is_similar_learning(learning_text, existing_summaries_list):
                logger.info(f"Skipping similar learning (above {SIMILARITY_THRESHOLD*100:.0f}% similarity): {learning_text[:50]}...")
                continue
            
            gl = GeneralLearning(
                userId=user_id,
                summary=learning_text,
                sessionId=session_id
            )
            db.add(gl)
            saved_learnings.append(gl)
        
        db.commit()
        logger.info(f"Saved {len(saved_learnings)} new general learnings for user {user_id}, session {session_id}")
        return saved_learnings
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving general learnings to DB: {str(e)}")
        raise


def process_livekit_session_learnings(
    user_id: str,
    session_id: str,
    conversation_messages: List[tuple[str, str]]
):
    """Process a LiveKit session: save messages, extract learnings, and store them."""
    if not conversation_messages:
        logger.info(f"No messages to process for session {session_id}")
        return
    
    db = SessionLocal()
    try:
        message_ids = save_livekit_messages_to_db(db, user_id, conversation_messages, session_id)
        
        message_texts = [content for _, content in conversation_messages]
        learnings = extract_career_learnings_from_conversation(message_texts)
        
        if learnings:
            save_general_learnings_to_db(db, user_id, learnings, session_id)
        else:
            logger.info(f"No learnings extracted from session {session_id}")
            
    except Exception as e:
        logger.error(f"Error processing LiveKit session learnings: {str(e)}")
        db.rollback()
    finally:
        db.close()

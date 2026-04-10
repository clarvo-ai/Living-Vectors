from typing import List, cast, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from python_utils.sqlalchemy_models import Learning
from database import SessionLocal
from user_embedding import generate_user_embedding
from job_recommendations import recompute_recommendations
from google.genai import types
from datetime import datetime
from gemini_client import client

# Function to save learnings to the database
def save_learnings_to_db(user_id: str, learnings: List[Dict[str, Any]], removals: List[str], db: Session) -> None:
    """Save generated learnings and remove outdated ones in the database"""
    try:
        # 1. Remove outdated learnings by ID
        if removals:
            for removal_id in removals:
                stmt = select(Learning).where(Learning.userId == user_id, Learning.id == removal_id)
                learning_to_remove = db.execute(stmt).scalars().first()
                if learning_to_remove:
                    db.delete(learning_to_remove)

        # 2. Add new learnings
        for learning in learnings:
            l = Learning(
                userId=user_id,
                summary=learning['text'],
                messages=learning.get('messages', []),
                createdAt=datetime.utcnow(),
                updatedAt=datetime.utcnow()
            )
            db.add(l)
        
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving learnings to DB: {str(e)}")

# Define the response schema for Gemini API
schema = {
    "type": "object",
    "properties": {
        "learnings_to_add": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The learning statement"
                    },
                    "messages": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 1,
                        "description": "User messages/quotes from the transcript that support this learning (at least 1 required)"
                    }
                },
                "required": ["text", "messages"]
            }
        },
        "learnings_to_remove": {
            "type": "array",
            "items": {"type": "string"},
            "description": "List of learning IDs to remove"
        }
    },
    "required": ["learnings_to_add"]
}

# Function to generate learnings using Gemini API
def learnings_from_transcript(transcript: str, current_learnings: List[Dict[str, str]]):
    """Generate learnings from a transcript using Gemini API, noting which old learnings to replace"""
    try:
        current_learnings_text = "\n".join(f"[ID: {l['id']}] - {l['summary']}" for l in current_learnings) if current_learnings else "None"
        prompt = (
            "You are a career development assistant analyzing a conversation transcript for high-signal learnings.\n\n"
            "CURRENT LEARNINGS FOR THIS USER:\n"
            f"{current_learnings_text}\n\n"
            "IMPORTANT GUIDELINES FOR HIGH-SIGNAL LEARNINGS:\n"
            "- DO NOT extract conversational filler or meta-conversation (e.g. 'Heard about Clarvo from a friend', 'Agreed with the summary', 'Is looking for a job').\n"
            "- DO NOT extract non-preferences (e.g. 'Has no company preferences'). If they don't care, we don't need a learning for it.\n"
            "- Extract ONLY concrete, positive data points that actually help match them to a specific job role, skillset, location, or compensation tier.\n"
            "- Good learnings: 'Has 5 years of React experience', 'Wants to work in FinTech or Healthcare', 'Targeting $120k+ base salary in London'\n"
            "- Bad learnings: 'Needs a job', 'Talking to an assistant', 'Agreed with summary', 'Heard about us on LinkedIn', 'No specific preferences'\n"
            "- CRITICAL: Each learning MUST be directly supported by at least 1 actual substantive message/quote from the user. Do not generate learnings exclusively from them saying 'Sounds good' to an agent's summary.\n"
            "- DO NOT extract: racial/ethnic origin, political opinions, religious beliefs, genetic data, health data, biometric data, sex life or sexual orientation\n\n"
            "INSTRUCTIONS:\n"
            "1. Extract NEW high-signal career learnings found in the transcript.\n"
            "2. For each learning, include at least 1 relevant user message/quote from the transcript that directly supports it\n"
            "3. If user contradicts or updates an existing learning, add its ID to learnings_to_remove and the new text to learnings_to_add\n"
            "4. If a learning is no longer true, add its ID to learnings_to_remove\n"
            "5. Avoid duplicate or obviously similar learnings\n\n"
            "6. Include also the question posed by the interviewer in the messages array to which the user answered.\n"

            "TRANSCRIPT TO ANALYZE:\n"
            f"{transcript}\n\n"
            "Extract high-value matching learnings from the transcript above only."
        )
        
        generation_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=generation_config
        )

        parsed = cast(Dict[str, Any], response.parsed)
        return {
            "add": parsed.get("learnings_to_add", []),
            "remove": parsed.get("learnings_to_remove", [])
        }
    except Exception as e:
        print(f"Error generating learnings: {str(e)}")
        return {"add": [], "remove": []}


def get_current_insights_for_user(user_id: str, db: Session) -> List[Dict[str, str]]:
    """Fetch current insights for the given user from DB"""
    try:
        rows = db.execute(
            select(Learning.id, Learning.summary)
            .where(Learning.userId == user_id)
            .order_by(Learning.createdAt)
        ).all()
        return [{'id': str(row[0]), 'summary': row[1]} for row in rows]
    except Exception as e:
        print(f"Error fetching existing learnings: {e}")
        return []

# Background task to process learnings
def process_learnings(user_id: str, transcript: str) -> None:
    """Process transcript to generate and save learnings"""
    db = SessionLocal()
    try:
        existing_learnings = get_current_insights_for_user(user_id, db)
        changes = learnings_from_transcript(transcript, existing_learnings)
        additions = changes.get("add", [])
        removals = changes.get("remove", [])
        
        if additions or removals:
            save_learnings_to_db(user_id, additions, removals, db)
            generate_user_embedding(user_id, db)
            recompute_recommendations(user_id)
    except Exception as e:
        db.rollback()
        print(f"Error processing learnings: {str(e)}")
    finally:
        db.close()


def evaluate_learning_quality(summary: str, messages: List[str]) -> Dict[str, Any]:
    """
    Use Gemini as an LLM judge to evaluate the quality of a learning statement.

    Args:
        summary: The combined learning statement to evaluate
        messages: The source conversation messages the learning was derived from

    Returns:
        Dict with keys: accuracy, relevance, coherence, overall_score, feedback
    """
    prompt = f"""
        You are an expert evaluator judging the quality of combined learning statements. \
        The learning you're evaluating is a COMBINED statement made up of multiple individual \
        learnings joined with periods (e.g., "Learning 1. Learning 2. Learning 3."). IGNORE TRIVIAL TYPOS.

        Example conversation:
        - "I've been really enjoying building web apps and seeing users interact with them."
        - "What kind of projects make you lose track of time?"
        - "Anything involving UI design. I can spend hours tweaking interfaces."
        - "What do people usually come to you for?"
        - "Frontend advice and debugging CSS issues."

        Example of a PERFECT combined learning statement:
        "Enjoys building web applications and observing user interactions. Passionate about UI design \
        and spends hours tweaking interfaces. Provides frontend advice and specializes in debugging CSS issues."

        Example of a BAD combined learning statement (too generic):
        "Enjoys building web applications. Likes coding."

        Evaluation criteria:
        1. **Accuracy**: Does the learning capture ALL specific details from the conversation? Missing details = lower accuracy.
        2. **Relevance**: Are the learnings professionally useful for job matching? Generic statements = lower relevance.
        3. **Coherence**: Is the combined statement well-formed and grammatically correct?

        Now evaluate:
        Combined Learning: "{summary}"
        Source Conversation:
        {chr(10).join(f'- {msg}' for msg in messages)}

        Rate (0.0-1.0) for each criterion. Return JSON only."""

    schema = {
        "type": "object",
        "properties": {
            "accuracy":      {"type": "number", "minimum": 0, "maximum": 1},
            "relevance":     {"type": "number", "minimum": 0, "maximum": 1},
            "coherence":     {"type": "number", "minimum": 0, "maximum": 1},
            "overall_score": {"type": "number", "minimum": 0, "maximum": 1},
            "feedback":      {"type": "string"}
        },
        "required": ["accuracy", "relevance", "coherence", "overall_score", "feedback"]
    }

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=schema,
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=config
    )

    return cast(Dict[str, Any], response.parsed)

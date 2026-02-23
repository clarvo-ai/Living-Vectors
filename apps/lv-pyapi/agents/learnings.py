from typing import List, cast, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from python_utils.sqlalchemy_models import Learning
from database import SessionLocal
from google.genai import types
from datetime import datetime
from gemini_client import client
from embedding_service import get_embedding_768

# Function to save learnings to the database
def save_learnings_to_db(user_id: str, learnings: List[str], removals: List[str], db: Session) -> None:
    """Save generated learnings and remove outdated ones in the database"""
    try:
        # 1. Remove outdated learnings
        if removals:
            for removal_text in removals:
                # Find the closest matching learning or match by text exactly
                # For simplicity, we match exactly against summary for deletion 
                # (since Gemini is returning the exact text we fed it)
                stmt = select(Learning).where(Learning.userId == user_id, Learning.summary == removal_text)
                learning_to_remove = db.execute(stmt).scalars().first()
                if learning_to_remove:
                    db.delete(learning_to_remove)

        # 2. Add new learnings
        for learning_text in learnings:
            embedding = get_embedding_768(learning_text)
            l = Learning(
                userId=user_id,
                summary=learning_text,
                embedding=embedding,
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
            "items": {"type": "string"}
        },
        "learnings_to_remove": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["learnings_to_add"]
}

# Function to generate learnings using Gemini API
def learnings_from_transcript(transcript: str, current_learnings: List[str]):
    """Generate learnings from a transcript using Gemini API, noting which old learnings to replace"""
    try:
        current_learnings_text = "\n".join(f"- {l}" for l in current_learnings) if current_learnings else "None"
        prompt = (
            "Extract learnings from this conversation about the user's career, skills, preferences, and goals.\n\n"
            "Here are the current learnings we already have for this user:\n"
            f"{current_learnings_text}\n\n"
            "Example conversation:\n"
            "USER: I've been really enjoying building web apps and seeing users interact with them.\n"
            "AI: What kind of projects make you lose track of time?\n"
            "USER: Anything involving UI design. I can spend hours tweaking interfaces.\n"
            "AI: What do people usually come to you for?\n"
            "USER: Frontend advice and debugging CSS issues.\n\n"
            "GOOD learnings:\n"
            "- 'Enjoys building web applications'\n"
            "- 'Passionate about UI design'\n"
            "- 'Specializes in debugging CSS issues'\n"
            "- 'Likes coding'\n\n"
            "BAD learnings (unhelpful context or meta-conversation):\n"
            "- 'Needs a job' (obvious context)\n"
            "- 'Is talking to a career assistant' (meta)\n\n"
            "NEVER save any of the following regardless of context: racial or ethnic\n"
            "origin, political opinions, religious beliefs, genetic data, health data,\n"
            "biometric data, or data concerning sex life or sexual orientation.\n\n"
            "INSTRUCTIONS:\n"
            "1. Output a list of NEW learnings found in the transcript.\n"
            "2. If the user contradicts or updates an existing learning in the transcript (e.g. they say their salary expectation changed), output the exact text of the old learning in 'learnings_to_remove' and add the new updated text to 'learnings_to_add'.\n"
            "3. If an existing learning is no longer true based on the transcript, add its exact text to 'learnings_to_remove'.\n\n"
            "4. Don't add any duplicate learnings or obviously similar learnings like 'Enjoys coding' and 'Likes to code'.\n\n"
            "Now extract learnings from this transcript:\n"
            f"{transcript}\n\n"
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


def get_current_insights_for_user(user_id: str, db: Session) -> List[str]:
    """Fetch current insights for the given user from DB"""
    try:
        rows = db.execute(
            select(Learning.summary)
            .where(Learning.userId == user_id)
            .order_by(Learning.createdAt)
        ).scalars().all()
        return list(rows)
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
    except Exception as e:
        db.rollback()
        print(f"Error processing learnings: {str(e)}")
    finally:
        db.close()

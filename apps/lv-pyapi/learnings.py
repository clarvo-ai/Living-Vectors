from typing import List
from fastapi import Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from python_utils.sqlalchemy_models import ConversationMessage

from database import get_db, SessionLocal
from google import client


# Function to save learnings to the database
def save_learnings_to_db(user_id: str, learnings: List[str], db: Session):
    """Save generated learnings to the database"""
    try:
        #don't know schema yet
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving learnings to DB: {str(e)}")

# Define the response schema for Gemini API
schema = {
    "type": "object",
    "properties": {
        "learnings": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["learnings"]
}

# Function to generate learnings using Gemini API
def learnings_from_messages(messages: List[str]):
    """Generate learnings from messages using Gemini API"""
    try:
        prompt = (
            "Extract key learnings from the following messages:\n\n" +
            "\n".join(f"- {msg}" for msg in messages) +
            "\n\nProvide key insights of the main points."
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            response_mime_type="application/json",
            response_schema=schema
        )
        return response.parsed["learnings"]
    except Exception as e:
        print(f"Error generating learnings: {str(e)}")
        return []

# Background task to process learnings
def process_learnings(user_id: str, messages: List[str], db_session_factory):
    """Process messages to generate and save learnings"""
    db = db_session_factory()
    try :
        learnings = learnings_from_messages(messages)
        save_learnings_to_db(user_id, learnings, db)
    except Exception as e:
        db.rollback()
        print(f"Error processing learnings: {str(e)}")
    finally:
        db.close()


# Should be triggered when every fifth message is added
def get_messages_for_learnings(user_id: str, background: BackgroundTasks,  db: Session = Depends(get_db)):
    """Fetch messages for new learnings"""
    try:
        # Query the last 5 messages from the user
        stmt = (
            select(ConversationMessage)
            .where(ConversationMessage.userId == user_id)
            .order_by(ConversationMessage.createdAt.desc())
            .limit(5)
        )
        result = db.execute(stmt)
        messages = result.scalars().all()
        contents = [message.content for message in messages]

        background.add_task(process_learnings, user_id, contents, SessionLocal) # Process in background

        return {"status": "Learning task initiated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating learnings: {str(e)}")
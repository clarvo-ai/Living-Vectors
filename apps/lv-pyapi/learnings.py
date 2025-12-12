from typing import List
from fastapi import Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from python_utils.sqlalchemy_models import ConversationMessage

from database import get_db, SessionLocal
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Function to save learnings to the database
def save_learnings_to_db(user_id: str, learnings: List[str], db: Session):
    """Save generated learnings to the database"""
    try:
        rows = [
           # Learning(userId=user_id, content=learning)
           # for learning in learnings
        ]
        db.add_all(rows)
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
def get_messages_for_learnings(user_id: str, message_id: str, db_session_factory):
    """Fetch messages for new learnings"""
    db = db_session_factory()
    try:
        # Get the timestamp of the message with message_id
        anchor_timestamp = db.execute(
            select(ConversationMessage.createdAt).where(ConversationMessage.id == message_id)
        ).scalar_one()

        # Query the last 6 messages from the user before the anchor timestamp
        stmt = (
            select(ConversationMessage)
            .where(
                ConversationMessage.userId == user_id,
                ConversationMessage.createdAt <= anchor_timestamp
            )
            .order_by(ConversationMessage.createdAt.desc())
            .limit(6)
        )

        result = db.execute(stmt)
        messages = result.scalars().all()
        contents = [message.content for message in messages]
    except Exception as e:
        print(f"Error fetching messages for learnings: {str(e)}")
        contents = []  
    finally:
        db.close()

    if contents:
        process_learnings(user_id, contents, db_session_factory)
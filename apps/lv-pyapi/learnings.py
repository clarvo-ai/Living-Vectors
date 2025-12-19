from typing import List, cast, Dict, Any
from fastapi import Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from python_utils.sqlalchemy_models import ConversationMessage, Learning, _ConversationMessageToLearning
from database import get_db, SessionLocal
from google.genai import types
from datetime import datetime
from gemini_client import client


# Function to save learnings to the database
def save_learnings_to_db(user_id: str, learnings: List[str], message_ids: List[str], db: Session):
    """Save generated learnings to the database"""
    try:
        rows = []
        for learning_text in learnings:
            l = Learning(
                userId=user_id,
                summary=learning_text,
                updatedAt=datetime.utcnow())
            db.add(l)
            db.flush()  # To get the learning ID

            for msg_id in message_ids:
                association = _ConversationMessageToLearning(
                    A=msg_id,
                    B=l.id
                )
                db.add(association)
            rows.append(l)
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
            "Extract SPECIFIC, DETAILED learnings from this conversation. Capture concrete details, not generic summaries.\n\n"
            "Example conversation:\n"
            "- 'I've been really enjoying building web apps and seeing users interact with them.'\n"
            "- 'What kind of projects make you lose track of time?'\n"
            "- 'Anything involving UI design. I can spend hours tweaking interfaces.'\n"
            "- 'What do people usually come to you for?'\n"
            "- 'Frontend advice and debugging CSS issues.'\n\n"
            "GOOD learnings (specific and detailed):\n"
            "- 'Enjoys building web applications and observing user interactions'\n"
            "- 'Passionate about UI design and spends hours tweaking interfaces'\n"
            "- 'Provides frontend advice and specializes in debugging CSS issues'\n\n"
            "BAD learnings (too generic, avoid these):\n"
            "- 'Enjoys building web applications' (too vague, missing UI focus)\n"
            "- 'Likes coding' (not specific enough)\n\n"
            "Now extract learnings from:\n"
            + "\n".join(f"- {msg}" for msg in messages) +
            "\n\nReturn a JSON array of specific, detailed learning statements. Each statement should capture a distinct, concrete skill, interest, or expertise mentioned in the conversation."
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

        # response.parsed is a dict when using JSON schema, cast to satisfy type checker
        parsed = cast(Dict[str, Any], response.parsed)
        return parsed["learnings"]
    except Exception as e:
        print(f"Error generating learnings: {str(e)}")
        return []

# Background task to process learnings
def process_learnings(user_id: str, message_contents: List[str], message_ids: List[str], db_session_factory):
    """Process messages to generate and save learnings"""
    db = db_session_factory()
    try :
        learnings = learnings_from_messages(message_contents)
        save_learnings_to_db(user_id, learnings, message_ids, db)
    except Exception as e:
        db.rollback()
        print(f"Error processing learnings: {str(e)}")
    finally:
        db.close()


# Should be triggered when every fifth message is added
def get_messages_for_learnings(user_id: str, message_id: str, db_session_factory):
    """Fetch messages for new learnings"""
    print("Fetching messages for learnings...")
    db = db_session_factory()
    try:
        # Get the timestamp of the message with message_id
        anchor_timestamp = db.execute(
            select(ConversationMessage.createdAt).where(ConversationMessage.messageId == message_id)
        ).scalar_one()

        # Query the last 6 messages from the user before the anchor timestamp
        stmt = (
            select(ConversationMessage)
            .where(
                ConversationMessage.userId == user_id,
                ConversationMessage.createdAt <= anchor_timestamp
            )
            .order_by(ConversationMessage.createdAt.desc())
            .limit(20)
        )

        result = db.execute(stmt)
        messages = result.scalars().all()
        contents = [message.content for message in messages]
        ids = [message.messageId for message in messages]
        ids.reverse()
        contents.reverse()
    except Exception as e:
        print(f"Error fetching messages for learnings: {str(e)}")
        contents = []
        ids = []
    finally:
        db.close()

    if contents:
        process_learnings(user_id, contents, ids, db_session_factory)
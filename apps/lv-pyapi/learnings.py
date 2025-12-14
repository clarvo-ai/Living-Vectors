from typing import List, Dict
from fastapi import Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from python_utils.sqlalchemy_models import ConversationMessage, Learning, _ConversationMessageToLearning
from database import get_db, SessionLocal
from google.genai import types
from datetime import datetime
from gemini_client import client


# Function to save learnings to the database
def save_learnings_to_db(user_id: str, learnings: List[Dict[str, List[str]]], db: Session):
    """Save generated learnings to the database"""
    for learning in learnings:
        print(f"Learning: {learning['content']}, Message IDs: {learning['ids']}")
    try:
        rows = []
        for learning in learnings:
            l = Learning(
                userId=user_id,
                summary=learning["content"],
                updatedAt=datetime.utcnow())
            db.add(l)
            db.flush()  # To get the learning ID

            for msg_id in learning["ids"]:
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


# Function to mark all messages in the list as learned from
def mark_messages_as_learned(message_ids: List[str], db: Session):
    """Mark messages as learned from"""
    try:
        stmt = (
            update(ConversationMessage)
            .where(ConversationMessage.messageId.in_(message_ids))
            .values(learnedFrom=True)
        )

        db.execute(stmt)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error marking messages as learned: {str(e)}")


# Define the response schema for Gemini API
schema = {
    "type": "object",
    "properties": {
        "learnings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "message_ids": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["text", "message_ids"]
            }
        }
    },
    "required": ["learnings"]
}


# Function to generate learnings using Gemini API
def learnings_from_messages(messages: List[Dict[str, str]]):
    """Generate learnings from messages using Gemini API"""
    try:
        prompt = (
            "Analyze the following user messages and extract key insights that capture their skills, "
            "interests, strengths, and career aspirations. "
            "Produce a list of concise, self-contained statements suitable for embedding into a vector "
            "database. Each statement should focus on a specific trait, preference, or career-relevant "
            "insight that can help match the user to their ideal job.\n\n"
            "For each insight, provide the list of message IDs it was derived from.\n\n"
            + "\n".join(f"- ({msg['id']}) {msg['content']}" for msg in messages)
            + "\n\n"
            "Return the output as a JSON object with a 'learnings' field, which is an array of objects, "
            "each containing 'text' (the insight) and 'message_ids' (list of IDs of messages that contributed)."
            "If no learnings can be derived, return an empty list."
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

        learnings_list = [
            {"content": l["text"], "ids": l["message_ids"]}
            for l in response.parsed.get("learnings", [])
        ]

        return learnings_list
    except Exception as e:
        print(f"Error generating learnings: {str(e)}")
        return []


# Function to fetch messages for learnings
def get_messages_for_learnings(user_id: str, db: Session):
    """Fetch messages for new learnings"""
    try:
        stmt = select(ConversationMessage).where(
                ConversationMessage.userId == user_id,
                ConversationMessage.learnedFrom == False
            ).order_by(ConversationMessage.createdAt.asc())

        result = db.execute(stmt)
        rows = result.scalars().all()

        ids = [m.messageId for m in rows]

        message_list = [
            {"id": message.messageId, "content": message.content}
            for message in rows
        ]

        return ids, message_list

    except Exception as e:
        print(f"Error fetching messages for learnings: {str(e)}")
        return [], []


# Function to process learnings for a user
def process_learnings(user_id: str, db: Session):
    """Process messages to generate and save learnings"""
    try :
        messageIDs, messages = get_messages_for_learnings(user_id, db)
        if not messages:
            return

        learnings = learnings_from_messages(messages)
        if learnings:
            save_learnings_to_db(user_id, learnings, db)
        
        if messageIDs:
            mark_messages_as_learned(messageIDs, db)

    except Exception as e:
        db.rollback()
        print(f"Error processing learnings: {str(e)}")


# Function to check message count of unused messages and trigger learnings generation
def check_and_trigger_learnings(user_id: str, db_session_factory):
    """Check message count and trigger learnings generation if needed"""
    db = db_session_factory()
    try:
        # Use a limited query to avoid a full table count; fetch up to 16 ids
        rows = db.query(ConversationMessage.messageId).filter(
            ConversationMessage.userId == user_id,
            ConversationMessage.learnedFrom == False
        ).limit(16).all()

        if len(rows) > 15:
            process_learnings(user_id, db)

    except Exception as e:
        print(f"Error checking message count for learnings: {str(e)}")
    finally:
        db.close()
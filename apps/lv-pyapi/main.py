from fastapi import FastAPI, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from google import genai

from database import get_db
from python_utils.sqlalchemy_models import User
from message_save import save_message
from python_utils.sqlalchemy_models import User, MessageSender
from fastapi.responses import JSONResponse

import json
from pathlib import Path

#Load questions at backend startup:
QUESTIONS_PATH = Path(__file__).parent.parent.parent / "packages" / "shared-data" / "career-conversation-questions.json"
with open(QUESTIONS_PATH) as f:
    CAREER_QUESTIONS = json.load(f)

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="LV PyAPI", description="Living Vectors Python API", version="1.0.0")
allowed_origins = [origin.strip() for origin in os.getenv("FRONTEND_ORIGINS", "").split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins= allowed_origins or ["http://localhost:3045", "https://yourfrontend.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@app.get("/")
async def hello():
    """Simple hello endpoint"""
    return {"message": "Hello from LV PyAPI! 🚀"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "lv-pyapi"}

@app.get("/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get a specific user by ID"""
    try:
        # Query specific user by ID
        stmt = select(User).where(User.id == user_id)
        result = db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    

#async def start_conversation(userId: Optional[str] = Body(default=None),  db: Session = Depends(get_db)):
@app.post("/api/chat/start")
async def start_conversation():
    """Start a new conversation and return the first question"""
    """we can also think of something like this if we want separate chats with the AI: conversation_id = str(uuid.uuid4()) """
    first_question = CAREER_QUESTIONS["goals"][0]["questions"][0]
    
    """Should we rather send the whole bundle with both the question and the insight to the frontend?"""
    return {
        "question": first_question["question"],
        "goalCategory": CAREER_QUESTIONS["goals"][0]["goal"],
        "questionId": {
            "goalIndex": 0,
            "questionIndex": 0
        }
    }

@app.post("/api/chat/answer")
async def get_gemini_response(
    # userId is optional, but only for testing (specifically test_gemini.py)
    # in real usage, the user is authenticated and the userId is always provided
    # so, messages are always saved
    # this should be removed in the future, when we have better gemini tests :)
    # TODO: fix this when we have better gemini tests (correct version: userId: str = Body(...))
    userId: Optional[str] = Body(default=None), 
    userAnswer: str = Body(..., embed=True),
    questionId: dict = Body(...),
    db: Session = Depends(get_db)):

    """Use Gemini with the user answer and save both (gemini answer and user answer) to the database """
    try:

        #if userId then save to db
        if userId:
            # fetch metadata from the POST for the db save

            goal_id = questionId["goalIndex"]
            question_id = questionId["questionIndex"]

            question_data = CAREER_QUESTIONS["goals"][goal_id]["questions"][question_id]

            question_metadata = {
                "question": question_data["question"],
                "potentialInsight": question_data["potentialInsight"],
                "goalCategory": CAREER_QUESTIONS["goals"][goal_id]["goal"],
                "goalIndex": goal_id,
                "questionIndex": question_id
            }

            save_message(db, userId, MessageSender.USER, userAnswer, question_context=question_metadata)

        # Determine next question BEFORE calling Gemini
        goal_id = questionId["goalIndex"]
        question_id = questionId["questionIndex"]
        
        next_question_data = None
        is_completed = False
        
        if question_id + 1 < len(CAREER_QUESTIONS["goals"][goal_id]["questions"]):
            next_question_id = question_id + 1
            next_goal_id = goal_id
        elif goal_id + 1 < len(CAREER_QUESTIONS["goals"]):
            next_goal_id = goal_id + 1
            next_question_id = 0
        else:
            is_completed = True
        
        if not is_completed:
            next_question_raw = CAREER_QUESTIONS["goals"][next_goal_id]["questions"][next_question_id]
            next_question_data = {
                "question": next_question_raw["question"],
                "potentialInsight": next_question_raw["potentialInsight"],
                "goalCategory": CAREER_QUESTIONS["goals"][next_goal_id]["goal"],
                "questionId": {
                    "goalIndex": next_goal_id,
                    "questionIndex": next_question_id
                }
            }

        # Build prompt with next question context
        prompt_parts = [
            "You are a career guidance assistant conducting a conversational interview.",
            f"\nCurrent Question: {question_data['question']}",
            f"\nPotential Insights to consider: {question_data['potentialInsight']}",
            f"\nUser's answer: {userAnswer}",
            "\nYour task:",
            "1. Acknowledge and analyze the user's answer thoughtfully",
            "2. Provide brief insights based on their response"
        ]

        if not is_completed and next_question_data:
            prompt_parts.extend([
                f"3. Naturally transition to the next question: '{next_question_data['question']}'",
                f"   (This question explores: {next_question_data['potentialInsight']})",
                "\nIMPORTANT: Blend your response and the next question into ONE flowing conversational message.",
                "Use transition phrases like 'That's interesting... now I'm curious about...' or 'Building on that...'",
                "Make it feel like a natural conversation, not separate blocks of text."
            ])
        else:
            prompt_parts.append("3. Wrap up the conversation warmly, as this is the final question.")

        question_to_gemini = "\n".join(prompt_parts)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=question_to_gemini
        )
        ai_text = response.text or ""

        #if userId then save to db
        if userId:
            save_message(db, userId, MessageSender.AI, ai_text, question_context=question_metadata)

        return {            
                "message": ai_text,
                "nextQuestionId": next_question_data["questionId"] if next_question_data else None,
                "completed": is_completed,
                "status": 200
                }

    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e), "status": 500})


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
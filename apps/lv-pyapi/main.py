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
    

@app.post("/api/chat/start")
async def start_conversation(userId: str = Body(...), db: Session = Depends(get_db)):
    """Start a new conversation and return the first question"""
    """we can also think of something like this if we want separate chats with the AI: conversation_id = str(uuid.uuid4()) """
    first_question = CAREER_QUESTIONS["goals"][0]["questions"][0]
    
    return {
        """Should we rather send the whole bundle with both the question and the insight to the frontend?"""
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

            question_to_gemini = f"""You are a career guidance assistant. 
            
            Question: {question_data["question"]}

            These are potential insights to take into consideration: {question_data["potentialInsight"]}

            User's answer: {userAnswer}


            Analyze the User's answer based on the question and the users answer.
            Take potential insights into consideration. Answer like you were a career guidance assistant.
            Your response should maintain a conversational tone and it should sound humane, natural and well flowing.
            """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=question_to_gemini
        )
        ai_text = response.text or ""

        if userId:

            save_message(db, userId, MessageSender.AI, ai_text, question_context=question_metadata)

        return {"message": response.text, "status": 200}

    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e), "status": 500})


""" make endpoint for api/chat/next-question """

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
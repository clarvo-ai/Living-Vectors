from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Any, List, Optional
import uvicorn
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel

from database import get_db
from python_utils.sqlalchemy_models import User

# Load environment variables
load_dotenv()

# Create FastAPI app
app: Any = FastAPI(title="LV PyAPI", description="Living Vectors Python API", version="1.0.0")
allowed_origins: list[str] = [origin.strip() for origin in os.getenv("FRONTEND_ORIGINS", "").split(sep=",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins= allowed_origins or ["http://localhost:3045", "https://yourfrontend.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Load career conversation questions
QUESTIONS_FILE: Path = Path(__file__).parent / "career_conversation_questions.json"
with open(file=QUESTIONS_FILE, mode="r") as f:
    CAREER_QUESTIONS = json.load(fp=f)

# Pydantic models for request/response
class ChatMessage(BaseModel):
    role: str
    content: str

class InterviewChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []

@app.get("/")
async def hello() -> dict[str, str]:
    """Simple hello endpoint"""
    return {"message": "Hello from LV PyAPI! 🚀"}

@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy", "service": "lv-pyapi"}

@app.get("/users/{user_id}")
async def get_user(user_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get a specific user by ID"""
    try:
        # Query specific user by ID
        stmt: Any = select(User).where(User.id == user_id)
        result: Any = db.execute(stmt)
        user: Any = result.scalar_one_or_none()
        
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

@app.post("/api/gemini")
def get_gemini_response(prompt: str = Body(..., embed=True)) -> dict[str, Any] | Any:
    """Query Gemini API"""
    try:
        response: Any = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return {"message": response.text, "status": 200}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e), "status": 500})

@app.post("/api/interview/chat")
async def interview_chat(request: InterviewChatRequest) -> dict[str, Any]:
    """AI-powered interview chat using career conversation questions as guidance"""
    try:
        # Build system prompt with career questions guidance
        system_prompt = """You are a thoughtful, strategic career advisor conducting a natural, flowing conversation. 
Your goal is to guide the conversation to explore important themes about the person's career goals, values, direction, and potential fit with opportunities.

Use the following career conversation questions as a guide, but DO NOT ask them verbatim or mechanically. Instead:
- Ask questions naturally and conversationally
- Build on what the person has already shared
- Make the conversation feel like a genuine dialogue, not a scripted interview
- Cover themes such as: user goals, values, direction, skills, environment preferences, and potential fit
- Show genuine interest and ask thoughtful follow-up questions
- Keep responses concise (2-3 sentences typically)

Available question themes to guide your conversation:
"""

        # Add all questions organized by goals
        for goal_data in CAREER_QUESTIONS["goals"]:
            system_prompt += f"\n{goal_data['goal']}:\n"
            for q in goal_data["questions"]:
                system_prompt += f"- {q['question']} (to explore: {q['potentialInsight']})\n"

        system_prompt += """
Remember: Be conversational, natural, and strategic. Build trust and gather insights organically."""

        # Build conversation prompt for Gemini
        # Start with system instructions
        full_prompt: str = system_prompt
        
        # Add conversation history if provided
        if request.conversation_history:
            full_prompt += "\n\nConversation so far:\n"
            for msg in request.conversation_history:
                if msg.role == "user":
                    full_prompt += f"User: {msg.content}\n"
                elif msg.role == "ai":
                    full_prompt += f"Assistant: {msg.content}\n"
        
        # Add current user message
        full_prompt += f"\nUser: {request.message}\n\nAssistant:"

        # Generate response using Gemini
        response: Any = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt
        )

        return {
            "id": str(int(os.urandom(4).hex(), 16)),
            "role": "ai",
            "content": response.text.strip(),
            "timestamp": None  # Will be set by frontend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
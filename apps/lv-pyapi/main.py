from fastapi import FastAPI, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
import uvicorn
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from google import genai

from database import get_db
from python_utils.sqlalchemy_models import User

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

@app.post("/api/gemini")
def get_gemini_response(prompt: str = Body(..., embed=True)):
    """Query Gemini API"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return {"message": response.text, "status": 200}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e), "status": 500})


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
            contents=prompt
        )
        return response.text # Should be stored in the database
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")


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

        background.add_task(learnings_from_messages, contents) # Process in background

        return {"status": "Learning task initiated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating learnings: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
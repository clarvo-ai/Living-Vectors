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
async def get_gemini_response(
    # userId is optional, but only for testing (specifically test_gemini.py)
    # in real usage, the user is authenticated and the userId is always provided
    # so, messages are always saved
    # this should be removed in the future, when we have better gemini tests :)
    # TODO: fix this when we have better gemini tests (correct version: userId: str = Body(...))
    userId: Optional[str] = Body(default=None), 
    prompt: str = Body(..., embed=True),
    db: Session = Depends(get_db)):

    """Query Gemini API"""
    try:
        if userId:
            save_message(db, userId, MessageSender.USER, prompt)


        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        ai_text = response.text or ""

        if userId:
            save_message(db, userId, MessageSender.AI, ai_text)

        return {"message": response.text, "status": 200}

    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e), "status": 500})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
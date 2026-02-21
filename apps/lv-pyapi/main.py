from fastapi import FastAPI, Depends, HTTPException, Body, BackgroundTasks, UploadFile, File, Response
from sqlalchemy.orm import Session
from sqlalchemy import select, cast, func
from pgvector.sqlalchemy import Vector as PgVector
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import logging

from database import get_db, SessionLocal
from python_utils.sqlalchemy_models import User, UserEmbedding, Job
from message_save import save_message
from python_utils.sqlalchemy_models import User, MessageSender
from fastapi.responses import JSONResponse
from voice import text_to_speech, speech_to_text
from learnings import check_and_trigger_learnings
from gemini_client import client
from user_embedding import generate_user_embedding
from job_embedding import generate_missing_embeddings
from job_recommendations import save_job_recommendations, get_job_recommendations
from pydantic import BaseModel
from store_jobs import process_file

import json
from pathlib import Path

logging.basicConfig(level=logging.INFO)

#Load questions at backend startup:
QUESTIONS_PATH = Path(__file__).parent.parent.parent / "packages" / "shared-data" / "career-conversation-questions.json"
with open(QUESTIONS_PATH) as f:
    CAREER_QUESTIONS = json.load(f)

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
    
    introduction_prompt = f"""You are a friendly career guidance assistant helping users find their ideal career path and employment opportunities.

Your task:
1. Introduce yourself warmly as a career assistant who is here to help them discover their strengths and find the right job
2. Explain that you'll ask them a series of questions to better understand their goals and aspirations
3. Smoothly transition into asking the first question: "{first_question['question']}"

Make it conversational and encouraging. Blend the introduction and first question into ONE flowing message."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=introduction_prompt
        )
        ai_introduction = response.text or ""

        return {
            "message": ai_introduction,
            "goalCategory": CAREER_QUESTIONS["goals"][0]["goal"],
            "questionId": {
                "goalIndex": 0,
                "questionIndex": 0
            }
        }
    
    except Exception as e:
        #if gemini fails (make this fallback better later)

        return {
            "message": f"{first_question['question']}",
            "questionId": {
                "goalIndex": 0,
                "questionIndex": 0
            }
        }
        

@app.post("/api/chat/answer")
async def get_gemini_response(
    bg_tasks: BackgroundTasks,
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

        #if userId then save to db
        if userId:
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
            "2. Provide brief insights based on their response",
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
            # Trigger background task to check if learnings generation is needed
            bg_tasks.add_task(check_and_trigger_learnings, userId, SessionLocal)

        return {            
                "message": ai_text,
                "nextQuestionId": next_question_data["questionId"] if next_question_data else None,
                "completed": is_completed,
                "status": 200
                }

    except Exception as e:
        logging.exception("Unhandled error in /api/chat/answer")
        return JSONResponse(status_code=500, content={"message": "Internal server error", "status": 500})

@app.post("/api/tts")
async def tts(text: str = Body(..., embed=True)):
    """Text-to-Speech endpoint"""
    try:
        audio_content = text_to_speech(text)
        return Response(content=audio_content, media_type="audio/mpeg")
    except Exception as e:
        logging.exception("Unhandled error in /api/tts")
        return JSONResponse(status_code=500, content={"message": "Internal server error", "status": 500})

@app.post("/api/stt")
async def stt(file: UploadFile = File(...)):
    """Speech-to-Text endpoint"""
    try:
        content = await file.read()
        transcript = speech_to_text(content)
        return {"transcript": transcript}
    except Exception as e:
        logging.exception("Unhandled error in /api/stt")
        return JSONResponse(status_code=500, content={"message": "Internal server error", "status": 500})


# ============== EMBEDDING & JOB MATCHING ENDPOINTS ==============

@app.post("/api/users/{user_id}/generate-embedding")
async def generate_embedding_endpoint(user_id: str, db: Session = Depends(get_db)):
    """
    Generate embedding for a user from their learnings.
    
    Call this after a career discussion is complete to create/update
    the user's embedding vector for job matching.
    """
    try:
        result = generate_user_embedding(user_id, db)
        if result:
            return {"status": 200, "message": "Embedding generated successfully", "embedding_id": str(result.id)}
        else:
            return {"status": 404, "message": "No learnings found for user. Complete a career discussion first."}
    except Exception as e:
        logging.exception("Error generating user embedding")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/jobs/match")
async def match_jobs(
    user_id: str,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get jobs matched to user, sorted by similarity.
    
    Uses cosine similarity via pgvector to compare user embedding
    against all job embeddings and return the best matches.
    
    Args:
        user_id: The user's ID
        page: Page number (default 1)
        per_page: Results per page (default 20)
    
    Returns:
        Paginated list of jobs with similarity scores
    """
    # Get user embedding
    user_emb = db.query(UserEmbedding).filter_by(userId=user_id).first()
    if not user_emb:
        raise HTTPException(
            status_code=404,
            detail="User embedding not found. Generate it first by calling POST /api/users/{user_id}/generate-embedding"
        )

    # Deserialize the stored embedding string into a Python list of floats.
    # The list is then passed as a *bind parameter* via pgvector's SQLAlchemy
    # integration, so the query structure stays constant and PostgreSQL can
    # cache the execution plan.
    raw = user_emb.embedding
    embedding_list = json.loads(raw) if isinstance(raw, str) else list(raw)

    # Cast the text-mapped column to the native pgvector Vector type so we can
    # use pgvector's typed operators (.cosine_distance) instead of raw SQL.
    job_vec = cast(Job.job_embedding, PgVector(1536))
    # pgvector <=> cosine distance: 0 = identical, 2 = opposite
    cosine_dist = job_vec.cosine_distance(embedding_list)
    similarity = (1 - cosine_dist).label("similarity")

    offset = (page - 1) * per_page

    total_count = (
        db.query(func.count(Job.id))
        .filter(Job.job_embedding.isnot(None))
        .scalar()
        or 0
    )

    rows = (
        db.query(Job, similarity)
        .filter(Job.job_embedding.isnot(None))
        .order_by(cosine_dist)
        .offset(offset)
        .limit(per_page)
        .all()
    )

    return {
        "status": 200,
        "page": page,
        "per_page": per_page,
        "total": total_count,
        "has_more": (page * per_page) < total_count,
        "jobs": [
            {
                "id": str(j.id),
                "title": j.job_title,
                "company": j.company_name,
                "description": j.job_description,
                "location": ", ".join(filter(None, [j.city, j.country, j.working_mode])),
                "similarity": round(float(sim), 3) if sim is not None else 0,
            }
            for j, sim in rows
        ],
    }

@app.get("/api/jobs")
async def list_jobs(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """
    List all jobs (without matching, just browsing).
    """
    offset = (page - 1) * per_page
    jobs = db.query(Job).offset(offset).limit(per_page).all()
    
    return {
        "status": 200,
        "page": page,
        "per_page": per_page,
        "jobs": [
            {
                "id": str(j.id),
                "title": j.job_title,
                "company": j.company_name,
                "description": j.job_description,
                "location": ", ".join(filter(None, [j.city, j.country, j.working_mode]))
            }
            for j in jobs
        ]
    }

# Pydantic models for job recommendations
class JobRecommendationItem(BaseModel):
    job_id: str
    score: float | None = None
    timestamp: str | None = None


class SaveJobRecommendationsRequest(BaseModel):
    recommendations: list[JobRecommendationItem]


@app.post("/users/{user_id}/job-recommendations")
async def save_user_job_recommendations(
    user_id: str,
    request: SaveJobRecommendationsRequest,
    db: Session = Depends(get_db)
):
    """
    Save job recommendations for a user.
    
    This endpoint is called after the matching algorithm computes top job matches.
    """
    try:
        recs = [rec.model_dump() for rec in request.recommendations]
        count = save_job_recommendations(db, user_id, recs)
        return {
            "message": f"Saved {count} job recommendations",
            "user_id": user_id,
            "count": count
        }
    except Exception as e:
        logging.exception("Error saving job recommendations")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/users/{user_id}/job-recommendations")
async def get_user_job_recommendations(
    user_id: str,
    limit: int | None = None,
    db: Session = Depends(get_db)
):
    """Get job recommendations for a user"""
    try:
        recommendations = get_job_recommendations(db, user_id, limit)
        return {
            "user_id": user_id,
            "recommendations": recommendations,
            "count": len(recommendations)
        }
    except Exception as e:
        logging.exception("Error retrieving job recommendations")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/upload-jobs")
async def upload_jobs(filename: str = Body(..., embed=True), background_tasks: BackgroundTasks = None):
    """Endpoint to upload job listings"""
    try:
        result = process_file(filename)
        background_tasks.add_task(generate_missing_embeddings)
        return {"message": result, "status": 200}
    except Exception as e:
        logging.exception("Error processing jobs")
        return JSONResponse(
            status_code=500, 
            content={"message": "Internal server error", "status": 500}
        )

@app.post("/api/jobs/generate-embeddings")
async def batch_generate_job_embeddings(background_tasks: BackgroundTasks):
    """
    Manually trigger embedding generation for all jobs missing one.

    Runs in the background — returns immediately.
    """
    background_tasks.add_task(generate_missing_embeddings)
    return {"status": 200, "message": "Embedding generation started in background"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
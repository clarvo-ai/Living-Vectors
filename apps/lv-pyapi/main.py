from fastapi import FastAPI, Depends, HTTPException, Body, BackgroundTasks, UploadFile, File, Response, Header
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import logging

from database import get_db, engine
from python_utils.sqlalchemy_models import User, UserEmbedding, Job, ConversationMessage, CompletedTask, Learning, MessageSender
from message_save import save_message
from fastapi.responses import JSONResponse
from learnings import evaluate_learning_quality
from gemini_client import client
from user_embedding import generate_user_embedding
from job_embedding import generate_missing_embeddings
from job_recommendations import save_job_recommendations, get_job_recommendations, recompute_recommendations, query_job_matches
from pydantic import BaseModel
from store_jobs import process_file
from learnings import process_learnings

import json
from pathlib import Path

from telemetry import setup_telemetry

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

setup_telemetry(app=app, engine=engine)

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
    
# ============== EMBEDDING & JOB MATCHING ENDPOINTS ==============

@app.post("/api/upload-jobs")
async def upload_jobs(filename: str = Body(..., embed=True), background_tasks: BackgroundTasks = None):
    """Endpoint to upload job listings"""
    try:
        result = process_file(filename)
        return {"message": result, "status": 200}
    except Exception as e:
        logging.exception("Error processing jobs")
        return JSONResponse(
            status_code=500, 
            content={"message": "Internal server error", "status": 500}
        )

@app.post("/api/users/{user_id}/generate-embedding")
async def generate_embedding_endpoint(user_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Generate embedding for a user from their learnings.
    
    Call this after a career discussion is complete to create/update
    the user's embedding vector for job matching.
    Also triggers a background recompute of the user's top job recommendations.
    """
    try:
        result = generate_user_embedding(user_id, db)
        if result:
            background_tasks.add_task(recompute_recommendations, user_id)
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
    # Get user embedding, generating it on-the-fly if missing
    user_emb = db.query(UserEmbedding).filter_by(userId=user_id).first()
    if not user_emb:
        user_emb = generate_user_embedding(user_id, db)
        if not user_emb:
            raise HTTPException(
                status_code=404,
                detail="No learnings found for user. Complete a career discussion first."
            )

    # Deserialize the stored embedding string into a Python list of floats.
    # The list is then passed as a *bind parameter* via pgvector's SQLAlchemy
    # integration, so the query structure stays constant and PostgreSQL can
    # cache the execution plan.
    raw = user_emb.embedding
    embedding_list = json.loads(raw) if isinstance(raw, str) else list(raw)

    offset = (page - 1) * per_page

    total_count = (
        db.query(func.count(Job.id))
        .filter(Job.job_embedding.isnot(None))
        .scalar()
        or 0
    )

    rows = query_job_matches(db, embedding_list, limit=per_page, offset=offset)

    result_jobs = [
            {
                "id": str(j.id),
                "job_title": j.job_title,
                "company_name": j.company_name,
                "company_industry": j.company_industry,
                "role_industry": j.role_industry,
                "city": j.city,
                "country": j.country,
                "working_mode": j.working_mode,
                "employment_type": j.employment_type,
                "contract_type": j.contract_type,
                "job_level": j.job_level,
                "salary_min": j.salary_min,
                "salary_max": j.salary_max,
                "guessed_salary": j.guessed_salary,
                "guessed_salary_min": j.guessed_salary_min,
                "guessed_salary_max": j.guessed_salary_max,
                "required_skills": j.required_skills or [],
                "required_languages": j.required_languages or [],
                "language_summary": j.language_summary,
                "requirements": j.requirements or [],
                "job_description": j.job_description,
                "job_description_summary": j.job_description_summary,
                "deprecated_perks": j.deprecated_perks,
                "company_description": j.company_description,
                "company_culture": j.company_culture,
                "company_values": j.company_values,
                "apply_link": j.apply_link,
                "source_url": j.source_url,
                "posted_at": j.published_date.isoformat() if j.published_date else None,
                "expires_at": j.last_day_to_apply.isoformat() if j.last_day_to_apply else None,
                "summer_job_internship": j.summer_job_internship,
                "similarity": round(float(sim), 3) if sim is not None else 0,
            }
            for j, sim in rows
        ]

    return {
        "status": 200,
        "page": page,
        "per_page": per_page,
        "total": total_count,
        "has_more": (page * per_page) < total_count,
        "jobs": result_jobs,
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


@app.post("/api/users/{user_id}/job-recommendations")
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


@app.get("/api/users/{user_id}/job-recommendations")
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


#Pydantic model for agent <-> backend communication
class TranscriptPayload(BaseModel):
    user_id: str
    transcript: str

@app.post("/internal/process-transcript")
async def internal_process_transcript(
    payload: TranscriptPayload,
    background_tasks: BackgroundTasks,
    x_internal_secret: str = Header(...),
    db: Session = Depends(get_db),
):
    """
    Called by the LiveKit voice agent after a session closes.
    Processes the transcript to extract and save user learnings.
    The agent cannot reach Cloud SQL directly (no Auth Proxy), so it delegates here.
    """
    if x_internal_secret != os.getenv("INTERNAL_API_SECRET"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Persist message history (ConversationMessage) so admin/debug views can show it.
    # Transcript format: one message per line: "<role>: <content>"
    try:
        messages_to_save: list[ConversationMessage] = []

        for raw_line in (payload.transcript or "").splitlines():
            line = raw_line.strip()
            if not line or ":" not in line:
                continue

            raw_role, content = line.split(":", 1)
            role = raw_role.strip()
            content = content.strip()
            if not content:
                continue

            if role.upper() == "USER":
                sender = MessageSender.USER
            else:
                sender = MessageSender.AI

            messages_to_save.append(
                ConversationMessage(
                    userId=payload.user_id,
                    sender=sender,
                    content=content,
                    questionContext=None,
                )
            )

        if messages_to_save:
            db.add_all(messages_to_save)
            db.commit()
    except Exception:
        logging.exception("Failed to persist transcript messages")
        # Don't fail the request; learnings extraction is more important.

    background_tasks.add_task(process_learnings, payload.user_id, payload.transcript)
    return {"status": "accepted"}


class EvaluateLearningRequest(BaseModel):
    summary: str
    messages: List[str]

@app.post("/api/learnings/evaluate")
async def evaluate_learning_endpoint(request: EvaluateLearningRequest):
    """
    Evaluate a learning statement with an LLM judge.
    Returns accuracy, relevance, coherence, overall_score, and feedback.
    """
    try:
        result = evaluate_learning_quality(request.summary, request.messages)
        return result
    except Exception as e:
        logging.exception("Error evaluating learning")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/internal/users/{user_id}/completed-tasks")
async def get_completed_tasks(
    user_id: str,
    x_internal_secret: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Fetch list of completed task IDs for a user.
    Called by the agent at session start to determine interview progress.
    """
    if x_internal_secret != os.getenv("INTERNAL_API_SECRET"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        rows = db.execute(
            select(CompletedTask.taskId)
            .where(CompletedTask.userId == user_id)
        ).all()
        completed_task_ids = [row.taskId for row in rows]
        return {"user_id": user_id, "completed_tasks": completed_task_ids}
    except Exception as e:
        logging.exception(f"Error fetching completed tasks for user {user_id}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/internal/users/{user_id}/insights")
async def get_user_insights(
    user_id: str,
    x_internal_secret: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Fetch user learnings/insights for context during conversation.
    Called by the agent at session start.
    """
    if x_internal_secret != os.getenv("INTERNAL_API_SECRET"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        rows = db.execute(
            select(Learning.summary)
            .where(Learning.userId == user_id)
            .order_by(Learning.createdAt)
        ).all()
        insights = [row.summary for row in rows]
        return {"user_id": user_id, "insights": insights}
    except Exception as e:
        logging.exception(f"Error fetching insights for user {user_id}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/internal/users/{user_id}/completed-tasks")
async def mark_task_completed(
    user_id: str,
    task_id: str = Body(..., embed=True),
    x_internal_secret: str = Header(...),
    db: Session = Depends(get_db)
):
    """
    Mark a task as completed for a user.
    Called by the agent when a discovery task is finished.
    """
    if x_internal_secret != os.getenv("INTERNAL_API_SECRET"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        from datetime import datetime
        db.add(CompletedTask(userId=user_id, taskId=task_id, completedAt=datetime.now()))
        db.commit()
        return {"status": "success", "user_id": user_id, "task_id": task_id}
    except Exception as e:
        db.rollback()
        logging.exception(f"Error marking task {task_id} as completed for user {user_id}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
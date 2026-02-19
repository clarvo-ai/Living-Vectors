from fastapi import FastAPI, Depends, HTTPException, Body, BackgroundTasks, UploadFile, File, Response
from sqlalchemy.orm import Session
from sqlalchemy import select, text
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
from job_embedding import create_job_with_embedding, generate_missing_embeddings
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
    
    # Convert embedding list to pgvector format string
    # user_emb.embedding is already a list from our Vector type
    embedding_list = user_emb.embedding
    if isinstance(embedding_list, str):
        embedding_str = embedding_list  # Already in pgvector format
    else:
        embedding_str = "[" + ",".join(str(float(x)) for x in embedding_list) + "]"
    
    # Query jobs ordered by cosine similarity
    # pgvector: <=> is cosine distance (0 = identical, 2 = opposite)
    # We compute similarity as 1 - distance
    offset = (page - 1) * per_page
    
    # Count total jobs for pagination info
    total_count = db.execute(text('SELECT COUNT(*) FROM "public"."Job" WHERE job_embedding IS NOT NULL')).scalar() or 0
    
    # Note: We use string formatting for the embedding vector because SQLAlchemy's
    # parameter binding conflicts with PostgreSQL's ::vector cast syntax.
    # The embedding is generated internally, not from user input, so this is safe.
    query = text(f"""
        SELECT id, job_title, company_name, job_description, city, country, working_mode,
               1 - (job_embedding <=> '{embedding_str}'::vector) as similarity
        FROM "public"."Job"
        WHERE job_embedding IS NOT NULL
        ORDER BY job_embedding <=> '{embedding_str}'::vector
        LIMIT :limit OFFSET :offset
    """)
    
    jobs = db.execute(
        query,
        {
            "limit": per_page,
            "offset": offset
        }
    ).fetchall()
    
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
                "similarity": round(float(j.similarity), 3) if j.similarity else 0
            }
            for j in jobs
        ]
    }


@app.post("/api/jobs")
async def create_job(
    title: str = Body(...),
    company: str = Body(...),
    description: str = Body(...),
    working_mode: Optional[str] = Body(None),
    country: str = Body(...),
    city: Optional[str] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Create a new job with embedding.
    
    This endpoint creates a job posting and automatically generates
    its embedding vector for matching against users.
    """
    try:
        job = create_job_with_embedding(title, company, description, country, city, working_mode, db)
        return {
            "status": 200, 
            "job_id": str(job.id), 
            "message": f"Job '{title}' created with embedding"
        }
    except Exception as e:
        logging.exception("Error creating job")
        raise HTTPException(status_code=500, detail=str(e))


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
"""
Service for saving job recommendations to the database.

This module provides functionality to save job recommendations generated
by the matching algorithm. Call recompute_recommendations after a user
embedding is generated to compute and persist the top matches.
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import cast, delete, desc, select
from sqlalchemy.orm import Session
from pgvector.sqlalchemy import Vector as PgVector

from database import SessionLocal
from python_utils.sqlalchemy_models import Job, JobRecommendation, UserEmbedding

TOP_RECOMMENDATIONS_COUNT = 20 # Number of top matches to save per user


def save_job_recommendations(
    db: Session,
    user_id: str,
    recommendations: List[Dict[str, Any]],
    replace_existing: bool = True
) -> int:
    """
    Save job recommendations for a user to the database.
    
    Args:
        db: Database session
        user_id: UUID of the user
        recommendations: List of recommendation dicts with keys:
            - job_id (str): The job identifier
            - score (float, optional): Matching score
            - timestamp (datetime|str, optional): When recommendation was generated (datetime or ISO format string)
        replace_existing: If True, delete existing recommendations for this user before saving new ones
    
    Returns:
        Number of recommendations saved
    """
    try:
        # Delete existing recommendations if requested
        if replace_existing:
            db.execute(
                delete(JobRecommendation).where(JobRecommendation.userId == UUID(user_id))
            )
        
        # Create new recommendation records
        default_timestamp = datetime.utcnow()
        saved_count = 0
        
        for rec in recommendations:
            # Handle timestamp - can be datetime, string, or None
            rec_timestamp = rec.get("timestamp")
            if rec_timestamp is None:
                timestamp = default_timestamp
            elif isinstance(rec_timestamp, str):
                # Parse ISO format string to datetime
                try:
                    timestamp = datetime.fromisoformat(rec_timestamp.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    timestamp = default_timestamp
            elif isinstance(rec_timestamp, datetime):
                timestamp = rec_timestamp
            else:
                timestamp = default_timestamp
            
            job_recommendation = JobRecommendation(
                userId=UUID(user_id),
                jobId=str(rec.get("job_id")),
                score=rec.get("score"),
                timestamp=timestamp,
                createdAt=datetime.utcnow(),
                updatedAt=datetime.utcnow()
            )
            db.add(job_recommendation)
            saved_count += 1
        
        db.commit()
        return saved_count
        
    except Exception as e:
        db.rollback()
        raise Exception(f"Failed to save job recommendations: {str(e)}")


def get_job_recommendations(
    db: Session,
    user_id: str,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve job recommendations for a user from the database.
    
    Args:
        db: Database session
        user_id: UUID of the user
        limit: Maximum number of recommendations to return (None for all)
    
    Returns:
        List of recommendation dicts with job_id, score, timestamp
    """
    try:
        stmt = (
            select(JobRecommendation)
            .where(JobRecommendation.userId == UUID(user_id))
            .order_by(desc(JobRecommendation.score), desc(JobRecommendation.timestamp))
        )
        
        if limit:
            stmt = stmt.limit(limit)
        
        result = db.execute(stmt)
        recommendations = result.scalars().all()
        
        return [
            {
                "id": str(rec.id),
                "job_id": rec.jobId,
                "score": rec.score,
                "timestamp": rec.timestamp.isoformat() if rec.timestamp else None,
                "created_at": rec.createdAt.isoformat() if rec.createdAt else None,
            }
            for rec in recommendations
        ]
        
    except Exception as e:
        raise Exception(f"Failed to retrieve job recommendations: {str(e)}")


def query_job_matches(
    db: Session,
    embedding: list,
    limit: Optional[int] = None,
    offset: int = 0,
) -> list:
    """
    Run a cosine-similarity query against all jobs that have an embedding.

    Args:
        db: Database session
        embedding: User embedding as a list of floats
        limit: Max rows to return (None = all)
        offset: Row offset for pagination

    Returns:
        List of (Job, similarity_float) tuples ordered by descending similarity
    """
    job_vec = cast(Job.job_embedding, PgVector(1536))
    cosine_dist = job_vec.cosine_distance(embedding)
    similarity = (1 - cosine_dist).label("similarity")

    q = (
        db.query(Job, similarity)
        .filter(Job.job_embedding.isnot(None))
        .order_by(cosine_dist)
        .offset(offset)
    )
    if limit is not None:
        q = q.limit(limit)
    return q.all()


def recompute_recommendations(user_id: str) -> None:
    """
    Compute the top TOP_RECOMMENDATIONS_COUNT job matches for a user using
    cosine similarity and persist them to JobRecommendation, replacing any
    existing ones.

    Opens its own DB session, making it safe to call as a background task
    outside the request lifecycle.
    """
    db = SessionLocal()
    try:
        user_emb = db.query(UserEmbedding).filter_by(userId=user_id).first()
        if not user_emb:
            logging.warning(f"recompute_recommendations: no embedding found for user {user_id}")
            return

        raw = user_emb.embedding
        embedding_list = json.loads(raw) if isinstance(raw, str) else list(raw)

        rows = query_job_matches(db, embedding_list, limit=TOP_RECOMMENDATIONS_COUNT)

        recs = [{"job_id": str(j.id), "score": round(float(sim), 3)} for j, sim in rows]
        count = save_job_recommendations(db, user_id, recs)
        logging.info(f"Saved {count} job recommendations for user {user_id}")
    except Exception:
        logging.exception(f"Error recomputing job recommendations for user {user_id}")
    finally:
        db.close()

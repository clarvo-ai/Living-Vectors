"""
Service for saving job recommendations to the database.

This module provides functionality to save job recommendations generated
by the matching algorithm. The matching algorithm should call save_job_recommendations
after computing the top job matches for a user.
"""

from sqlalchemy.orm import Session
from sqlalchemy import delete
from typing import List, Dict, Optional, Any
from datetime import datetime
from uuid import UUID

# Note: JobRecommendation model will be auto-generated after running migrations
# Import will be: from python_utils.sqlalchemy_models import JobRecommendation


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
        # Import here to avoid errors before migration is run
        from python_utils.sqlalchemy_models import JobRecommendation
        
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
        from python_utils.sqlalchemy_models import JobRecommendation
        from sqlalchemy import select, desc
        
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


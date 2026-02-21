"""
Job embedding generation from description.

This module generates embedding vectors for jobs so they can be
matched against user embeddings using cosine similarity.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from python_utils.sqlalchemy_models import Job
from embedding_service import get_embedding
from database import SessionLocal
import logging


def generate_job_embedding(job_id: str, db: Session) -> Job:
    """
    Generate embedding for an existing job from its description.
    
    Args:
        job_id: The job's ID (UUID as string)
        db: Database session
        
    Returns:
        The updated Job record with embedding
        
    Raises:
        ValueError: If job not found
    """
    job = db.query(Job).filter_by(id=job_id).first()
    
    if not job:
        raise ValueError(f"Job {job_id} not found")
    
    # Combine title + company + description for richer embedding
    # This gives the embedding more context about the role
    text = f"{job.job_title} at {job.company_name}. {job.job_description}"
    
    # Generate and store embedding
    job.job_embedding = get_embedding(text)
    db.commit()
    db.refresh(job)
    
    print(f"Generated embedding for job: {job.job_title} at {job.company_name}")
    return job

def generate_missing_embeddings():
    """Background task: generate embeddings for all jobs missing one."""
    db = SessionLocal()
    try:
        jobs = db.query(Job).filter(Job.job_embedding.is_(None)).all()
        if not jobs:
            logging.info("No jobs missing embeddings.")
            return

        for job in jobs:
            generate_job_embedding(str(job.id), db)

        logging.info(f"Generated embeddings for {len(jobs)} jobs")
    except Exception as e:
        db.rollback()
        logging.exception("Error generating missing job embeddings")
    finally:
        db.close()

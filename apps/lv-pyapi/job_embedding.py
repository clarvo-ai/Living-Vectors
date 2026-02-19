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


def create_job_with_embedding(
    title: str,
    company_name: str,
    job_description: str,
    country: str,
    city: Optional[str],
    working_mode: Optional[str],
    db: Session
) -> Job:
    """
    Create a new job and generate its embedding in one step.
    
    This is the main function to use when adding new jobs to the system.
    It creates the job record and immediately generates its embedding.
    
    Args:
        title: Job title (e.g., "Frontend Developer")
        company_name: Company name (e.g., "TechCorp")
        job_description: Full job description
        country: Country (e.g., "Finland")
        city: Optional city (e.g., "Helsinki")
        working_mode: Optional working mode (e.g., "Remote", "On-site")
        db: Database session
        
    Returns:
        The new Job record with embedding
    """
    # Generate embedding from job info
    text = f"{title} at {company_name}. {job_description}"
    embedding = get_embedding(text)
    
    # Create job with embedding
    job = Job(
        job_title=title,
        company_name=company_name,
        job_description=job_description,
        country=country,
        city=city,
        working_mode=working_mode,
        job_embedding=embedding,
        job_is_active=True,
        summer_job_internship=False,
        source_url=f"manual://{company_name.lower().replace(' ', '-')}/{title.lower().replace(' ', '-')}",
        apply_link="",
        source="manual",
        updated_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    print(f"Created job with embedding: {title} at {company_name}")
    return job


def generate_missing_embeddings():
    """Background task: generate embeddings for all jobs missing one."""
    db = SessionLocal()
    try:
        jobs = db.query(Job).filter(Job.job_embedding == None).all()
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

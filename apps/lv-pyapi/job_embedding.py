"""
Job embedding generation from description.

This module generates embedding vectors for jobs so they can be
matched against user embeddings using cosine similarity.
"""
from typing import Optional
from sqlalchemy.orm import Session
from python_utils.sqlalchemy_models import Job
from embedding_service import get_embedding


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
    text = f"{job.title} at {job.company}. {job.description}"
    
    # Generate and store embedding
    job.embedding = get_embedding(text)
    db.commit()
    db.refresh(job)
    
    print(f"Generated embedding for job: {job.title} at {job.company}")
    return job


def create_job_with_embedding(
    title: str,
    company: str,
    description: str,
    location: Optional[str],
    db: Session
) -> Job:
    """
    Create a new job and generate its embedding in one step.
    
    This is the main function to use when adding new jobs to the system.
    It creates the job record and immediately generates its embedding.
    
    Args:
        title: Job title (e.g., "Frontend Developer")
        company: Company name (e.g., "TechCorp")
        description: Full job description
        location: Optional location (e.g., "Remote", "Helsinki")
        db: Database session
        
    Returns:
        The new Job record with embedding
    """
    # Generate embedding from job info
    text = f"{title} at {company}. {description}"
    embedding = get_embedding(text)
    
    # Create job with embedding
    job = Job(
        title=title,
        company=company,
        description=description,
        location=location,
        embedding=embedding
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    print(f"Created job with embedding: {title} at {company}")
    return job

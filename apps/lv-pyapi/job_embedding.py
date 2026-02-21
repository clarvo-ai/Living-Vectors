"""
Job embedding generation from structured fields.

This module generates embedding vectors for jobs so they can be
matched against user embeddings using cosine similarity.
"""
from sqlalchemy.orm import Session
from python_utils.sqlalchemy_models import Job
from embedding_service import get_embedding
from database import SessionLocal
import logging


def _build_job_text(job: Job) -> str:
    """
    Build a clean, structured text representation of a job for embedding.
    """
    parts = []

    # Role identity
    parts.append(f"Job title: {job.job_title}.")
    parts.append(f"Company: {job.company_name}.")

    if job.company_industry:
        parts.append(f"Industry: {job.company_industry}.")
    if job.company_size:
        parts.append(f"Company size: {job.company_size}.")
    if job.company_culture:
        parts.append(f"Company culture: {job.company_culture}.")
    if job.company_values:
        parts.append(f"Company values: {', '.join(job.company_values)}.")

    # Seniority & type
    if job.job_level:
        parts.append(f"Level: {job.job_level}.")
    if job.employment_type:
        parts.append(f"Employment type: {job.employment_type}.")
    if job.contract_type:
        parts.append(f"Contract: {job.contract_type}.")
    if job.summer_job_internship:
        parts.append("This is a summer job internship.")

    # Location & work mode
    location_parts = list(filter(None, [job.city, job.country]))
    if location_parts:
        parts.append(f"Location: {', '.join(location_parts)}.")
    if job.working_mode:
        parts.append(f"Work mode: {job.working_mode}.")

    # Skills
    if job.required_skills:
        parts.append(f"Required skills: {', '.join(job.required_skills)}.")
    if job.nice_to_have_skills:
        parts.append(f"Nice to have skills: {', '.join(job.nice_to_have_skills)}.")

    # Requirements & experience
    if job.requirements:
        parts.append(f"Requirements: {'; '.join(job.requirements)}.")
    if job.required_experience_months:
        years = job.required_experience_months / 12
        parts.append(f"Required experience: {years:.1f} years.")
    if job.required_education:
        parts.append(f"Required education: {', '.join(job.required_education)}.")

    # Languages
    if job.required_languages:
        parts.append(f"Required languages: {', '.join(job.required_languages)}.")
    if job.nice_to_have_languages:
        parts.append(f"Nice to have languages: {', '.join(job.nice_to_have_languages)}.")

    # Compensation
    salary_min = job.salary_min or job.guessed_salary_min
    salary_max = job.salary_max or job.guessed_salary_max
    if salary_min and salary_max:
        parts.append(f"Salary: {salary_min}–{salary_max} EUR/month.")
    elif salary_min:
        parts.append(f"Salary: from {salary_min} EUR/month.")

    # Structured summary (concise, already cleaned by the pipeline)
    if job.job_description_summary:
        parts.append(job.job_description_summary)

    return " ".join(parts)


def generate_job_embedding(job_id: str, db: Session) -> Job:
    """
    Generate embedding for an existing job from its structured fields.

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

    text = _build_job_text(job)

    job.job_embedding = get_embedding(text)
    db.commit()
    db.refresh(job)

    logging.info(f"Generated embedding for job: {job.job_title} at {job.company_name}")
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

import os
import uuid
import json
import pytest
from datetime import datetime
from unittest.mock import patch, call
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from job_embedding import generate_job_embedding
from python_utils.sqlalchemy_models import Job

raw_url = os.getenv("TEST_DATABASE_URL")
assert raw_url, "TEST_DATABASE_URL is not set"
TEST_DATABASE_URL = raw_url

FAKE_EMBEDDING = [0.2] * 1536
UPDATED_EMBEDDING = [0.9] * 1536


@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_test_job(
    db_session: Session,
    title: str = "Software Engineer",
    company: str = "TestCorp",
    description: str = "Build great software.",
) -> Job:
    unique = uuid.uuid4().hex
    job = Job(
        job_title=title,
        company_name=company,
        job_description=description,
        job_is_active=True,
        country="Finland",
        source_url=f"https://testcorp.example.com/jobs/{unique}",
        apply_link=f"https://testcorp.example.com/apply/{unique}",
        source="test",
        summer_job_internship=False,
        updated_at=datetime.now(),
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


def parse_embedding(value) -> list:
    """Normalize embedding from DB (may be a string or list) to a list of floats."""
    if isinstance(value, str):
        return json.loads(value)
    return list(value)


@patch("job_embedding.get_embedding", return_value=FAKE_EMBEDDING)
def test_generate_job_embedding_creates_embedding(mock_embed, db_session: Session):
    """Generates and stores an embedding on the Job record."""
    job = create_test_job(db_session)

    result = generate_job_embedding(str(job.id), db_session)

    assert result is not None
    assert str(result.id) == str(job.id)
    assert parse_embedding(result.job_embedding) == FAKE_EMBEDDING
    mock_embed.assert_called_once()


@patch("job_embedding.get_embedding", return_value=FAKE_EMBEDDING)
def test_generate_job_embedding_raises_for_missing_job(mock_embed, db_session: Session):
    """Raises ValueError when the job ID does not exist."""
    missing_id = str(uuid.uuid4())

    with pytest.raises(ValueError, match=missing_id):
        generate_job_embedding(missing_id, db_session)

    mock_embed.assert_not_called()


@patch("job_embedding.get_embedding", return_value=FAKE_EMBEDDING)
def test_generate_job_embedding_uses_title_company_and_description(mock_embed, db_session: Session):
    """Passes a combined text of title, company, and description to get_embedding."""
    job = create_test_job(
        db_session,
        title="DevOps Engineer",
        company="CloudCo",
        description="Manage Kubernetes clusters.",
    )

    generate_job_embedding(str(job.id), db_session)

    expected_text = "DevOps Engineer at CloudCo. Manage Kubernetes clusters."
    mock_embed.assert_called_once_with(expected_text)


@patch("job_embedding.get_embedding")
def test_generate_job_embedding_overwrites_existing(mock_embed, db_session: Session):
    """Calling generate again overwrites the embedding on the same Job record."""
    mock_embed.return_value = FAKE_EMBEDDING
    job = create_test_job(db_session)

    first = generate_job_embedding(str(job.id), db_session)
    assert parse_embedding(first.job_embedding) == FAKE_EMBEDDING

    mock_embed.return_value = UPDATED_EMBEDDING
    second = generate_job_embedding(str(job.id), db_session)

    assert str(second.id) == str(first.id)
    assert parse_embedding(second.job_embedding) == UPDATED_EMBEDDING
    assert mock_embed.call_count == 2

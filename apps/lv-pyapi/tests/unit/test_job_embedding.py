import os
import uuid
import json
import pytest
from datetime import datetime
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from job_embedding import generate_job_embedding, _build_job_text
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
        company_industry="Technology",
        company_size="50-200",
        company_culture="Collaborative and innovative",
        company_values=["Transparency", "Growth"],
        job_level="mid",
        employment_type="full-time",
        working_mode="hybrid",
        required_skills=["Python", "Docker"],
        nice_to_have_skills=["Kubernetes"],
        required_languages=["English"],
        nice_to_have_languages=["Finnish"],
        required_experience_months=24,
        required_education=["bachelor degree"],
        requirements=["3+ years of experience", "Strong communication skills"],
        salary_min=4000,
        salary_max=6000,
        job_description_summary="A senior role building scalable systems.",
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
def test_generate_job_embedding_uses_structured_fields(mock_embed, db_session: Session):
    """Embedding text is built from structured fields."""
    job = create_test_job(
        db_session,
        title="DevOps Engineer",
        company="CloudCo",
        description="Building scalable systems.",
    )

    generate_job_embedding(str(job.id), db_session)

    expected_text = _build_job_text(job)
    mock_embed.assert_called_once_with(expected_text)

    # Core identity
    assert "DevOps Engineer" in expected_text
    assert "CloudCo" in expected_text
    assert "Technology" in expected_text
    assert "50-200" in expected_text
    assert "Collaborative and innovative" in expected_text
    assert "Transparency" in expected_text
    # Seniority & type
    assert "mid" in expected_text
    assert "full-time" in expected_text
    assert "hybrid" in expected_text
    # Skills
    assert "Python" in expected_text
    assert "Docker" in expected_text
    assert "Kubernetes" in expected_text
    # Languages
    assert "English" in expected_text
    assert "Finnish" in expected_text
    # Experience & education
    assert "2.0 years" in expected_text
    assert "bachelor degree" in expected_text
    # Compensation
    assert "4000" in expected_text
    assert "6000" in expected_text
    # Summary
    assert "scalable systems" in expected_text


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

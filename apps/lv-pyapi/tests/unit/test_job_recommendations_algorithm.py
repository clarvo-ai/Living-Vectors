import os
import uuid
import pytest
from datetime import datetime
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from job_recommendations import (
    query_job_matches,
    save_job_recommendations,
    get_job_recommendations,
    recompute_recommendations,
    TOP_RECOMMENDATIONS_COUNT,
)
from python_utils.sqlalchemy_models import Job, JobRecommendation, User, UserEmbedding

raw_url = os.getenv("TEST_DATABASE_URL")
assert raw_url, "TEST_DATABASE_URL is not set"
TEST_DATABASE_URL = raw_url

# Unit vectors: cosine similarity between USER_VEC and JOB_VEC_CLOSE = 1.0,
# between USER_VEC and JOB_VEC_FAR = 0.0 (orthogonal).
# This gives us a deterministic ranking to assert against.
DIM = 1536
USER_VEC = [1.0] + [0.0] * (DIM - 1)
JOB_VEC_CLOSE = [1.0] + [0.0] * (DIM - 1)   # cosine sim ≈ 1.0
JOB_VEC_MID   = [0.7] + [0.7] + [0.0] * (DIM - 2)  # cosine sim ≈ 0.7
JOB_VEC_FAR   = [0.0] + [1.0] + [0.0] * (DIM - 2)  # cosine sim ≈ 0.0


@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_test_user(db: Session) -> User:
    user = User(
        id=str(uuid.uuid4()),
        email=f"{uuid.uuid4()}@test.com",
        updatedAt=datetime.now(),
    )
    db.add(user)
    db.commit()
    return user


def create_user_embedding(db: Session, user_id: str, vec: list) -> UserEmbedding:
    emb = UserEmbedding(
        userId=user_id,
        embedding=vec,
        updatedAt=datetime.now(),
    )
    db.add(emb)
    db.commit()
    return emb


def create_test_job(db: Session, vec: list | None = None) -> Job:
    """Create a job, optionally with a pre-set embedding vector."""
    unique = uuid.uuid4().hex
    job = Job(
        job_title=f"Job {unique[:6]}",
        company_name="TestCorp",
        job_description="Test description.",
        job_is_active=True,
        country="Finland",
        source_url=f"https://test.example.com/jobs/{unique}",
        apply_link=f"https://test.example.com/apply/{unique}",
        source="test",
        summer_job_internship=False,
        updated_at=datetime.now(),
        job_embedding=vec,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


# ── query_job_matches ─────────────────────────────────────────────────────────

def test_query_job_matches_returns_jobs_sorted_by_similarity(db_session: Session):
    """Jobs with embeddings closer to the query vector rank higher."""
    job_close = create_test_job(db_session, vec=JOB_VEC_CLOSE)
    job_mid   = create_test_job(db_session, vec=JOB_VEC_MID)
    job_far   = create_test_job(db_session, vec=JOB_VEC_FAR)

    rows = query_job_matches(db_session, USER_VEC)

    # Extract IDs of our three test jobs in the result order
    result_ids = [str(j.id) for j, _ in rows]
    our_ids = [str(job_close.id), str(job_mid.id), str(job_far.id)]
    positions = [result_ids.index(uid) for uid in our_ids if uid in result_ids]

    # close < mid < far in the result list (lower index = higher similarity)
    assert positions == sorted(positions), "Jobs not ordered by descending similarity"


def test_query_job_matches_skips_jobs_without_embedding(db_session: Session):
    """Jobs missing an embedding are excluded from results."""
    job_with = create_test_job(db_session, vec=JOB_VEC_CLOSE)
    job_without = create_test_job(db_session, vec=None)

    rows = query_job_matches(db_session, USER_VEC)
    result_ids = {str(j.id) for j, _ in rows}

    assert str(job_with.id) in result_ids
    assert str(job_without.id) not in result_ids


def test_query_job_matches_respects_limit(db_session: Session):
    """limit correctly caps the number of results."""
    for _ in range(5):
        create_test_job(db_session, vec=JOB_VEC_CLOSE)

    results = query_job_matches(db_session, USER_VEC, limit=3, offset=0)
    assert len(results) == 3


def test_query_job_matches_offset_reduces_results(db_session: Session):
    """offset skips rows, returning fewer results on the last page."""
    for _ in range(4):
        create_test_job(db_session, vec=JOB_VEC_CLOSE)

    all_results = query_job_matches(db_session, USER_VEC, limit=1000, offset=0)
    total = len(all_results)
    assert total >= 4

    # Offsetting past total should return empty or fewer than limit
    beyond = query_job_matches(db_session, USER_VEC, limit=10, offset=total)
    assert len(beyond) == 0


def test_query_job_matches_similarity_values_are_in_range(db_session: Session):
    """Similarity scores returned are between -1 and 1."""
    create_test_job(db_session, vec=JOB_VEC_CLOSE)
    create_test_job(db_session, vec=JOB_VEC_FAR)

    rows = query_job_matches(db_session, USER_VEC)
    for _, sim in rows:
        assert -1.0 <= float(sim) <= 1.0


# ── save_job_recommendations ──────────────────────────────────────────────────

def test_save_job_recommendations_persists_records(db_session: Session):
    """Saved recommendations appear in the JobRecommendation table."""
    user = create_test_user(db_session)
    job = create_test_job(db_session, vec=JOB_VEC_CLOSE)

    count = save_job_recommendations(
        db_session, str(user.id), [{"job_id": str(job.id), "score": 0.95}]
    )

    assert count == 1
    recs = db_session.query(JobRecommendation).filter_by(userId=user.id).all()
    assert len(recs) == 1
    assert recs[0].jobId == str(job.id)
    assert recs[0].score == pytest.approx(0.95)


def test_save_job_recommendations_replaces_existing_by_default(db_session: Session):
    """Calling save twice replaces the previous set (replace_existing=True)."""
    user = create_test_user(db_session)
    job1 = create_test_job(db_session, vec=JOB_VEC_CLOSE)
    job2 = create_test_job(db_session, vec=JOB_VEC_FAR)

    save_job_recommendations(db_session, str(user.id), [{"job_id": str(job1.id), "score": 0.9}])
    save_job_recommendations(db_session, str(user.id), [{"job_id": str(job2.id), "score": 0.5}])

    recs = db_session.query(JobRecommendation).filter_by(userId=user.id).all()
    assert len(recs) == 1
    assert recs[0].jobId == str(job2.id)


def test_save_job_recommendations_appends_when_replace_false(db_session: Session):
    """With replace_existing=False, new records are appended."""
    user = create_test_user(db_session)
    job1 = create_test_job(db_session, vec=JOB_VEC_CLOSE)
    job2 = create_test_job(db_session, vec=JOB_VEC_FAR)

    save_job_recommendations(db_session, str(user.id), [{"job_id": str(job1.id), "score": 0.9}])
    save_job_recommendations(
        db_session, str(user.id), [{"job_id": str(job2.id), "score": 0.5}], replace_existing=False
    )

    recs = db_session.query(JobRecommendation).filter_by(userId=user.id).all()
    assert len(recs) == 2


# ── get_job_recommendations ───────────────────────────────────────────────────

def test_get_job_recommendations_returns_sorted_by_score(db_session: Session):
    """Results are ordered by score descending."""
    user = create_test_user(db_session)
    job_a = create_test_job(db_session, vec=JOB_VEC_CLOSE)
    job_b = create_test_job(db_session, vec=JOB_VEC_FAR)

    save_job_recommendations(
        db_session, str(user.id),
        [{"job_id": str(job_b.id), "score": 0.3},
         {"job_id": str(job_a.id), "score": 0.9}],
        replace_existing=True,
    )

    recs = get_job_recommendations(db_session, str(user.id))
    scores = [r["score"] for r in recs]
    assert scores == sorted(scores, reverse=True)


def test_get_job_recommendations_respects_limit(db_session: Session):
    """limit parameter caps the number of results returned."""
    user = create_test_user(db_session)
    jobs = [create_test_job(db_session, vec=JOB_VEC_CLOSE) for _ in range(5)]
    save_job_recommendations(
        db_session, str(user.id),
        [{"job_id": str(j.id), "score": 0.5} for j in jobs],
    )

    recs = get_job_recommendations(db_session, str(user.id), limit=3)
    assert len(recs) == 3


# ── recompute_recommendations ─────────────────────────────────────────────────

def test_recompute_recommendations_saves_top_matches(db_session: Session):
    """recompute_recommendations reads the user embedding and saves top matches."""
    user = create_test_user(db_session)
    create_user_embedding(db_session, str(user.id), USER_VEC)
    create_test_job(db_session, vec=JOB_VEC_CLOSE)
    create_test_job(db_session, vec=JOB_VEC_FAR)

    # Patch SessionLocal in job_recommendations to return our test session
    with patch("job_recommendations.SessionLocal", return_value=db_session):
        # Prevent db.close() from closing the shared test session
        with patch.object(db_session, "close"):
            recompute_recommendations(str(user.id))

    recs = db_session.query(JobRecommendation).filter_by(userId=user.id).all()

    # At least one recommendation was saved
    assert len(recs) >= 1
    # The cap is respected
    assert len(recs) <= TOP_RECOMMENDATIONS_COUNT


def test_recompute_recommendations_no_embedding_is_a_noop(db_session: Session):
    """recompute_recommendations does nothing when the user has no embedding."""
    user = create_test_user(db_session)  # no UserEmbedding created

    with patch("job_recommendations.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            recompute_recommendations(str(user.id))

    recs = db_session.query(JobRecommendation).filter_by(userId=user.id).all()
    assert recs == []


def test_recompute_recommendations_respects_top_count(db_session: Session):
    """Only TOP_RECOMMENDATIONS_COUNT jobs are saved at most."""
    user = create_test_user(db_session)
    create_user_embedding(db_session, str(user.id), USER_VEC)

    # Create more jobs than TOP_RECOMMENDATIONS_COUNT
    for _ in range(TOP_RECOMMENDATIONS_COUNT + 5):
        create_test_job(db_session, vec=JOB_VEC_CLOSE)

    with patch("job_recommendations.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            recompute_recommendations(str(user.id))

    recs = db_session.query(JobRecommendation).filter_by(userId=user.id).all()
    assert len(recs) <= TOP_RECOMMENDATIONS_COUNT

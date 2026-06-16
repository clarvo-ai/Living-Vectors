import os
import uuid
import json
import pytest
from datetime import datetime
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from user_embedding import generate_user_embedding
from python_utils.sqlalchemy_models import User, Learning, UserEmbedding

raw_url = os.getenv("TEST_DATABASE_URL")
assert raw_url, "TEST_DATABASE_URL is not set"
TEST_DATABASE_URL = raw_url

FAKE_EMBEDDING = [0.1] * 1536


@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_test_user(db_session: Session):
    user = User(
        id=str(uuid.uuid4()),
        email=f"{uuid.uuid4()}@test.com",
        updatedAt=datetime.now(),
    )
    db_session.add(user)
    db_session.commit()
    return user


def add_learning(db_session: Session, user_id: str, summary: str):
    learning = Learning(
        userId=user_id,
        summary=summary,
        soft_delete=False,
        updatedAt=datetime.now(),
    )
    db_session.add(learning)
    db_session.commit()
    return learning


def parse_embedding(value) -> list:
    """Normalize embedding from DB (may be a string or list) to a list of floats."""
    if isinstance(value, str):
        return json.loads(value)
    return list(value)


@patch("user_embedding.get_embedding", return_value=FAKE_EMBEDDING)
def test_generate_user_embedding_creates_record(mock_embed, db_session: Session):
    """Generates and stores an embedding for a user with learnings."""
    user = create_test_user(db_session)
    add_learning(db_session, str(user.id), "Enjoys frontend work with React.")
    add_learning(db_session, str(user.id), "Strong Python skills.")

    result = generate_user_embedding(str(user.id), db_session)

    assert result is not None
    assert result.userId == user.id
    assert parse_embedding(result.embedding) == FAKE_EMBEDDING
    mock_embed.assert_called_once()


@patch("user_embedding.get_embedding", return_value=FAKE_EMBEDDING)
def test_generate_user_embedding_returns_none_with_no_learnings(mock_embed, db_session: Session):
    """Returns None when user has no learnings."""
    user = create_test_user(db_session)

    result = generate_user_embedding(str(user.id), db_session)

    assert result is None
    mock_embed.assert_not_called()


@patch("user_embedding.get_embedding", return_value=FAKE_EMBEDDING)
def test_generate_user_embedding_updates_existing(mock_embed, db_session: Session):
    """Updates the embedding record if one already exists."""
    user = create_test_user(db_session)
    add_learning(db_session, str(user.id), "Likes DevOps.")

    # First generation
    first = generate_user_embedding(str(user.id), db_session)
    first_id = first.id

    # Second generation — should update, not insert
    second = generate_user_embedding(str(user.id), db_session)

    assert second.id == first_id
    count = db_session.query(UserEmbedding).filter_by(userId=user.id).count()
    assert count == 1

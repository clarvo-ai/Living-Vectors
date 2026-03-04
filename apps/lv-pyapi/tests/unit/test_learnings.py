import os
import pytest
import uuid
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

import learnings
from python_utils.sqlalchemy_models import User, Learning

raw_url = os.getenv("TEST_DATABASE_URL")
assert raw_url, "TEST_DATABASE_URL is not set"
TEST_DATABASE_URL = raw_url


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
    user_id = str(uuid.uuid4())
    test_user = User(
        id=user_id,
        email=f"{uuid.uuid4()}@example.com",
        name="Test User",
        createdAt=datetime.now(),
        updatedAt=datetime.now(),
    )
    db_session.add(test_user)
    db_session.commit()
    return test_user


def test_save_learnings_to_db(db_session: Session):
    """Test saving learnings to database"""
    user = create_test_user(db_session)

    # Create learnings in the format expected by save_learnings_to_db
    learnings_list: List[Dict[str, Any]] = [
        {
            'text': 'User likes cats',
            'messages': ['I like cats']
        },
        {
            'text': 'User enjoys coding',
            'messages': ['I enjoy coding']
        }
    ]

    learnings.save_learnings_to_db(str(user.id), learnings_list, [], db_session)

    stored = db_session.query(Learning).filter_by(userId=user.id).all()
    assert len(stored) == 2
    
    summaries = {l.summary for l in stored}
    assert 'User likes cats' in summaries
    assert 'User enjoys coding' in summaries


def test_get_current_insights_for_user(db_session: Session):
    """Test fetching current learnings for a user"""
    user = create_test_user(db_session)

    # Add some learnings
    learnings_list: List[Dict[str, Any]] = [
        {
            'text': 'First learning',
            'messages': ['Message 1']
        },
        {
            'text': 'Second learning',
            'messages': ['Message 2']
        }
    ]
    learnings.save_learnings_to_db(str(user.id), learnings_list, [], db_session)

    # Fetch current insights
    insights = learnings.get_current_insights_for_user(str(user.id), db_session)

    assert len(insights) == 2
    summaries = {i['summary'] for i in insights}
    assert 'First learning' in summaries
    assert 'Second learning' in summaries
    # Each insight should have an id and summary
    assert all('id' in i and 'summary' in i for i in insights)


def test_save_learnings_to_db_with_removals(db_session: Session):
    """Test saving learnings with removal of old ones"""
    user = create_test_user(db_session)

    # Create initial learning
    initial_learnings: List[Dict[str, Any]] = [
        {
            'text': 'Old learning',
            'messages': ['Old message']
        }
    ]
    learnings.save_learnings_to_db(str(user.id), initial_learnings, [], db_session)

    # Get the learning ID
    stored = db_session.query(Learning).filter_by(userId=user.id).all()
    assert len(stored) == 1
    old_id = stored[0].id

    # Now save new learning and remove the old one
    new_learnings: List[Dict[str, Any]] = [
        {
            'text': 'New learning',
            'messages': ['New message']
        }
    ]
    learnings.save_learnings_to_db(str(user.id), new_learnings, [old_id], db_session)

    # Verify old was removed and new was added
    stored = db_session.query(Learning).filter_by(userId=user.id).all()
    assert len(stored) == 1
    assert stored[0].summary == 'New learning'


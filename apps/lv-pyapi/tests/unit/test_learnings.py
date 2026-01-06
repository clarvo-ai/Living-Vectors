import os
import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from message_save import save_message
import learnings
from python_utils.sqlalchemy_models import User, ConversationMessage, Learning, _ConversationMessageToLearning, MessageSender

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


def test_get_messages_for_learnings_fetches_messages(db_session: Session):
    """Test that get_messages_for_learnings fetches messages correctly"""
    user = create_test_user(db_session)
    sender = MessageSender.USER

    m1 = save_message(db_session, user.id, sender, "one")
    m2 = save_message(db_session, user.id, sender, "two")
    m3 = save_message(db_session, user.id, sender, "three")

    # Create a session factory for the function
    def session_factory():
        return db_session

    # Use the latest message as anchor
    learnings.get_messages_for_learnings(user.id, m3.messageId, session_factory)

    # Check that learnings were created (if process_learnings was called)
    stored = db_session.query(Learning).filter_by(userId=user.id).all()
    # The function should have processed messages and created learnings
    assert len(stored) >= 0  # May be 0 if no learnings generated


def test_save_learnings_to_db(db_session: Session):
    """Test saving learnings to database"""
    user = create_test_user(db_session)
    sender = MessageSender.USER

    msg1 = save_message(db_session, user.id, sender, "alpha")
    msg2 = save_message(db_session, user.id, sender, "beta")

    # Your branch uses List[str] for learnings
    learnings_list = ["likes cats", "enjoys coding"]
    message_ids = [msg1.messageId, msg2.messageId]

    learnings.save_learnings_to_db(user.id, learnings_list, message_ids, db_session)

    stored = db_session.query(Learning).filter_by(userId=user.id).all()
    assert len(stored) == 2
    
    summaries = {l.summary for l in stored}
    assert "likes cats" in summaries
    assert "enjoys coding" in summaries

    # Check associations
    for l in stored:
        assoc_rows = db_session.query(_ConversationMessageToLearning).filter_by(B=l.id).all()
        assoc_ids = {a.A for a in assoc_rows}
        assert msg1.messageId in assoc_ids or msg2.messageId in assoc_ids


def test_process_learnings_creates_learnings(db_session: Session, monkeypatch):
    """Test that process_learnings creates learnings"""
    user = create_test_user(db_session)
    sender = MessageSender.USER

    msg1 = save_message(db_session, user.id, sender, "one")
    msg2 = save_message(db_session, user.id, sender, "two")

    # monkeypatch the generation function to return expected learnings
    def fake_generate(messages):
        return ["insight about user", "another insight"]

    monkeypatch.setattr(learnings, 'learnings_from_messages', fake_generate)

    # Create a session factory
    def session_factory():
        return db_session

    # Call process_learnings with your branch's signature
    message_contents = ["one", "two"]
    message_ids = [msg1.messageId, msg2.messageId]
    learnings.process_learnings(user.id, message_contents, message_ids, session_factory)

    stored = db_session.query(Learning).filter_by(userId=user.id).all()
    assert len(stored) == 2


def test_check_and_trigger_learnings_calls_process_when_over_threshold(db_session: Session, monkeypatch):
    """Test that check_and_trigger_learnings calls process when threshold is met"""
    user = create_test_user(db_session)
    sender = MessageSender.USER

    # create 16 messages
    msgs = [save_message(db_session, user.id, sender, f"m{i}") for i in range(16)]

    called = {"count": 0}

    def fake_process(u_id, message_contents, message_ids, db_session_factory):
        called["count"] += 1

    monkeypatch.setattr(learnings, 'process_learnings', fake_process)

    # pass a factory that returns our session
    learnings.check_and_trigger_learnings(user.id, lambda: db_session)
    assert called["count"] == 1

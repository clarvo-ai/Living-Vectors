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


def test_get_messages_for_learnings_returns_only_unlearned(db_session: Session):
    user = create_test_user(db_session)
    sender = MessageSender.USER

    m1 = save_message(db_session, user.id, sender, "one")
    m2 = save_message(db_session, user.id, sender, "two")
    m3 = save_message(db_session, user.id, sender, "three")

    # mark one as learned
    m2.learnedFrom = True
    db_session.commit()

    ids, messages = learnings.get_messages_for_learnings(user.id, db_session)
    returned_ids = set(ids)
    assert m1.messageId in returned_ids
    assert m3.messageId in returned_ids
    assert m2.messageId not in returned_ids


def test_save_learnings_and_mark_messages(db_session: Session):
    user = create_test_user(db_session)
    sender = MessageSender.USER

    msg1 = save_message(db_session, user.id, sender, "alpha")
    msg2 = save_message(db_session, user.id, sender, "beta")

    learnings_list = [{"content": "likes cats", "ids": [msg1.messageId, msg2.messageId]}]

    learnings.save_learnings_to_db(user.id, learnings_list, db_session)

    stored = db_session.query(Learning).filter_by(userId=user.id).all()
    assert len(stored) == 1
    l = stored[0]
    assert l.summary == "likes cats"

    # associations
    assoc_rows = db_session.query(_ConversationMessageToLearning).filter_by(B=l.id).all()
    assoc_ids = {a.A for a in assoc_rows}
    assert msg1.messageId in assoc_ids
    assert msg2.messageId in assoc_ids

    # mark messages as learned
    learnings.mark_messages_as_learned([msg1.messageId, msg2.messageId], db_session)
    refreshed1 = db_session.query(ConversationMessage).filter_by(messageId=msg1.messageId).first()
    refreshed2 = db_session.query(ConversationMessage).filter_by(messageId=msg2.messageId).first()
    assert refreshed1.learnedFrom is True
    assert refreshed2.learnedFrom is True


def test_process_learnings_creates_and_marks(db_session: Session, monkeypatch):
    user = create_test_user(db_session)
    sender = MessageSender.USER

    msg1 = save_message(db_session, user.id, sender, "one")
    msg2 = save_message(db_session, user.id, sender, "two")

    # monkeypatch the generation function to return expected learnings
    def fake_generate(messages):
        return [{"content": "insight", "ids": [msg1.messageId, msg2.messageId]}]

    monkeypatch.setattr(learnings, 'learnings_from_messages', fake_generate)

    # call process_learnings which should create Learning and mark messages
    learnings.process_learnings(user.id, db_session)

    stored = db_session.query(Learning).filter_by(userId=user.id).all()
    assert len(stored) == 1

    refreshed1 = db_session.query(ConversationMessage).filter_by(messageId=msg1.messageId).first()
    refreshed2 = db_session.query(ConversationMessage).filter_by(messageId=msg2.messageId).first()
    assert refreshed1.learnedFrom is True
    assert refreshed2.learnedFrom is True


def test_check_and_trigger_learnings_calls_process_when_over_threshold(db_session: Session, monkeypatch):
    user = create_test_user(db_session)
    sender = MessageSender.USER

    # create 16 unlearned messages
    msgs = [save_message(db_session, user.id, sender, f"m{i}") for i in range(16)]

    called = {"count": 0}

    def fake_process(u_id, db):
        called["count"] += 1

    monkeypatch.setattr(learnings, 'process_learnings', fake_process)

    # pass a factory that returns our session; note it will be closed by the function
    learnings.check_and_trigger_learnings(user.id, lambda: db_session)
    assert called["count"] == 1

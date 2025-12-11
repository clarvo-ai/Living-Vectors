import os
import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from message_save import save_message
from python_utils.sqlalchemy_models import Base, ConversationMessage, MessageSender, User

raw_url = os.getenv("TEST_DATABASE_URL")
assert raw_url, "TEST_DATABASE_URL is not set"
TEST_DATABASE_URL = raw_url


#this is a fixture that creates a database session for the tests
@pytest.fixture
def db_session():
    engine = create_engine(TEST_DATABASE_URL)

    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

#this is a test that saves a user message to the database
def test_save_user_message(db_session: Session):
    user_id = str(uuid.uuid4())
    sender = MessageSender.USER
    content = "Hello world"


    test_user = User(id=user_id, email=f"{uuid.uuid4()}@example.com", name="Test User", createdAt=datetime.now(), updatedAt=datetime.now())
    db_session.add(test_user)
    db_session.commit()

    msg = save_message(db_session, user_id, sender, content)
    assert msg.userId == test_user.id
    assert msg.sender == sender
    assert msg.content == content
    assert msg.messageId is not None
    assert msg.createdAt is not None

    stored = db_session.query(ConversationMessage).filter_by(messageId=msg.messageId).first()
    assert stored is not None
    assert stored.sender == sender
    assert stored.content == content

#this is a test that saves an AI message to the database
def test_save_ai_message(db_session: Session):
    user_id = str(uuid.uuid4())
    sender = MessageSender.AI
    content = "Hello world"

    test_user = User(id=user_id, email=f"{uuid.uuid4()}@example.com", name="Test User", createdAt=datetime.now(), updatedAt=datetime.now())
    db_session.add(test_user)
    db_session.commit()

    msg = save_message(db_session, user_id, sender, content)
    assert msg.userId == test_user.id
    assert msg.sender == sender
    assert msg.content == content
    assert msg.messageId is not None
    assert msg.createdAt is not None

    stored = db_session.query(ConversationMessage).filter_by(messageId=msg.messageId).first()
    assert stored is not None
    assert stored.sender == sender
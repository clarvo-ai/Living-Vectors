import os
import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from message_save import save_message
from python_utils.sqlalchemy_models import Base, ConversationMessage, MessageSender, User, Learning, _ConversationMessageToLearning

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

def test_create_learning_with_messages(db_session: Session):
    user_id = str(uuid.uuid4())
    sender = MessageSender.USER

    test_user = User(
        id=user_id, 
        email=f"{uuid.uuid4()}@example.com", 
        name="Test User", 
        createdAt=datetime.now(), 
        updatedAt=datetime.now()
    )
    db_session.add(test_user)
    db_session.commit()

    msg1_content = "I like cats."
    msg1 = save_message(db_session, user_id, sender, msg1_content)

    msg2_content = "Cats are great pets!"
    msg2 = save_message(db_session, user_id, sender, msg2_content)

    summary_text = "User likes cats."

    # Create learning first
    test_learning = Learning(
        userId=user_id,
        summary=summary_text,
        updatedAt=datetime.now()
    )
    db_session.add(test_learning)
    db_session.flush()  # Get the learning ID

    # Associating messages with learning using A (messageId) and B (learningId)
    assoc1 = _ConversationMessageToLearning(A=msg1.messageId, B=test_learning.id)
    assoc2 = _ConversationMessageToLearning(A=msg2.messageId, B=test_learning.id)

    db_session.add(assoc1)
    db_session.add(assoc2)
    db_session.commit()
    db_session.refresh(test_learning)

    stored = db_session.query(Learning).filter_by(id=test_learning.id).first()
    assert stored is not None
    assert stored.summary == summary_text
    assert len(stored._ConversationMessageToLearning) == 2
    
    message_contents = [assoc.conversationMessage.content for assoc in stored._ConversationMessageToLearning]
    assert msg1_content in message_contents
    assert msg2_content in message_contents
    
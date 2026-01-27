import os
import pytest
import uuid
from datetime import datetime
from typing import Dict, Any, cast
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from livekit_learnings import (
    extract_career_learnings_from_conversation,
    _calculate_similarity,
    _is_similar_learning,
    _filter_sensitive_content,
    save_livekit_messages_to_db,
    save_general_learnings_to_db,
    process_livekit_session_learnings,
    SIMILARITY_THRESHOLD,
)
from python_utils.sqlalchemy_models import User, ConversationMessage, GeneralLearning, MessageSender

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


class TestCalculateSimilarity:
    """Tests for _calculate_similarity function"""
    
    def test_identical_strings(self):
        """Test that identical strings have similarity of 1.0"""
        similarity = _calculate_similarity("Hello world", "Hello world")
        assert similarity == 1.0
    
    def test_different_strings(self):
        """Test that different strings have low similarity"""
        similarity = _calculate_similarity("I like coding", "I like cats")
        assert similarity < 0.8


class TestIsSimilarLearning:
    """Tests for _is_similar_learning function"""
    
    def test_exact_duplicate(self):
        """Test that exact duplicates are detected"""
        existing = ["I like coding", "I enjoy Python"]
        assert _is_similar_learning("I like coding", existing) is True
    
    def test_similar_above_threshold(self):
        """Test that similar learnings above threshold are detected"""
        existing = ["I like coding in Python"]
        new = "I like coding with Python"
        assert _is_similar_learning(new, existing, threshold=0.8) is True
    
    def test_different_below_threshold(self):
        """Test that different learnings below threshold are not detected"""
        existing = ["I like coding"]
        new = "I like cats"
        assert _is_similar_learning(new, existing) is False


class TestFilterSensitiveContent:
    """Tests for _filter_sensitive_content function"""
    
    def test_normal_learning_passes(self):
        """Test that normal career learnings pass through"""
        learnings = ["I like coding", "I enjoy web development"]
        filtered = _filter_sensitive_content(learnings)
        assert len(filtered) == 2
        assert filtered == learnings
    
    def test_health_keywords_filtered(self):
        """Test that health-related keywords are filtered"""
        learnings = [
            "I like coding",
            "I was diagnosed with anxiety",
            "I enjoy programming"
        ]
        filtered = _filter_sensitive_content(learnings)
        assert len(filtered) == 2
        assert "I like coding" in filtered
        assert "I enjoy programming" in filtered
        assert "I was diagnosed with anxiety" not in filtered
    

class TestExtractCareerLearningsFromConversation:
    """Tests for extract_career_learnings_from_conversation function"""
    
    @patch('livekit_learnings.client.models.generate_content')
    def test_successful_extraction(self, mock_generate):
        """Test successful extraction of learnings"""
        mock_response = Mock()
        mock_response.parsed = {"learnings": ["I like coding", "I enjoy web development"]}
        mock_generate.return_value = mock_response
        
        messages = ["I like coding", "I enjoy web development"]
        result = extract_career_learnings_from_conversation(messages)
        
        assert len(result) == 2
        assert "I like coding" in result
        assert "I enjoy web development" in result
        mock_generate.assert_called_once()
    
    @patch('livekit_learnings.client.models.generate_content')
    def test_filters_sensitive_content(self, mock_generate):
        """Test that sensitive content is filtered from extracted learnings"""
        mock_response = Mock()
        mock_response.parsed = {
            "learnings": [
                "I like coding",
                "I was diagnosed with anxiety",
                "I enjoy programming"
            ]
        }
        mock_generate.return_value = mock_response
        
        messages = ["Some conversation"]
        result = extract_career_learnings_from_conversation(messages)
        
        assert len(result) == 2
        assert "I like coding" in result
        assert "I enjoy programming" in result
        assert "I was diagnosed with anxiety" not in result
    
    @patch('livekit_learnings.client.models.generate_content')
    def test_api_error_returns_empty_list(self, mock_generate):
        """Test that API errors return empty list"""
        mock_generate.side_effect = Exception("API Error")
        
        messages = ["Some conversation"]
        result = extract_career_learnings_from_conversation(messages)
        
        assert result == []


class TestSaveLivekitMessagesToDb:
    """Tests for save_livekit_messages_to_db function"""
    
    def test_save_user_and_ai_messages(self, db_session: Session):
        """Test saving both USER and AI messages"""
        user = create_test_user(db_session)
        messages = [
            ("USER", "Hello"),
            ("AI", "Hi there"),
            ("USER", "How are you?")
        ]
        
        message_ids = save_livekit_messages_to_db(db_session, str(user.id), messages, "session-1")
        
        assert len(message_ids) == 3
        stored = db_session.query(ConversationMessage).filter_by(userId=user.id).all()
        assert len(stored) == 3
        assert stored[0].sender == MessageSender.USER
        assert stored[0].content == "Hello"
        assert stored[1].sender == MessageSender.AI
        assert stored[1].content == "Hi there"
        assert stored[2].sender == MessageSender.USER
        assert stored[2].content == "How are you?"
    
    def test_empty_messages_list(self, db_session: Session):
        """Test handling of empty messages list"""
        user = create_test_user(db_session)
        message_ids = save_livekit_messages_to_db(db_session, str(user.id), [], "session-1")
        
        assert message_ids == []
    
    def test_error_rolls_back_transaction(self, db_session: Session):
        """Test that errors roll back the transaction"""
        user = create_test_user(db_session)
        # Use invalid user_id to cause error
        messages = [("USER", "Hello")]
        
        with pytest.raises(Exception):
            save_livekit_messages_to_db(db_session, "invalid-uuid", messages, "session-1")
        
        # Verify no messages were saved
        stored = db_session.query(ConversationMessage).all()
        assert len(stored) == 0


class TestSaveGeneralLearningsToDb:
    """Tests for save_general_learnings_to_db function"""
    
    def test_save_new_learnings(self, db_session: Session):
        """Test saving new learnings"""
        user = create_test_user(db_session)
        learnings = ["I like coding", "I enjoy Python"]
        
        saved = save_general_learnings_to_db(db_session, str(user.id), learnings, "session-1")
        
        assert len(saved) == 2
        stored = db_session.query(GeneralLearning).filter_by(userId=user.id).all()
        assert len(stored) == 2
    
    def test_skip_exact_duplicates(self, db_session: Session):
        """Test that exact duplicates are skipped"""
        user = create_test_user(db_session)
        
        # Save first learning
        now = datetime.now()
        gl1 = GeneralLearning(
            userId=user.id,
            summary="I like coding",
            sessionId="session-1",
            createdAt=now,
            updatedAt=now
        )
        db_session.add(gl1)
        db_session.commit()
        
        # Try to save duplicate
        learnings = ["I like coding", "I enjoy Python"]
        saved = save_general_learnings_to_db(db_session, str(user.id), learnings, "session-2")
        
        assert len(saved) == 1
        assert saved[0].summary == "I enjoy Python"
        stored = db_session.query(GeneralLearning).filter_by(userId=user.id).all()
        assert len(stored) == 2
    
    def test_skip_similar_learnings(self, db_session: Session):
        """Test that similar learnings above threshold are skipped"""
        user = create_test_user(db_session)
        
        # Save first learning
        now = datetime.now()
        gl1 = GeneralLearning(
            userId=user.id,
            summary="I like coding in Python",
            sessionId="session-1",
            createdAt=now,
            updatedAt=now
        )
        db_session.add(gl1)
        db_session.commit()
        
        # Try to save similar learning
        learnings = ["I like coding with Python", "I enjoy JavaScript"]
        saved = save_general_learnings_to_db(db_session, str(user.id), learnings, "session-2")
        
        # Should only save the different one
        assert len(saved) == 1
        assert saved[0].summary == "I enjoy JavaScript"
    
    def test_error_rolls_back_transaction(self, db_session: Session):
        """Test that errors roll back the transaction"""
        user = create_test_user(db_session)
        learnings = ["I like coding"]
        
        # Close session to cause error
        db_session.close()
        
        with pytest.raises(Exception):
            save_general_learnings_to_db(db_session, str(user.id), learnings, "session-1")


class TestProcessLivekitSessionLearnings:
    """Tests for process_livekit_session_learnings function"""
    
    @patch('livekit_learnings.extract_career_learnings_from_conversation')
    @patch('livekit_learnings.save_general_learnings_to_db')
    @patch('livekit_learnings.save_livekit_messages_to_db')
    @patch('livekit_learnings.SessionLocal')
    def test_full_processing_flow(self, mock_session_local, mock_save_messages, 
                                   mock_save_learnings, mock_extract, db_session: Session):
        """Test the full processing flow"""
        user = create_test_user(db_session)
        mock_session_local.return_value = db_session
        mock_save_messages.return_value = ["msg-1", "msg-2"]
        mock_extract.return_value = ["I like coding", "I enjoy Python"]
        mock_save_learnings.return_value = [Mock(summary="I like coding")]
        
        messages = [("USER", "Hello"), ("AI", "Hi")]
        process_livekit_session_learnings(str(user.id), "session-1", messages)
        
        mock_save_messages.assert_called_once()
        mock_extract.assert_called_once()
        mock_save_learnings.assert_called_once()
    
    @patch('livekit_learnings.extract_career_learnings_from_conversation')
    @patch('livekit_learnings.save_general_learnings_to_db')
    @patch('livekit_learnings.save_livekit_messages_to_db')
    @patch('livekit_learnings.SessionLocal')
    def test_no_learnings_extracted(self, mock_session_local, mock_save_messages, 
                                     mock_save_learnings, mock_extract, db_session: Session):
        """Test handling when no learnings are extracted"""
        user = create_test_user(db_session)
        mock_session_local.return_value = db_session
        mock_save_messages.return_value = ["msg-1"]
        mock_extract.return_value = []
        
        messages = [("USER", "Hello")]
        process_livekit_session_learnings(str(user.id), "session-1", messages)
        
        mock_save_messages.assert_called_once()
        mock_extract.assert_called_once()
        # save_general_learnings_to_db should not be called when no learnings
        mock_save_learnings.assert_not_called()
    

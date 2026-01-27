import sys
import pytest
import json
from unittest.mock import Mock, patch, MagicMock, AsyncMock

# Mock LiveKit modules before importing agent
mock_livekit = MagicMock()
mock_agents = MagicMock()
mock_plugins = MagicMock()
mock_google = MagicMock()

sys.modules['livekit'] = mock_livekit
sys.modules['livekit.agents'] = mock_agents
sys.modules['livekit.plugins'] = mock_plugins
sys.modules['livekit.plugins.google'] = mock_google

# Now import agent
from agent import my_agent, start_agent


@pytest.fixture
def mock_livekit_session():
    """Fixture that creates a properly configured mock LiveKit session"""
    session = AsyncMock()
    
    # Mock session.on to work as a decorator (returns the function unchanged)
    def on_decorator(event_name):
        def decorator(func):
            return func
        return decorator
    session.on = Mock(side_effect=on_decorator)
    
    session.start = AsyncMock()
    session.generate_reply = AsyncMock()
    
    return session


class TestMyAgent:
    """Tests for my_agent function"""
    
    @pytest.mark.asyncio
    @patch('agent.process_livekit_session_learnings')
    @patch('agent.AgentSession')
    @patch('agent.google.realtime.RealtimeModel')
    @patch('agent.GOOGLE_API_KEY', 'test-api-key')
    async def test_extracts_user_id_from_metadata(self, mock_realtime_model, mock_session_class, mock_process, mock_livekit_session):
        """Test that user_id is extracted from job metadata"""
        mock_ctx = Mock()
        mock_ctx.room = Mock()
        mock_ctx.room.name = "test-room"
        mock_ctx.room.remote_participants = []
        mock_ctx.job = Mock()
        mock_ctx.job.metadata = json.dumps({"user_id": "test-user-123"})
        
        mock_session_class.return_value = mock_livekit_session
        
        # Mock history with messages so process_livekit_session_learnings is called
        mock_msg = Mock()
        mock_msg.role = "user"
        mock_msg.content = "Hello"
        mock_livekit_session.history = Mock()
        mock_livekit_session.history.messages = [mock_msg]
        
        await my_agent(mock_ctx)
        
        # Verify process_livekit_session_learnings was called with correct user_id
        mock_process.assert_called_once()
        call_args = mock_process.call_args
        assert call_args[0][0] == "test-user-123"
        assert call_args[0][1] == "test-room"
    
    @pytest.mark.asyncio
    @patch('agent.process_livekit_session_learnings')
    @patch('agent.AgentSession')
    @patch('agent.google.realtime.RealtimeModel')
    @patch('agent.GOOGLE_API_KEY', 'test-api-key')
    async def test_handles_userId_in_metadata(self, mock_realtime_model, mock_session_class, mock_process, mock_livekit_session):
        """Test that userId (camelCase) is also extracted from metadata"""
        mock_ctx = Mock()
        mock_ctx.room = Mock()
        mock_ctx.room.name = "test-room"
        mock_ctx.room.remote_participants = []
        mock_ctx.job = Mock()
        mock_ctx.job.metadata = json.dumps({"userId": "test-user-456"})
        
        mock_session_class.return_value = mock_livekit_session
        
        # Mock history with messages so process_livekit_session_learnings is called
        mock_msg = Mock()
        mock_msg.role = "user"
        mock_msg.content = "Hello"
        mock_livekit_session.history = Mock()
        mock_livekit_session.history.messages = [mock_msg]
        
        await my_agent(mock_ctx)
        
        # Verify process was called with userId extracted correctly
        mock_process.assert_called_once()
        call_args = mock_process.call_args
        assert call_args[0][0] == "test-user-456"
    
    @pytest.mark.asyncio
    @patch('agent.process_livekit_session_learnings')
    @patch('agent.AgentSession')
    @patch('agent.google.realtime.RealtimeModel')
    @patch('agent.GOOGLE_API_KEY', 'test-api-key')
    async def test_no_user_id_skips_processing(self, mock_realtime_model, mock_session_class, mock_process, mock_livekit_session):
        """Test that missing user_id skips learnings processing"""
        mock_ctx = Mock()
        mock_ctx.room = Mock()
        mock_ctx.room.name = "test-room"
        mock_ctx.room.remote_participants = []
        mock_ctx.job = Mock()
        mock_ctx.job.metadata = json.dumps({})
        
        mock_session_class.return_value = mock_livekit_session
        mock_livekit_session.history = None
        
        await my_agent(mock_ctx)
        
        # Should not call process_livekit_session_learnings when no user_id
        mock_process.assert_not_called()
    
    @pytest.mark.asyncio
    @patch('agent.process_livekit_session_learnings')
    @patch('agent.AgentSession')
    @patch('agent.google.realtime.RealtimeModel')
    @patch('agent.GOOGLE_API_KEY', 'test-api-key')
    async def test_deduplicates_messages_from_history(self, mock_realtime_model, mock_session_class, mock_process, mock_livekit_session):
        """Test that messages from history are deduplicated"""
        mock_ctx = Mock()
        mock_ctx.room = Mock()
        mock_ctx.room.name = "test-room"
        mock_ctx.room.remote_participants = []
        mock_ctx.job = Mock()
        mock_ctx.job.metadata = json.dumps({"user_id": "test-user"})
        
        mock_session_class.return_value = mock_livekit_session
        
        # Mock history with duplicate messages
        # Use spec to limit attributes so text_content doesn't exist
        mock_msg1 = Mock(spec=['role', 'content'])
        mock_msg1.role = "user"
        mock_msg1.content = "Hello"
        mock_msg2 = Mock(spec=['role', 'content'])
        mock_msg2.role = "assistant"
        mock_msg2.content = "Hi there"
        
        mock_livekit_session.history = Mock()
        mock_livekit_session.history.messages = [mock_msg1, mock_msg2]
        
        await my_agent(mock_ctx)
        
        # Verify process was called with deduplicated messages
        mock_process.assert_called_once()
        call_args = mock_process.call_args
        messages = call_args[0][2]
        
        # Should have both USER and AI messages
        assert len(messages) == 2
        roles = [role for role, _ in messages]
        assert "USER" in roles
        assert "AI" in roles
        
        # Verify content is correct
        contents = [content for _, content in messages]
        assert "Hello" in contents
        assert "Hi there" in contents


class TestStartAgent:
    """Tests for start_agent function"""
    
    @patch('agent.multiprocessing.Process')
    def test_start_agent_spawns_process(self, mock_process_class):
        """Test that start_agent spawns a new process"""
        mock_process = Mock()
        mock_process_class.return_value = mock_process
        
        start_agent()
        
        # Verify process was created and started
        mock_process_class.assert_called_once()
        mock_process.start.assert_called_once()
    
    @patch('agent.multiprocessing.Process')
    def test_start_agent_target(self, mock_process_class):
        """Test that start_agent uses _run_worker_process as target"""
        mock_process = Mock()
        mock_process_class.return_value = mock_process
        
        start_agent()
        
        # Verify the target function is _run_worker_process
        call_args = mock_process_class.call_args
        assert call_args[1]['target'].__name__ == '_run_worker_process'

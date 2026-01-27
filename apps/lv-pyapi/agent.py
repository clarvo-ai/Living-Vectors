import logging
import os
import sys
import multiprocessing
import json
from typing import List, Tuple, Optional
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import google

from livekit_learnings import process_livekit_session_learnings

load_dotenv(".env.local")

GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")
AGENT_NAME = os.environ.get("LIVEKIT_AGENT_NAME", "lv-voice-agent")
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://127.0.0.1:7880")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent")

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are a helpful voice assistant. You answer concisely.",
        )

server = AgentServer()

@server.rtc_session(agent_name=AGENT_NAME)
async def my_agent(ctx: agents.JobContext):
    logger.info(f"Agent received job for room: {ctx.room.name}")
    logger.info(f"Connected to room {ctx.room.name}, participants: {len(ctx.room.remote_participants)}")

    user_id: Optional[str] = None
    session_id = ctx.room.name
    
    try:
        if hasattr(ctx, 'job') and hasattr(ctx.job, 'metadata') and ctx.job.metadata:
            metadata = json.loads(ctx.job.metadata) if isinstance(ctx.job.metadata, str) else ctx.job.metadata
            user_id = metadata.get("user_id") or metadata.get("userId")
            logger.info(f"Extracted user_id from metadata: {user_id}")
    except Exception as e:
        logger.warning(f"Could not extract user_id from metadata: {str(e)}")
    
    conversation_messages: List[Tuple[str, str]] = []

    if not GOOGLE_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable is required")
    
    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            # See: https://docs.livekit.io/reference/agents-js/types/plugins_agents_plugin_google.beta.realtime.LiveAPIModels.html
            model="gemini-2.5-flash-native-audio-preview-09-2025",
            voice="Puck",
            temperature=0.8,
            instructions="You are a helpful assistant",
            api_key=GOOGLE_API_KEY,  # type: ignore
        ),
    )

    @session.on("conversation_item_added")
    def on_conversation_item_added(event):
        """Capture conversation messages as they are added"""
        try:
            item = event.item
            if item.role == "user":
                role = "USER"
            elif item.role == "assistant":
                role = "AI"
            else:
                logger.warning(f"Unknown LiveKit role: {item.role}, defaulting to AI")
                role = "AI"
            
            content = getattr(item, 'text_content', None) or getattr(item, 'content', None) or ""
            if isinstance(content, list):
                content = " ".join([str(c) for c in content if isinstance(c, str)])
            
            if content and content.strip():
                conversation_messages.append((role, str(content)))
                logger.debug(f"Captured message: {role}: {str(content)[:50]}...")
        except Exception as e:
            logger.error(f"Error capturing conversation item: {str(e)}")

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(),
            close_on_disconnect=False,
        ),
    )
    logger.info("Agent started and listening for audio")

    await session.generate_reply(
        instructions="Greet the user briefly and offer your assistance."
    )

    try:
        if hasattr(session, 'history') and session.history:
            history_messages_list = getattr(session.history, 'messages', None)
            if history_messages_list:
                history_messages = []
                for msg in history_messages_list:
                    msg_role = getattr(msg, 'role', None)
                    if msg_role == "user":
                        role = "USER"
                    elif msg_role == "assistant":
                        role = "AI"
                    else:
                        logger.warning(f"Unknown LiveKit role in history: {msg_role}, defaulting to AI")
                        role = "AI"
                    content = getattr(msg, 'content', None) or ""
                    if isinstance(content, list):
                        content = " ".join([str(c) for c in content if isinstance(c, str)])
                    elif hasattr(msg, 'text_content'):
                        content = msg.text_content or ""
                    
                    if content and str(content).strip():
                        history_messages.append((role, str(content)))
                
                # Merge messages from both sources and deduplicate by (role, content)
                if history_messages:
                    # Track original counts for logging
                    event_count = len(conversation_messages)
                    history_count = len(history_messages)
                    
                    # Combine both sources, preferring conversation_item_added order
                    all_messages = conversation_messages + history_messages
                    
                    # Deduplicate by (role, content) tuple while preserving order
                    seen = set()
                    deduplicated = []
                    for role, content in all_messages:
                        # Normalize content for comparison (strip whitespace)
                        normalized_content = str(content).strip()
                        # Guard against empty/whitespace-only messages
                        if not normalized_content:
                            continue
                        key = (role, normalized_content)
                        if key not in seen:
                            seen.add(key)
                            # Store original content, not normalized
                            deduplicated.append((role, content))
                    
                    conversation_messages = deduplicated
                    logger.info(
                        f"Merged and deduplicated messages: {len(conversation_messages)} unique messages "
                        f"(from {event_count} event + {history_count} history, removed {event_count + history_count - len(conversation_messages)} duplicates)"
                    )
                else:
                    logger.info(f"Using conversation_item_added messages: {len(conversation_messages)} messages")
    except Exception as e:
        logger.warning(f"Could not extract from session history: {str(e)}")
    
    if user_id and conversation_messages:
        logger.info(f"Processing learnings for session {session_id} with {len(conversation_messages)} messages")
        try:
            process_livekit_session_learnings(user_id, session_id, conversation_messages)
        except Exception as e:
            logger.error(f"Error processing learnings for session {session_id}: {str(e)}")
    elif not user_id:
        logger.warning(f"Cannot process learnings: user_id not available for session {session_id}")
    elif not conversation_messages:
        logger.info(f"No conversation messages to process for session {session_id}")

def _run_worker_process():
    """
    Runs the LiveKit Worker in a separate process.
    """
    # Use "start" in Google Cloud Run, "dev" in local development
    is_cloud_run = os.environ.get("K_SERVICE") is not None
    command = "start" if is_cloud_run else "dev"
    sys.argv = ["agent.py", command]
    logger.info(f"Starting Voice Agent Worker '{AGENT_NAME}' connecting to {LIVEKIT_URL}...")
    
    agents.cli.run_app(server)


def start_agent():
    """Public function called by FastAPI to start the agent lifecycle."""
    p = multiprocessing.Process(target=_run_worker_process)
    p.start()


if __name__ == "__main__":
    agents.cli.run_app(server)

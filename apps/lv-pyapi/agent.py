import logging
import os
import sys
import multiprocessing
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import google

load_dotenv(".env.local")

GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")
AGENT_NAME = os.environ.get("LIVEKIT_AGENT_NAME", "lv-voice-agent")
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://127.0.0.1:7880")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent")

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="You are a helpful career interview assistant conducting a voice interview. Speak clearly and naturally. Never include system messages, metadata, acknowledgments, or internal thinking in your responses. Only speak your actual conversational response.",
        )

server = AgentServer()

@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    logger.info(f"Agent received job for room: {ctx.room.name}")
    logger.info(f"Connected to room {ctx.room.name}, participants: {len(ctx.room.remote_participants)}")

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            # Models:
            # https://docs.livekit.io/reference/agents-js/types/plugins_agents_plugin_google.beta.realtime.LiveAPIModels.html
            # All models does not seem to work, alternative working models:
            # gemini-2.5-flash-native-audio-preview-12-2025
            # gemini-2.0-flash-exp
            model="gemini-2.5-flash-native-audio-preview-09-2025",
            voice="Puck",
            temperature=0.8,
            instructions="You are a helpful career interview assistant. Speak naturally and conversationally. Do not output any system messages, metadata, or internal thinking. Only provide your actual response to the user.",
            api_key=GOOGLE_API_KEY,
        ),
    )

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
        instructions="Greet the user warmly as their career interview assistant. Keep it brief and natural."
    )

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
    """
    Public function called by FastAPI to start the agent lifecycle.
    """
    p = multiprocessing.Process(target=_run_worker_process)
    p.start()


if __name__ == "__main__":
    agents.cli.run_app(server)

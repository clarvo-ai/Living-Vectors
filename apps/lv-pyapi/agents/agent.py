import asyncio
import logging
import os
import sys

import requests
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, JobProcess, room_io
from livekit.agents.beta.workflows import TaskGroup
from livekit.agents.telemetry import set_tracer_provider
from livekit.plugins import elevenlabs, google, noise_cancellation, silero
from livekit.plugins.elevenlabs import TTS, VoiceSettings
from opentelemetry.sdk.trace import TracerProvider

from langsmith_processor import LangSmithSpanProcessor
from tasks import (
    AlignmentTask,
    BackgroundTask,
    CultureTask,
    IndustryTask,
    LocationTask,
    LogisticsTask,
    OpeningTask,
    ValueVisionTask,
)

load_dotenv(".env.local")

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")
AGENT_NAME = os.environ.get("LIVEKIT_AGENT_NAME", "lv-voice-agent")
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://127.0.0.1:7880")
BACKEND_URL = os.environ.get("BACKEND_URL", "")
INTERNAL_API_SECRET = os.environ.get("INTERNAL_API_SECRET", "")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent")


def setup_langsmith_tracing() -> None:
    """
    Configure OpenTelemetry so LiveKit agent spans are exported to LangSmith.

    Requires these env vars (if missing, tracing is skipped gracefully):
      OTEL_EXPORTER_OTLP_ENDPOINT  e.g. https://api.smith.langchain.com/otel
      OTEL_EXPORTER_OTLP_HEADERS   e.g. x-api-key=...,Langsmith-Project=...
    """
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    headers = os.getenv("OTEL_EXPORTER_OTLP_HEADERS")

    if not endpoint or not headers:
        logger.info("LangSmith tracing disabled (OTEL env vars not set)")
        return

    # OTLPSpanExporter reads these env vars; we only need to set the tracer provider.
    os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", endpoint)
    os.environ.setdefault("OTEL_EXPORTER_OTLP_HEADERS", headers)

    provider = TracerProvider()
    provider.add_span_processor(LangSmithSpanProcessor())
    set_tracer_provider(provider)
    logger.info("LangSmith tracing enabled via OTEL exporter (%s)", endpoint)


# Must be called before creating AgentServer so LiveKit uses this tracer provider
setup_langsmith_tracing()


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


class CareerAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a career consultant. Your job is to get to know this person deeply —
            their background, what they are great at, what they want next, and what matters to them.
            After this conversation, you will use what you learn to surface the best matching
            job opportunities for them from external sources.
            You are on their side. Make them feel heard.
            Speak conversationally. Reference earlier answers to avoid repeating questions.
            Be concise — this is a voice conversation, not a written form.
            """,
            tools=[],
        )

    async def on_enter(self) -> None:
        task_group = TaskGroup(chat_ctx=self.chat_ctx)
        task_group.add(
            lambda: OpeningTask(),
            id="opening",
            description="Why the candidate is here and how they found Clarvo",
        )
        task_group.add(
            lambda: LogisticsTask(),
            id="logistics",
            description="Job search logistics, timing, and motivation to leave",
        )
        task_group.add(
            lambda: IndustryTask(),
            id="industry",
            description="Target industry or field the candidate wants to work in",
        )
        task_group.add(
            lambda: LocationTask(),
            id="location",
            description="Preferred cities and remote/hybrid/onsite preferences",
        )
        task_group.add(
            lambda: BackgroundTask(),
            id="background",
            description="Work experience, strengths, and domain knowledge",
        )
        task_group.add(
            lambda: CultureTask(),
            id="culture",
            description="Team size, management style, and company culture fit",
        )
        task_group.add(
            lambda: ValueVisionTask(),
            id="value_vision",
            description="Compensation expectations and career vision",
        )
        task_group.add(
            lambda: AlignmentTask(),
            id="alignment",
            description="Summary confirmation and closing",
        )
        await task_group


server = AgentServer()
server.setup_fnc = prewarm


@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    logger.info(f"Agent received job for room: {ctx.room.name}")

    liam_tts: TTS = elevenlabs.TTS(
        api_key=ELEVENLABS_API_KEY,
        voice_id="TX3LPaxmHKxFdv7VOQHJ",
        model="eleven_multilingual_v2",
        voice_settings=VoiceSettings(
            stability=0.25,
            similarity_boost=0.6,
            style=0.2,
            use_speaker_boost=True,
        ),
    )

    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=elevenlabs.STT(api_key=ELEVENLABS_API_KEY),
        llm=google.LLM(model="gemini-2.0-flash", api_key=GOOGLE_API_KEY),
        tts=liam_tts,
        allow_interruptions=True,
    )

    user_id = ctx.room.name.removeprefix("interview-")
    logger.info(f"Session user: {user_id}")

    await session.start(
        room=ctx.room,
        agent=CareerAssistant(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.NC(),
            ),
            close_on_disconnect=True,
            delete_room_on_close=True,
        ),
    )
    logger.info("Agent started")

    @session.on("close")
    def on_close() -> None:
        transcript = ""
        for item in session.history.items:
            if item.type == "message":
                content = item.text_content.replace("\n", " ")
                text = f"{item.role}: {content}\n"
                transcript += text

        logger.info(f"Transcript: {transcript}")

        # POST transcript to the Cloud Run backend because it holds the Cloud SQL Auth Proxy
        def post_transcript() -> None:
            try:
                resp = requests.post(
                    f"{BACKEND_URL}/internal/process-transcript",
                    json={"user_id": user_id, "transcript": transcript},
                    headers={"x-internal-secret": INTERNAL_API_SECRET},
                    timeout=30,
                )
                resp.raise_for_status()
                logger.info(
                    "Transcript posted to backend for user %s: %s",
                    user_id,
                    resp.status_code,
                )
            except Exception as e:  # noqa: BLE001
                logger.error("Failed to post transcript for user %s: %s", user_id, e)

        asyncio.get_event_loop().run_in_executor(None, post_transcript)


if __name__ == "__main__":
    command = "start" if LIVEKIT_URL.startswith("wss://") else "dev"
    sys.argv = ["agent.py", command]
    logger.info(f"Starting agent '{AGENT_NAME}' → {LIVEKIT_URL} ({command})")
    agents.cli.run_app(server)

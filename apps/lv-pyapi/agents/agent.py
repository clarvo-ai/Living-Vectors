import asyncio
import json
import logging
import os
import sys
from typing import List

import requests
from dotenv import load_dotenv
from livekit import agents, api as lkapi
from livekit.agents import Agent, AgentServer, AgentSession, JobProcess, room_io
from livekit.agents.beta.workflows import TaskGroup
from livekit.agents.telemetry import set_tracer_provider
from livekit.plugins import elevenlabs, google, noise_cancellation, silero
from livekit.plugins.elevenlabs import TTS, VoiceSettings
from opentelemetry.sdk.trace import TracerProvider

from langsmith_processor import LangSmithSpanProcessor
from helper import fetch_completed_tasks, fetch_user_insights

from faq import get_faq

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
from telemetry import setup_telemetry

load_dotenv(".env.local")

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY")
AGENT_NAME = os.environ.get("LIVEKIT_AGENT_NAME", "lv-voice-agent")
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://127.0.0.1:7880")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET")
BACKEND_URL = os.environ.get("BACKEND_URL", "")
INTERNAL_API_SECRET = os.environ.get("INTERNAL_API_SECRET", "")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent")
setup_telemetry()


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
    proc.userdata["vad"] = silero.VAD.load(
        activation_threshold=0.6,  # Noise cancellation
        deactivation_threshold=0.45,
        min_speech_duration=0.2,
    )


class CareerAssistant(Agent):
    DISCOVERY_TASKS = {"opening", "logistics", "industry", "location", "background", "culture", "value_vision", "alignment"}

    def __init__(self, user_id: str, completed_tasks: List[str], user_insights: List[str], room_name: str) -> None:
        self.user_id = user_id
        self.room_name = room_name
        self.completed_tasks = completed_tasks
        self.user_insights = user_insights
        self.all_completed = self.DISCOVERY_TASKS.issubset(set(completed_tasks))

        insight_text = ""
        if self.user_insights:
            lines = "\n".join(f"- {s}" for s in self.user_insights)
            insight_text = f"\n\nHere is what we know about the user from previous conversations:\n{lines}"

        instructions = f"""
            You are an AI assistant for the Living Vectors platform,
            specializing in career guidance. You are speaking with a candidate whose full discovery call
            is already on file. You know their background, preferences, and goals well.

            Your role now is to be a helpful, conversational career advisor:
            - Be concise — this is a voice conversation, not a written form.
            - Answer any questions they have about their job search, roles, the market, etc.
            - If they mention something has changed (location, comp, what they want), note it
              and explore it naturally — one question at a time.
            - Keep replies short and conversational. This is a voice call.
            - Do NOT re-run the discovery interview. Do NOT ask unprompted questions.
            
            {insight_text}

            For factual questions about this service, interview, or data handling, use get_faq and answer from those entries.
            If the user asks a FAQ type-question answer it ONLY if you know the answer. Do not hallucinate.
            """

        super().__init__(instructions=instructions, tools=[get_faq])

    async def on_enter(self) -> None:
        if not self.all_completed:
            # Mark interview as ongoing at the start of discovery
            try:
                async with lkapi.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lk:
                    await lk.room.update_room_metadata(lkapi.UpdateRoomMetadataRequest(
                        room=self.room_name,
                        metadata=json.dumps({"interview_ongoing": True}),
                    ))
                logger.info(f"[AGENT] Room metadata set to interview_ongoing=true for interview-{self.user_id}")
            except Exception as e:
                logger.error(f"[AGENT] Failed to set room metadata: {e}")

        if self.all_completed:
            logger.info("[AGENT] Returning user — skipping TaskGroup, starting free-form check-in")

            try:
                async with lkapi.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lk:
                    await lk.room.update_room_metadata(lkapi.UpdateRoomMetadataRequest(
                        room=self.room_name,
                        metadata=json.dumps({"current_task": "post-interview"}),
                    ))
                logger.info(f"[AGENT] Room metadata set to current_task=post-interview for interview-{self.user_id}")
            except Exception as e:
                logger.error(f"[AGENT] Failed to set room metadata: {e}")

            await self.session.generate_reply(
                instructions=(
                    "Welcome the candidate back warmly — you know them already. "
                    "Then ask just ONE open question: whether anything has changed since you last spoke, "
                    "or if there is anything on their mind."
                )
            )
            return

        all_tasks = [
            ("opening", OpeningTask, "Why the candidate is here and how they found Clarvo"),
            ("logistics", LogisticsTask, "Job search logistics, timing, and motivation to leave"),
            ("industry", IndustryTask, "Target industry or field the candidate wants to work in"),
            ("location", LocationTask, "Preferred cities and remote/hybrid/onsite preferences"),
            ("background", BackgroundTask, "Work experience, strengths, and domain knowledge"),
            ("culture", CultureTask, "Team size, management style, and company culture fit"),
            ("value_vision", ValueVisionTask, "Compensation expectations and career vision"),
            ("alignment", AlignmentTask, "Summary confirmation and closing"),
        ]

        task_group = TaskGroup(chat_ctx=self.chat_ctx)

        # Find the first incomplete task to mark it as returning
        first_incomplete_idx = None
        for idx, (task_id, _, _) in enumerate(all_tasks):
            if task_id not in self.completed_tasks:
                first_incomplete_idx = idx
                break

        for idx, (task_id, task_class, task_desc) in enumerate(all_tasks):
            if task_id not in self.completed_tasks:
                is_returning = (idx == first_incomplete_idx) and bool(self.completed_tasks)
                task_group.add(
                    lambda task_cls=task_class, is_ret=is_returning, rn=self.room_name: task_cls(
                        self.user_id, self.user_insights, is_returning=is_ret, room_name=rn
                    ),
                    id=task_id,
                    description=task_desc,
                )

        await task_group

        logger.info(f"[AGENT] TaskGroup for room interview-{self.user_id} completed.")

        # Update metadata to signal interview complete
        try:
            async with lkapi.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lk:
                await lk.room.update_room_metadata(lkapi.UpdateRoomMetadataRequest(
                    room=self.room_name,
                    metadata=json.dumps({"interview_ongoing": False}),
                ))
            logger.info(f"[AGENT] Room metadata set to interview_ongoing=false for interview-{self.user_id}")
        except Exception as e:
            logger.error(f"[AGENT] Failed to update room metadata: {e}")


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
        stt=elevenlabs.STT(api_key=ELEVENLABS_API_KEY, language_code="en", tag_audio_events=False),
        llm=google.LLM(model="gemini-2.5-flash", api_key=GOOGLE_API_KEY),
        tts=liam_tts,
        allow_interruptions=True,
    )

    user_id = ctx.room.name.removeprefix("interview-").rsplit("-", 1)[0]
    logger.info(f"Session user: {user_id}")

    completed_tasks = fetch_completed_tasks(user_id)
    user_insights = fetch_user_insights(user_id)

    await session.start(
        room=ctx.room,
        agent=CareerAssistant(user_id, completed_tasks, user_insights, room_name=ctx.room.name),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.NC(),
            ),
            # Abandoned interviews: when the candidate disconnects, close and delete the room
            # so the agent session does not linger as an open “same” interview.
            close_on_disconnect=True,
            delete_room_on_close=True,
        ),
    )

    @session.on("close")
    def on_close() -> None:
        transcript = ""
        for item in session.history.items:
            if item.type == "message":
                content = item.text_content.replace("\n", " ")
                text = f"{item.role}: {content}\n"
                transcript += text

        logger.info(f"Transcript: {transcript}")

        # POST transcript to the Cloud Run backend because it holds
        # the Cloud SQL Auth Proxy.
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
    logger.info(
        f"Starting agent '{AGENT_NAME}' → {LIVEKIT_URL} ({command})",
    )
    agents.cli.run_app(server)

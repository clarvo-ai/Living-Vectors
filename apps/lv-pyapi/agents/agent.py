import logging
import os
import sys
from dotenv import load_dotenv
import asyncio
from typing import List

import requests
from sqlalchemy import select
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, JobProcess, room_io
from livekit.agents.beta.workflows import TaskGroup
from livekit.plugins import elevenlabs, google, silero, noise_cancellation
from livekit.plugins.elevenlabs import TTS, VoiceSettings

from database import SessionLocal
from python_utils.sqlalchemy_models import CompletedTask, Learning


from tasks import (
    OpeningTask,
    LogisticsTask,
    IndustryTask,
    LocationTask,
    BackgroundTask,
    CultureTask,
    ValueVisionTask,
    AlignmentTask,
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


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()


def fetch_completed_tasks(user_id: str) -> List[str]:
    try:
        db = SessionLocal()
        rows = db.execute(
            select(CompletedTask.taskId)
            .where(CompletedTask.userId == user_id)
        ).all()
        return [row.taskId for row in rows]
    except Exception as e:
        logger.error(f"Failed to fetch completed tasks for user {user_id}: {e}")
        return []
    finally:
        db.close()


def fetch_user_insights(user_id: str) -> List[str]:
    try:
        db = SessionLocal()
        rows = db.execute(
            select(Learning.id, Learning.summary)
            .where(Learning.userId == user_id)
            .order_by(Learning.createdAt)
        ).all()
        return [row.summary for row in rows]
    except Exception as e:
        logger.error(f"Failed to fetch user insights for user {user_id}: {e}")
        return []
    finally:
        db.close()


class CareerAssistant(Agent):
    def __init__(self, user_id: str, completed_tasks: List[str], user_insights: List[str]) -> None:
        self.user_id = user_id
        self.completed_tasks = completed_tasks
        insight_text = ""
        if user_insights:
            insight_text = "\n\nHere is what we already know about you from previous conversations:\n"
            for insight in user_insights:
                insight_text += f"- {insight}\n"
        
        super().__init__(
            instructions=f"""
            You are a career consultant. Your job is to get to know this person deeply —
            their background, what they are great at, what they want next, and what matters to them.
            After this conversation, you will use what you learn to surface the best matching
            job opportunities for them from external sources.
            You are on their side. Make them feel heard.
            Speak conversationally. Reference earlier answers to avoid repeating questions.
            Be concise — this is a voice conversation, not a written form.

            {insight_text}
            """,
            tools=[],
        )

    async def on_enter(self) -> None:
        all_tasks = [
            ("opening",      lambda: OpeningTask(self.user_id),     "Why the candidate is here and how they found Clarvo"),
            ("logistics",    lambda: LogisticsTask(self.user_id),   "Job search logistics, timing, and motivation to leave"),
            ("industry",     lambda: IndustryTask(self.user_id),    "Target industry or field the candidate wants to work in"),
            ("location",     lambda: LocationTask(self.user_id),    "Preferred cities and remote/hybrid/onsite preferences"),
            ("background",   lambda: BackgroundTask(self.user_id),  "Work experience, strengths, and domain knowledge"),
            ("culture",      lambda: CultureTask(self.user_id),     "Team size, management style, and company culture fit"),
            ("value_vision", lambda: ValueVisionTask(self.user_id), "Compensation expectations and career vision"),
            ("alignment",    lambda: AlignmentTask(self.user_id),   "Summary confirmation and closing"),
        ]

        task_group = TaskGroup(chat_ctx=self.chat_ctx)
        for task_id, task_fn, task_desc in all_tasks:
            if task_id not in self.completed_tasks:
                task_group.add(task_fn, id=task_id, description=task_desc)
        
        await task_group


server = AgentServer()
server.setup_fnc = prewarm


@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    logger.info(f"Agent received job for room: {ctx.room.name}")

    liam_tts = elevenlabs.TTS(
        api_key=ELEVENLABS_API_KEY,
        voice_id="TX3LPaxmHKxFdv7VOQHJ",
        model="eleven_multilingual_v2",
        voice_settings=VoiceSettings(
            stability=0.25,           # Slight bump for consistency
            similarity_boost=0.6,     # High "Roger-ness"
            style=0.2,                # 0.0 is best for low-latency
            use_speaker_boost=True    # Clearer vocal presence
        )
    )


    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        stt=elevenlabs.STT(api_key=ELEVENLABS_API_KEY),
        llm=google.LLM(model="gemini-2.0-flash", api_key=GOOGLE_API_KEY),
        tts = liam_tts,
        allow_interruptions=True,
    )
    
    user_id = ctx.room.name.removeprefix("interview-")
    logger.info(f"Session user: {user_id}")

    completed_tasks = fetch_completed_tasks(user_id)
    user_insights = fetch_user_insights(user_id)

    await session.start(
        room=ctx.room,
        agent=CareerAssistant(user_id, completed_tasks, user_insights),
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
    def on_close():
        transcript = ""
        for item in session.history.items:
            if item.type == "message":
                content = item.text_content.replace("\n", " ")
                text = f"{item.role}: {content}\n"
                transcript += text
        
        logger.info(f"Transcript: {transcript}")

        # POST transcript to the Cloud Run backend because it holds the Cloud SQL Auth Proxy
        def post_transcript():
            try:
                resp = requests.post(
                    f"{BACKEND_URL}/internal/process-transcript",
                    json={"user_id": user_id, "transcript": transcript},
                    headers={"x-internal-secret": INTERNAL_API_SECRET},
                    timeout=30,
                )
                resp.raise_for_status()
                logger.info(f"Transcript posted to backend for user {user_id}: {resp.status_code}")
            except Exception as e:
                logger.error(f"Failed to post transcript for user {user_id}: {e}")

        asyncio.get_event_loop().run_in_executor(None, post_transcript)


if __name__ == "__main__":
    command = "start" if LIVEKIT_URL.startswith("wss://") else "dev"
    sys.argv = ["agent.py", command]
    logger.info(f"Starting agent '{AGENT_NAME}' → {LIVEKIT_URL} ({command})")
    agents.cli.run_app(server)

import logging
import os
import sys
from dotenv import load_dotenv
import asyncio
from typing import List

import requests
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, JobProcess, room_io
from livekit.agents.beta.workflows import TaskGroup
from livekit.plugins import elevenlabs, google, silero, noise_cancellation
from livekit.plugins.elevenlabs import TTS, VoiceSettings

from database import SessionLocal
from helper import fetch_completed_tasks, fetch_user_insights


from tasks import (
    OpeningTask,
    LogisticsTask,
    IndustryTask,
    LocationTask,
    BackgroundTask,
    CultureTask,
    ValueVisionTask,
    AlignmentTask
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


class CareerAssistant(Agent):
    DISCOVERY_TASKS = {"opening", "logistics", "industry", "location", "background", "culture", "value_vision", "alignment"}

    def __init__(self, user_id: str, completed_tasks: List[str], user_insights: List[str]) -> None:
        self.user_id = user_id
        self.completed_tasks = completed_tasks
        self.user_insights = user_insights
        self.all_completed = self.DISCOVERY_TASKS.issubset(set(completed_tasks))

        insight_text = ""
        if self.user_insights:
            lines = "\n".join(f"- {s}" for s in self.user_insights)
            insight_text = f"\n\nHere is what we know about the user from previous conversations:\n{lines}"

        if self.all_completed:
            instructions = f"""
            You are a career assistant speaking with a candidate whose full discovery call
            is already on file. You know their background, preferences, and goals well.

            Your role now is to be a helpful, conversational career advisor:
            - Answer any questions they have about their job search, roles, the market, etc.
            - If they mention something has changed (location, comp, what they want), note it
              and explore it naturally — one question at a time.
            - Keep replies short and conversational. This is a voice call.
            - Do NOT re-run the discovery interview. Do NOT ask unprompted questions.
            
            For factual questions about this service, interview, or data handling, use get_faq and answer from those entries.
            If the user asks a FAQ type-question answer it ONLY if you know the answer. Do not hallucinate.
            {insight_text}
            """
        else:
            instructions = ""
            
        super().__init__(instructions=instructions, tools=[])

    async def on_enter(self) -> None:
        if self.all_completed:
            logger.info("[AGENT] Returning user — skipping TaskGroup, starting free-form check-in")
            await self.session.generate_reply(
                instructions=(
                    "Welcome the candidate back warmly — you know them already. "
                    "Briefly summarise their profile in a sentence or two so they feel heard. "
                    "Then ask just ONE open question: whether anything has changed since you last spoke, "
                    "or if there is anything on their mind."
                )
            )
            return

        all_tasks = [
            ("opening",      lambda: OpeningTask(self.user_id, self.user_insights),     "Why the candidate is here and how they found Clarvo"),
            ("logistics",    lambda: LogisticsTask(self.user_id, self.user_insights),   "Job search logistics, timing, and motivation to leave"),
            ("industry",     lambda: IndustryTask(self.user_id, self.user_insights),    "Target industry or field the candidate wants to work in"),
            ("location",     lambda: LocationTask(self.user_id, self.user_insights),    "Preferred cities and remote/hybrid/onsite preferences"),
            ("background",   lambda: BackgroundTask(self.user_id, self.user_insights),  "Work experience, strengths, and domain knowledge"),
            ("culture",      lambda: CultureTask(self.user_id, self.user_insights),     "Team size, management style, and company culture fit"),
            ("value_vision", lambda: ValueVisionTask(self.user_id, self.user_insights), "Compensation expectations and career vision"),
            ("alignment",    lambda: AlignmentTask(self.user_id, self.user_insights),   "Summary confirmation and closing"),
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

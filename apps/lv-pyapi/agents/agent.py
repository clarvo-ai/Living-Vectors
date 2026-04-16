import json
import logging
import os
import sys
import time
from dotenv import load_dotenv
import asyncio
from typing import List

import requests
from livekit import agents, api as lkapi
from livekit.agents import AgentServer, AgentSession, Agent, AgentStateChangedEvent, JobProcess, room_io
from livekit.agents.beta.workflows import TaskGroup
from livekit.plugins import elevenlabs, google, silero, noise_cancellation
from livekit.plugins.elevenlabs import TTS, VoiceSettings

from helper import fetch_completed_tasks, fetch_user_insights

from faq import get_faq

from tasks import (
    OpeningTask,
    LogisticsTask,
    IndustryTask,
    LocationTask,
    BackgroundTask,
    CultureTask,
    ValueVisionTask,
    AlignmentTask,
    HARD_LIMIT_CLOSING_MESSAGE,
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

WRAP_UP_TRIGGER_MINUTES = 15
HARD_LIMIT_MINUTES = 17


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent")
setup_telemetry()


def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load(
        activation_threshold=0.6, # Noice cancellation
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
                logger.info(f"[AGENT] Room metadata set to interview_ongoing=true for interview-{self.user_id}")
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
            ("opening",      OpeningTask,       "Why the candidate is here and how they found Clarvo"),
            ("logistics",    LogisticsTask,     "Job search logistics, timing, and motivation to leave"),
            ("industry",     IndustryTask,      "Target industry or field the candidate wants to work in"),
            ("location",     LocationTask,      "Preferred cities and remote/hybrid/onsite preferences"),
            ("background",   BackgroundTask,    "Work experience, strengths, and domain knowledge"),
            ("culture",      CultureTask,       "Team size, management style, and company culture fit"),
            ("value_vision", ValueVisionTask,   "Compensation expectations and career vision"),
            ("alignment",    AlignmentTask,     "Summary confirmation and closing"),
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
                    description=task_desc
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
        stt=elevenlabs.STT(api_key=ELEVENLABS_API_KEY, language_code="en", tag_audio_events=False),
        llm=google.LLM(model="gemini-2.0-flash", api_key=GOOGLE_API_KEY),
        tts = liam_tts,
        allow_interruptions=True,
    )
    
    user_id = ctx.room.name.removeprefix("interview-").rsplit("-", 1)[0]
    logger.info(f"Session user: {user_id}")

    completed_tasks = fetch_completed_tasks(user_id)
    user_insights = fetch_user_insights(user_id)

    main_agent = CareerAssistant(user_id, completed_tasks, user_insights, room_name=ctx.room.name)
    await session.start(
        room=ctx.room,
        agent=main_agent,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.NC(),
            ),
            close_on_disconnect=True,
            delete_room_on_close=True,
        ),
    )

    has_forced_end = False
    forced_end_lock = asyncio.Lock()

    # Set when the agent first speaks; timers are measured from this moment.
    interview_started = asyncio.Event()
    start_time: float = 0.0

    @session.on("agent_state_changed")
    def _on_agent_state_changed(ev: AgentStateChangedEvent) -> None:
        nonlocal start_time
        if not interview_started.is_set() and ev.new_state == "speaking":
            start_time = time.time()
            interview_started.set()
            logger.info("[TIMER] Interview clock started (agent first spoke)")

    async def _get_room_state() -> tuple[str | None, bool | None]:
        current_task = None
        interview_ongoing = None
        metadata = ctx.room.metadata or "{}"
        try:
            metadata_dict = json.loads(metadata)
            current_task = metadata_dict.get("current_task")
            interview_ongoing = metadata_dict.get("interview_ongoing")
        except Exception:
            pass
            
        return current_task, interview_ongoing

    async def _mark_interview_complete() -> None:
        async with lkapi.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lk:
            await lk.room.update_room_metadata(lkapi.UpdateRoomMetadataRequest(
                room=ctx.room.name,
                metadata=json.dumps({"interview_ongoing": False}),
            ))

    async def force_wrap_up() -> None:
        await interview_started.wait()
        remaining = int((WRAP_UP_TRIGGER_MINUTES * 60) - (time.time() - start_time))
        if remaining > 0:
            await asyncio.sleep(remaining)
        try:
            current_task, interview_ongoing = await _get_room_state()

            if current_task in {"alignment", "post-interview"} or interview_ongoing is False:
                logger.info(
                    "Wrap-up skipped (task=%s, interview_ongoing=%s)",
                    current_task,
                    interview_ongoing,
                )
                return

            logger.info("Force wrap-up time reached, triggering alignment task")
            session.update_agent(
                AlignmentTask(
                    user_id,
                    insights=user_insights,
                    room_name=ctx.room.name,
                    force_wrapup_mode=True,
                    chat_ctx=session.history,
                )
            )
        except asyncio.CancelledError:
            logger.info("Wrap-up timer cancelled")
        except Exception as e:
            logger.info(f"Wrap-up trigger skipped because session is no longer active: {e}")

    async def force_close() -> None:
        nonlocal has_forced_end
        await interview_started.wait()
        remaining = int((HARD_LIMIT_MINUTES * 60) - (time.time() - start_time))
        if remaining > 0:
            await asyncio.sleep(remaining)
        try:
            async with forced_end_lock:
                if has_forced_end:
                    return
                has_forced_end = True

            if not wrap_up_timer_task.done():
                wrap_up_timer_task.cancel()

            logger.info("Hard limit reached, ending session forcefully")
            session.interrupt()
            await session.say(HARD_LIMIT_CLOSING_MESSAGE)
            try:
                await _mark_interview_complete()
            except Exception as e:
                logger.warning("Failed to set interview_ongoing=false at hard limit: %s", e)
            await session.aclose()
        except asyncio.CancelledError:
            logger.info("Hard-limit timer cancelled")
        except Exception as e:
            logger.info(f"Hard-limit end skipped because session is no longer active: {e}")

    wrap_up_timer_task = asyncio.create_task(force_wrap_up())
    hard_limit_timer_task = asyncio.create_task(force_close())

    @session.on("close")
    def on_close():
        if not wrap_up_timer_task.done():
            wrap_up_timer_task.cancel()
        if not hard_limit_timer_task.done():
            hard_limit_timer_task.cancel()

        transcript = ""
        for item in session.history.items:
            if item.type == "message":
                content = item.text_content.replace("\n", " ")
                text = f"{item.role}: {content}\n"
                transcript += text
        
        logger.info(f"Transcript: {transcript}")

        # POST transcript to the Cloud Run backend because it holds
        # the Cloud SQL Auth Proxy.
        def post_transcript():
            try:
                resp = requests.post(
                    f"{BACKEND_URL}/internal/process-transcript",
                    json={"user_id": user_id, "transcript": transcript},
                    headers={"x-internal-secret": INTERNAL_API_SECRET},
                    timeout=30,
                )
                resp.raise_for_status()
                logger.info(
                    f"Transcript posted to backend for user {user_id}: "
                    f"{resp.status_code}",
                )
            except Exception as e:
                logger.error(
                    f"Failed to post transcript for user {user_id}: {e}",
                )

        asyncio.get_event_loop().run_in_executor(None, post_transcript)


if __name__ == "__main__":
    command = "start" if LIVEKIT_URL.startswith("wss://") else "dev"
    sys.argv = ["agent.py", command]
    logger.info(
        f"Starting agent '{AGENT_NAME}' → {LIVEKIT_URL} ({command})",
    )
    agents.cli.run_app(server)

import logging
import os
import sys
from dotenv import load_dotenv
import asyncio

import requests
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, JobProcess, room_io
from livekit.agents.beta.workflows import TaskGroup
from livekit.plugins import elevenlabs, google, silero, noise_cancellation
from livekit.plugins.elevenlabs import TTS, VoiceSettings

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


class CareerAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are an AI assistant for the Living Vectors platform,
            specializing in career guidance.
            You help people explore their strengths, motivations, and what they
            want next, then use that to surface matching job opportunities —
            guidance and matching, not applications or form-filling.
            Your mission is to do this through thoughtful, structured
            conversations that are natural, supportive, and coach-like.

            In this conversation your job is to get to know this person deeply:
            their background, what they are great at, what they want next, and
            what matters to them. After this conversation, you will use what
            you learn to surface the best matching job opportunities for them
            from external sources.
            You are on their side. Make them feel heard. Speak conversationally.
            Reference earlier answers to avoid repeating questions. Be concise —
            this is a voice conversation, not a written form.
            Stay friendly and conversational, but do not start messages with
            "Okay", "Ok," or similar — open with something warm and direct
            (e.g. "Hey there!", "This will be a quick discovery conversation…").

            Before asking the next question, briefly show you heard them: one
            short reflection, show curiosity, or connect their answer to why
            you're asking next. Do not repeat their exact words back (e.g. avoid
            saying the same thing two ways like "you contribute by thinking and
            providing ideas" and "you like to think and provide your ideas").
            One brief acknowledgment is enough, then ask the next question.
            Avoid generic acknowledgments only (e.g. not just "Got it" or "Ok,
            great"). When changing topic, bridge from what they said (e.g.
            "Since you're staying in tech, what kind of role are you aiming
            for?") instead of a generic signpost like "Let's talk about
            location."

            Do not assume the candidate is in any particular country (e.g. the
            US). Keep the conversation location-neutral until they have told you
            where they are or where they want to work.

            Do not use "finally", "last question", "one last thing", or similar
            closing language when asking a question unless you are in the final
            phase (summary and closing). Every other phase is only one part of
            a longer conversation.
            """,
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
    def on_close():
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

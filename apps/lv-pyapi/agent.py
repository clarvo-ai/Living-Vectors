import logging
import os
import sys
import multiprocessing
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import google

from career_tasks import (
    WelcomeTask,
    MotivationTask,
    BaselineInfoTask,
    LocationPreferencesTask,
    ExperienceTask,
    TechnicalSkillsTask,
    SuperpowersTask,
    WorkStyleTask,
    LearningDriversTask,
    CompensationTask,
    LongTermGoalsTask,
    SummaryConfirmationTask,
    CommunicationPreferencesTask,
    FeedbackTask,
)

load_dotenv(".env.local")

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
AGENT_NAME = os.environ.get("LIVEKIT_AGENT_NAME", "lv-voice-agent")
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://127.0.0.1:7880")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voice-agent")


class CareerInterviewAgent(Agent):
    """Agent that conducts structured career interviews using TaskGroup."""
    
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a helpful career interview assistant for Clarvo, a talent aquisition company, conducting a voice interview.
            Speak clearly and naturally. Never include system messages, metadata,
            acknowledgments, or internal thinking in your responses.
            Only speak your actual conversational response.
            Your goal is to understand the candidate's career aspirations, experience,
            and preferences to help match them with the right opportunities.

            Do not extract or store any information related to:
            - Racial or ethnic origin
            - Political opinions
            - Religious beliefs
            - Genetic data
            - Data concerning a natural person's sex life or sexual orientation
            - Biometric data for the purpose of uniquely identifying a natural person
            - Data concerning health
            """,
        )

    async def on_enter(self) -> None:
        """Start the structured career conversation using sequential tasks."""
        logger.info("Starting career interview conversation flow")
        
        # Define tasks in sequence (avoiding TaskGroup's revisit feature which is incompatible with Google Realtime API)
        task_factories = [
            # =========== START PHASE ===========
            ("welcome", WelcomeTask),
            # =========== MAIN PHASE ===========
            ("motivation", MotivationTask),
            ("baseline_info", BaselineInfoTask),
            ("location", LocationPreferencesTask),
            ("experience", ExperienceTask),
            ("technical_skills", TechnicalSkillsTask),
            ("superpowers", SuperpowersTask),
            ("work_style", WorkStyleTask),
            ("learning_drivers", LearningDriversTask),
            ("compensation", CompensationTask),
            ("long_term_goals", LongTermGoalsTask),
            # =========== END PHASE ===========
            ("summary_confirmation", SummaryConfirmationTask),
            ("communication_preferences", CommunicationPreferencesTask),
            ("feedback", FeedbackTask),
        ]
        
        # Execute tasks sequentially by awaiting each task directly
        # Per LiveKit docs: "Await the task to receive its result"
        task_results = {}
        for task_id, TaskClass in task_factories:
            logger.info(f"Starting task: {task_id}")
            try:
                # Create task with shared chat context and await it directly
                task = TaskClass(chat_ctx=self.chat_ctx)
                result = await task
                task_results[task_id] = result
                logger.info(f"Completed task: {task_id} with result: {type(result).__name__}")
            except Exception as e:
                logger.error(f"Task {task_id} failed: {e}")
                import traceback
                traceback.print_exc()
                # Continue with next task even if one fails
                task_results[task_id] = None
        
        # Log the collected information
        logger.info("Career interview completed successfully")
        logger.info(f"Collected data from {len(task_results)} tasks:")
        for task_id, result in task_results.items():
            logger.info(f"  - {task_id}: {type(result).__name__ if result else 'None'}")


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
            # gemini-2.5-flash-native-audio-preview-09-2025
            # gemini-2.0-flash-exp
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Zubenelgenubi",
            temperature=0.8,
            instructions="""
            You are a helpful career interview assistant. Speak naturally and conversationally.
            Do not output any system messages, metadata, or internal thinking.
            Only provide your actual response to the user.
            """,
            api_key=GOOGLE_API_KEY,
        ),
    )

    await session.start(
        room=ctx.room,
        agent=CareerInterviewAgent(),
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(),
            close_on_disconnect=False,
        ),
    )
    logger.info("Agent started and listening for audio")


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


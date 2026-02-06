import logging
import os
import sys
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import google
from google.genai import types

from livekit.agents.beta.workflows import TaskGroup
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
        """Start the structured career conversation using TaskGroup."""
        logger.info("Starting career interview conversation flow with TaskGroup")
        
        # Import TaskGroup from beta workflows
        
        # Create TaskGroup with shared chat context
        task_group = TaskGroup(
            chat_ctx=self.chat_ctx,
            summarize_chat_ctx=False,  # Summarize interactions into main context
        )
        
        # =========== START PHASE ===========
        task_group.add(
            lambda: WelcomeTask(chat_ctx=self.chat_ctx),
            id="welcome",
            description="Welcome and initial context gathering"
        )
        
        # =========== MAIN PHASE ===========
        task_group.add(
            lambda: MotivationTask(chat_ctx=self.chat_ctx),
            id="motivation",
            description="Understand motivation and timing for job search"
        )
        task_group.add(
            lambda: BaselineInfoTask(chat_ctx=self.chat_ctx),
            id="baseline_info",
            description="Collect education, work authorization, and availability"
        )
        task_group.add(
            lambda: LocationPreferencesTask(chat_ctx=self.chat_ctx),
            id="location",
            description="Gather location and work mode preferences"
        )
        task_group.add(
            lambda: ExperienceTask(chat_ctx=self.chat_ctx),
            id="experience",
            description="Discuss past experience and learnings"
        )
        task_group.add(
            lambda: TechnicalSkillsTask(chat_ctx=self.chat_ctx),
            id="technical_skills",
            description="Assess technical skills and growth areas"
        )
        task_group.add(
            lambda: SuperpowersTask(chat_ctx=self.chat_ctx),
            id="superpowers",
            description="Discover personal strengths through examples"
        )
        task_group.add(
            lambda: WorkStyleTask(chat_ctx=self.chat_ctx),
            id="work_style",
            description="Understand work style and culture fit preferences"
        )
        task_group.add(
            lambda: LearningDriversTask(chat_ctx=self.chat_ctx),
            id="learning_drivers",
            description="Explore learning and growth drivers"
        )
        task_group.add(
            lambda: CompensationTask(chat_ctx=self.chat_ctx),
            id="compensation",
            description="Discuss compensation expectations"
        )
        task_group.add(
            lambda: LongTermGoalsTask(chat_ctx=self.chat_ctx),
            id="long_term_goals",
            description="Understand long-term career direction"
        )
        
        # =========== END PHASE ===========
        task_group.add(
            lambda: SummaryConfirmationTask(chat_ctx=self.chat_ctx),
            id="summary_confirmation",
            description="Summarize and confirm understanding"
        )
        task_group.add(
            lambda: CommunicationPreferencesTask(chat_ctx=self.chat_ctx),
            id="communication_preferences",
            description="Collect communication preferences"
        )
        task_group.add(
            lambda: FeedbackTask(chat_ctx=self.chat_ctx),
            id="feedback",
            description="Gather feedback on conversation experience"
        )
        
        # Execute the task group - TaskGroup handles transitions properly
        logger.info("Executing TaskGroup with 14 tasks")
        results = await task_group
        
        # Access results
        task_results = results.task_results
        
        # Log the collected information
        logger.info("Career interview completed successfully")
        logger.info(f"Collected data from {len(task_results)} tasks:")
        for task_id, result in task_results.items():
            if isinstance(result, Exception):
                logger.error(f"  - {task_id}: FAILED - {result}")
            else:
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
            thinking_config=types.ThinkingConfig(
                include_thoughts=False,
            ),
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


if __name__ == "__main__":
    # Use "start" for LiveKit Cloud (wss://), "dev" for local (ws://)
    command = "start" if LIVEKIT_URL.startswith("wss://") else "dev"
    sys.argv = ["agent.py", command]
    logger.info(f"Starting Voice Agent Worker '{AGENT_NAME}' connecting to {LIVEKIT_URL} (mode: {command})...")
    agents.cli.run_app(server)


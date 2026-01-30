"""
Career Conversation Tasks for LiveKit Agent

This module defines structured tasks for conducting career-focused interviews,
using LiveKit's Task framework to guide candidates through Start, Main, and End phases.
"""

from dataclasses import dataclass, field
from typing import Optional, List
from livekit.agents import AgentTask, function_tool


# ============================================================================
# Result Dataclasses
# ============================================================================

@dataclass
class WelcomeResult:
    """Result from the welcome/start phase."""
    how_feeling: str
    how_heard_about_clarvo: str
    what_looking_for: str


@dataclass
class MotivationResult:
    """Result for motivation and timing."""
    why_exploring_now: str
    search_activity_level: str  # e.g., "actively looking", "casually exploring"


@dataclass
class BaselineInfoResult:
    """Result for baseline candidate information."""
    education: str
    graduation_year: Optional[str] = None
    work_authorization: str = ""
    availability: str = ""  # e.g., "immediately", "2 weeks notice"
    role_types: List[str] = field(default_factory=list)  # e.g., ["full-time", "contract"]


@dataclass
class LocationResult:
    """Result for location preferences."""
    preferred_locations: List[str] = field(default_factory=list)
    open_to_relocation: bool = False
    work_mode: str = ""  # "remote", "hybrid", "on-site"


@dataclass
class ExperienceResult:
    """Result for experience discussion."""
    roles_and_projects: str
    enjoyed_aspects: str
    challenging_aspects: str
    key_learnings: str


@dataclass
class TechnicalSkillsResult:
    """Result for technical skills assessment."""
    current_strengths: List[str] = field(default_factory=list)
    growth_areas: List[str] = field(default_factory=list)
    tools_and_technologies: List[str] = field(default_factory=list)
    focus_areas: str = ""


@dataclass
class SuperpowersResult:
    """Result for personal strengths."""
    strengths: List[str] = field(default_factory=list)
    examples: str = ""


@dataclass
class WorkStyleResult:
    """Result for work style and culture fit."""
    team_dynamics_preference: str
    management_style_preference: str
    company_size_preference: str  # "startup", "mid-size", "enterprise"


@dataclass
class LearningDriversResult:
    """Result for learning and growth preferences."""
    mentorship_importance: str
    autonomy_preference: str
    structure_preference: str
    exposure_interests: str  # what they want exposure to


@dataclass
class CompensationResult:
    """Result for compensation expectations."""
    salary_expectation: str
    flexibility: str  # how flexible they are on compensation


@dataclass
class LongTermGoalsResult:
    """Result for long-term career goals."""
    career_direction_3_5_years: str


@dataclass
class SummaryConfirmationResult:
    """Result from summary and confirmation."""
    confirmed: bool
    corrections: Optional[str] = None


@dataclass
class CommunicationPreferencesResult:
    """Result for communication preferences."""
    preferred_channel: str  # "email", "phone", "text"
    preferred_frequency: str


@dataclass
class FeedbackResult:
    """Result for conversation feedback."""
    feedback: str


# ============================================================================
# START PHASE TASKS
# ============================================================================

class WelcomeTask(AgentTask[WelcomeResult]):
    """Warm welcome and initial context-gathering questions."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            You are starting a career conversation. Ask friendly, open-ended questions 
            to set a relaxed tone. You need to learn three things in order:
            1. How the user is doing today - use record_how_feeling to save this
            2. How they heard about Clarvo - use record_how_heard to save this  
            3. What brings them here and what they're looking for - use record_what_looking_for to save this
            
            IMPORTANT: After each tool call, the tool will return guidance on what to ask next.
            Follow that guidance and ask the next question naturally.
            Be warm and conversational. Don't rush through all questions at once.
            """,
            chat_ctx=chat_ctx,
        )
        self._how_feeling = ""
        self._how_heard = ""
        self._what_looking_for = ""
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Greet the user warmly and ask how they're doing today."
        )
    
    @function_tool
    async def record_how_feeling(self, summary: str) -> str:
        """Record how the user is feeling today. Call this after learning how they're doing."""
        self._how_feeling = summary
        if not self._how_heard:
            return "Great! Now ask them how they first heard about Clarvo."
        return "Recorded. Continue the conversation."
    
    @function_tool
    async def record_how_heard(self, source: str) -> str:
        """Record how the user heard about Clarvo. Call this after learning the source."""
        self._how_heard = source
        if not self._what_looking_for:
            return "Good! Now ask what brings them here today and what they're looking for in their next career move."
        return "Recorded. Continue the conversation."
    
    @function_tool
    async def record_what_looking_for(self, looking_for: str) -> str:
        """Record what the user is looking for in their career. Call this after understanding their goals."""
        self._what_looking_for = looking_for
        self._check_completion()
        return "All welcome information collected. The task will now complete."
    
    def _check_completion(self) -> None:
        if self._how_feeling and self._how_heard and self._what_looking_for:
            self.complete(WelcomeResult(
                how_feeling=self._how_feeling,
                how_heard_about_clarvo=self._how_heard,
                what_looking_for=self._what_looking_for,
            ))


# ============================================================================
# MAIN PHASE TASKS
# ============================================================================

class MotivationTask(AgentTask[MotivationResult]):
    """Understand motivation and timing for job search."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Learn about the candidate's motivation and timing:
            - Why are they exploring opportunities now?
            - How active is their job search?
            Be curious and understanding about their situation.
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Transition naturally and ask why they're exploring new opportunities at this time."
        )
    
    @function_tool
    async def record_motivation(self, why_exploring: str, activity_level: str) -> str:
        """Record motivation details. Activity level can be 'actively looking', 'casually exploring', etc."""
        self.complete(MotivationResult(
            why_exploring_now=why_exploring,
            search_activity_level=activity_level,
        ))
        return "Motivation recorded. Task complete."


class BaselineInfoTask(AgentTask[BaselineInfoResult]):
    """Collect baseline candidate information."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Collect baseline information about the candidate:
            - Education background
            - Graduation year (if relevant)
            - Work authorization status
            - Availability to start
            - Types of roles interested in (full-time, contract, etc.)
            
            Ask naturally and don't make it feel like an interrogation.
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask about their educational background to get started."
        )
    
    @function_tool
    async def record_baseline_info(
        self,
        education: str,
        work_authorization: str,
        availability: str,
        role_types: list[str],
        graduation_year: str = "",
    ) -> str:
        """Record baseline information about the candidate."""
        self.complete(BaselineInfoResult(
            education=education,
            graduation_year=graduation_year if graduation_year else None,
            work_authorization=work_authorization,
            availability=availability,
            role_types=role_types,
        ))
        return "Baseline information recorded. Task complete."


class LocationPreferencesTask(AgentTask[LocationResult]):
    """Collect location and work mode preferences."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Learn about location preferences:
            - What cities or regions are they interested in?
            - Are they open to relocation?
            - Do they prefer remote, hybrid, or on-site work?
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask about their location preferences and where they'd like to work."
        )
    
    @function_tool
    async def record_location_preferences(
        self,
        preferred_locations: list[str],
        open_to_relocation: bool,
        work_mode: str,
    ) -> str:
        """Record location preferences. Work mode should be 'remote', 'hybrid', or 'on-site'."""
        self.complete(LocationResult(
            preferred_locations=preferred_locations,
            open_to_relocation=open_to_relocation,
            work_mode=work_mode,
        ))
        return "Location preferences recorded. Task complete."


class ExperienceTask(AgentTask[ExperienceResult]):
    """Discuss past experience and learnings."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Have a rich conversation about their experience:
            - What roles and projects have they worked on?
            - What aspects did they enjoy most?
            - What was challenging?
            - What are their key learnings?
            
            Show genuine interest and ask follow-up questions.
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask about their recent roles and what projects they've been working on."
        )
    
    @function_tool
    async def record_experience(
        self,
        roles_and_projects: str,
        enjoyed_aspects: str,
        challenging_aspects: str,
        key_learnings: str,
    ) -> str:
        """Record experience details after discussing thoroughly."""
        self.complete(ExperienceResult(
            roles_and_projects=roles_and_projects,
            enjoyed_aspects=enjoyed_aspects,
            challenging_aspects=challenging_aspects,
            key_learnings=key_learnings,
        ))
        return "Experience recorded. Task complete."


class TechnicalSkillsTask(AgentTask[TechnicalSkillsResult]):
    """Assess technical skills and growth areas."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Understand their technical profile:
            - What are their current technical strengths?
            - What areas do they want to grow in?
            - What tools and technologies do they use?
            - What technical areas do they want to focus on?
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask about their technical strengths and the technologies they work with."
        )
    
    @function_tool
    async def record_technical_skills(
        self,
        current_strengths: list[str],
        growth_areas: list[str],
        tools_and_technologies: list[str],
        focus_areas: str,
    ) -> str:
        """Record technical skills assessment."""
        self.complete(TechnicalSkillsResult(
            current_strengths=current_strengths,
            growth_areas=growth_areas,
            tools_and_technologies=tools_and_technologies,
            focus_areas=focus_areas,
        ))
        return "Technical skills recorded. Task complete."


class SuperpowersTask(AgentTask[SuperpowersResult]):
    """Discover personal strengths through examples."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Help the candidate articulate their superpowers:
            - What are their unique personal strengths?
            - Can they share examples that demonstrate these strengths?
            
            Encourage them to be specific with examples.
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask what they consider their superpowers or unique strengths that set them apart."
        )
    
    @function_tool
    async def record_superpowers(
        self,
        strengths: list[str],
        examples: str,
    ) -> str:
        """Record personal strengths and examples."""
        self.complete(SuperpowersResult(
            strengths=strengths,
            examples=examples,
        ))
        return "Superpowers recorded. Task complete."


class WorkStyleTask(AgentTask[WorkStyleResult]):
    """Understand work style and culture fit preferences."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Learn about their ideal work environment:
            - What team dynamics do they thrive in?
            - What management style do they prefer?
            - Do they prefer startup, mid-size, or enterprise companies?
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask about their ideal team environment and how they like to work with others."
        )
    
    @function_tool
    async def record_work_style(
        self,
        team_dynamics_preference: str,
        management_style_preference: str,
        company_size_preference: str,
    ) -> str:
        """Record work style preferences. Company size can be 'startup', 'mid-size', or 'enterprise'."""
        self.complete(WorkStyleResult(
            team_dynamics_preference=team_dynamics_preference,
            management_style_preference=management_style_preference,
            company_size_preference=company_size_preference,
        ))
        return "Work style preferences recorded. Task complete."


class LearningDriversTask(AgentTask[LearningDriversResult]):
    """Understand what drives their learning and growth."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Explore what drives their professional growth:
            - How important is mentorship to them?
            - Do they prefer autonomy or more guidance?
            - Do they like structure or flexibility?
            - What do they want more exposure to?
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask about what drives their professional growth and learning."
        )
    
    @function_tool
    async def record_learning_drivers(
        self,
        mentorship_importance: str,
        autonomy_preference: str,
        structure_preference: str,
        exposure_interests: str,
    ) -> str:
        """Record learning and growth preferences."""
        self.complete(LearningDriversResult(
            mentorship_importance=mentorship_importance,
            autonomy_preference=autonomy_preference,
            structure_preference=structure_preference,
            exposure_interests=exposure_interests,
        ))
        return "Learning drivers recorded. Task complete."


class CompensationTask(AgentTask[CompensationResult]):
    """Discuss compensation expectations."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Have a professional conversation about compensation:
            - What are their salary expectations?
            - How flexible are they on compensation?
            
            Be respectful and professional when discussing money.
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Transition to discussing compensation expectations professionally."
        )
    
    @function_tool
    async def record_compensation(
        self,
        salary_expectation: str,
        flexibility: str,
    ) -> str:
        """Record compensation expectations and flexibility."""
        self.complete(CompensationResult(
            salary_expectation=salary_expectation,
            flexibility=flexibility,
        ))
        return "Compensation expectations recorded. Task complete."


class LongTermGoalsTask(AgentTask[LongTermGoalsResult]):
    """Discuss long-term career direction."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Understand their long-term vision:
            - Where do they see themselves in 3-5 years?
            - What direction do they want their career to take?
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask about their long-term career goals and where they see themselves in a few years."
        )
    
    @function_tool
    async def record_long_term_goals(
        self,
        career_direction: str,
    ) -> str:
        """Record their 3-5 year career direction."""
        self.complete(LongTermGoalsResult(
            career_direction_3_5_years=career_direction,
        ))
        return "Long-term goals recorded. Task complete."


# ============================================================================
# END PHASE TASKS
# ============================================================================

class SummaryConfirmationTask(AgentTask[SummaryConfirmationResult]):
    """Summarize understanding and confirm with the candidate."""
    
    def __init__(self, chat_ctx=None, summary_context: str = "") -> None:
        super().__init__(
            instructions=f"""
            Provide a concise summary of what you've learned about the candidate:
            {summary_context}
            
            Ask them to confirm if your understanding is correct or if anything needs correction.
            """,
            chat_ctx=chat_ctx,
        )
        self._summary_context = summary_context
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="""
            Summarize your understanding of what they're looking for:
            - Role type and tech focus
            - Key preferences and constraints
            - Important priorities
            
            Ask if this summary is accurate or if anything should be corrected.
            """
        )
    
    @function_tool
    async def confirm_summary(self, confirmed: bool, corrections: str = "") -> str:
        """Record whether the summary was confirmed and any corrections."""
        self.complete(SummaryConfirmationResult(
            confirmed=confirmed,
            corrections=corrections if corrections else None,
        ))
        return "Summary confirmed. Task complete."


class CommunicationPreferencesTask(AgentTask[CommunicationPreferencesResult]):
    """Collect communication channel and frequency preferences."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Clarify their communication preferences:
            - What's their preferred communication channel (email, phone, text)?
            - How often would they like to receive updates?
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask how they prefer to be contacted and how often they'd like updates."
        )
    
    @function_tool
    async def record_communication_preferences(
        self,
        preferred_channel: str,
        preferred_frequency: str,
    ) -> str:
        """Record communication preferences."""
        self.complete(CommunicationPreferencesResult(
            preferred_channel=preferred_channel,
            preferred_frequency=preferred_frequency,
        ))
        return "Communication preferences recorded. Task complete."


class FeedbackTask(AgentTask[FeedbackResult]):
    """Collect feedback on the conversation experience."""
    
    def __init__(self, chat_ctx=None) -> None:
        super().__init__(
            instructions="""
            Ask for feedback on the conversation:
            - How was their experience talking with you?
            - Any suggestions for improvement?
            
            Be gracious and thank them for their time.
            After recording their feedback with the record_feedback tool, the tool will return
            guidance on how to close the conversation. Follow that guidance.
            """,
            chat_ctx=chat_ctx,
        )
    
    async def on_enter(self) -> None:
        await self.session.generate_reply(
            instructions="Ask how they found this conversation experience and if they have any feedback."
        )
    
    @function_tool
    async def record_feedback(self, feedback: str) -> str:
        """Record their feedback on the conversation."""
        self.complete(FeedbackResult(feedback=feedback))
        # Return guidance for closing - avoids nested generate_reply issues with Google Realtime API
        return """Feedback recorded. Now thank them sincerely for their time and participation. 
        Let them know the next steps and that someone will be in touch soon.
        End the conversation warmly and professionally without introducing new topics."""

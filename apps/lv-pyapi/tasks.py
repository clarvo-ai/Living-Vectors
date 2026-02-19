import logging

from livekit.agents import AgentTask, function_tool

logger = logging.getLogger("career-agent")


class OpeningTask(AgentTask[None]):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a career consultant. Your job is to get to know this person so you can
            find the best matching job opportunities for them after the conversation.
            You are in the opening phase. Set a warm, confident tone — this is a conversation
            with a trusted ally, not a screening call.
            Find out what brought them here and what they are hoping to get out of this.
            Where did they hear about the company "Clarvo".
            When you have a clear sense of their primary objective, call opening_complete.
            """,
        )

    async def on_enter(self) -> None:
        logger.info("[TASK] Opening — greeting and discovery")
        await self.session.generate_reply(
            instructions="Warmly welcome the candidate. Introduce yourself briefly as their career consultant, then ask what brought them here and what they're hoping to get out of this conversation."
        )

    @function_tool
    async def opening_complete(self) -> None:
        """Call this once you understand why the candidate is here and how they found Clarvo."""
        self.complete(None)


class LogisticsTask(AgentTask[None]):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a career consultant. Your goal is to understand the candidate's
            job search situation so you know how urgently and actively to work on their behalf.
            Cover:
            - How actively they are searching right now
            - When they are looking to make a move
            - Work authorization status if relevant
            - What is driving them to consider a change (the "push" factor)
            Keep it conversational. Call logistics_complete when you have covered these areas.
            """,
        )

    async def on_enter(self) -> None:
        logger.info("[TASK] Logistics — search intensity, timing, motivation")
        await self.session.generate_reply(
            instructions="Transition naturally into understanding their job search situation. Ask how actively they are searching and when they are looking to make a move."
        )

    @function_tool
    async def logistics_complete(self) -> None:
        """Call this once you have covered search intensity, timing, and motivation to leave."""
        self.complete(None)


class LocationTask(AgentTask[None]):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a career consultant. Understanding location constraints is critical
            for narrowing down the right opportunities for this candidate. Cover:
            - Which cities or regions they prefer
            - Openness to relocation
            - Their preference on remote, hybrid, or on-site work
            Be practical — you need this to filter jobs accurately on their behalf.
            Call location_complete when covered.
            """,
        )

    async def on_enter(self) -> None:
        logger.info("[TASK] Location — cities, relocation, remote/hybrid/onsite")
        await self.session.generate_reply(
            instructions="Transition naturally into understanding their location preferences. Ask which cities or regions they prefer and how they feel about remote versus on-site or hybrid work."
        )

    @function_tool
    async def location_complete(self) -> None:
        """Call this once you understand their geography and work model preferences."""
        self.complete(None)


class TechnicalTask(AgentTask[None]):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a career consultant doing a deep professional assessment.
            The better you understand their background, the better the roles you can surface.
            Cover:
            - Their most recent and relevant roles
            - The skills and areas where they truly excel (their "superpowers")
            - Areas they want to grow into — important for finding stretch roles
            - Their tech stack and tool comfort levels
            Speak the language of recruitment and tech. Be specific where they are specific.
            Call technical_complete when you have a solid picture.
            """,
        )

    async def on_enter(self) -> None:
        logger.info("[TASK] Technical — roles, strengths, tech stack")
        await self.session.generate_reply(
            instructions="Transition naturally into their professional background. Ask about their most recent role and what areas they consider their genuine strengths."
        )

    @function_tool
    async def technical_complete(self) -> None:
        """Call this once you have a clear picture of their experience, strengths, and tech stack."""
        self.complete(None)


class CultureTask(AgentTask[None]):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a career consultant. Culture fit is one of the biggest reasons
            placements succeed or fail — this matters as much as the technical match.
            Cover:
            - Management style they thrive under
            - Preferred team size
            - Where they fall on the startup vs established company spectrum
            Reference earlier answers where relevant to avoid repetition.
            Call culture_complete when covered.
            """,
        )

    async def on_enter(self) -> None:
        logger.info("[TASK] Culture — management style, team size, startup vs corp")
        await self.session.generate_reply(
            instructions="Transition naturally into culture fit. Ask what kind of management style they thrive under and whether they prefer a startup or more established company environment."
        )

    @function_tool
    async def culture_complete(self) -> None:
        """Call this once you understand their culture and team environment preferences."""
        self.complete(None)


class ValueVisionTask(AgentTask[None]):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a career consultant. You need comp and vision data to make sure
            you only surface roles worth their time — and to advocate for them in negotiations.
            Cover:
            - Their compensation expectations (a range is fine — reassure them this helps you filter)
            - Flexibility on comp vs other factors like equity, benefits, or role scope
            - Where they see themselves in three to five years — important for finding roles with growth
            Be warm and direct. Frame this as you working on their behalf, not an interrogation.
            Call value_vision_complete when covered.
            """,
        )

    async def on_enter(self) -> None:
        logger.info("[TASK] Value & Vision — compensation, career goals")
        await self.session.generate_reply(
            instructions="Transition naturally into comp and career vision. Frame it warmly — you need this to filter roles on their behalf. Ask about their compensation expectations and where they see themselves in three to five years."
        )

    @function_tool
    async def value_vision_complete(self) -> None:
        """Call this once you have covered compensation expectations and their career vision."""
        self.complete(None)


class AlignmentTask(AgentTask[None]):
    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a career consultant wrapping up this discovery session.
            Your job now is to confirm you have what you need to go and find them the right roles.
            Cover:
            - A warm, natural summary of what you heard — their background, priorities, and constraints
            - Confirm the hard constraints (location, comp, work model) so there are no surprises later
            - Ask if the summary sounds right or if they want to correct anything
            - Close warmly: tell them you now have a great picture of what they are looking for
              and that you will use this to match them with the best opportunities
            Call alignment_complete once they have confirmed and you have said goodbye.
            """,
        )

    async def on_enter(self) -> None:
        logger.info("[TASK] Alignment — summary, confirm, close")
        await self.session.generate_reply(
            instructions="The discovery phase is complete. Deliver a warm, natural summary of everything you heard — their background, what they are great at, what they want next, and their hard constraints on location, comp, and work model. Then ask if the summary sounds right."
        )

    @function_tool
    async def alignment_complete(self) -> None:
        """Call this once the candidate has confirmed the summary and the conversation is wrapping up."""
        self.complete(None)

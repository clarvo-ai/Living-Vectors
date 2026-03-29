import json
import asyncio
import logging
import os
from typing import Any

from livekit.agents import AgentTask, function_tool
from livekit import api as lkapi
from helper import update_completed_tasks

from faq import get_faq

logger = logging.getLogger("career-agent")

LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://127.0.0.1:7880")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET")


def _last_message_was_from_user(session: Any) -> bool:
    """
    Return True if the last message in session history is from the user, or if history is empty.
    Used in on_enter to avoid sending two agent messages in a row when multiple tasks are
    entered in the same turn (e.g. logistics_complete then industry_complete without user reply).
    We only generate a reply when we are actually responding to something the user said.
    """
    try:
        items = getattr(session.history, "items", None) or []
    except Exception:
        return True  # If we can't read history, allow reply (e.g. start of session)
    if not items:
        return True  # Start of conversation — we may send the opening greeting
    last = items[-1]
    role = getattr(last, "role", None)
    if role is None:
        return True
    # Compare as string in case role is an enum
    return str(role).lower() == "user"


async def _deferred_on_enter_reply(session: Any, instructions: str) -> None:
    """
    Run the on_enter reply on the next event-loop tick so that any agent message
    from the previous task (e.g. one that just called X_complete) is committed to
    history before we check. This prevents two consecutive agent messages when
    transitioning between tasks.
    """
    await asyncio.sleep(0)
    if not _last_message_was_from_user(session):
        return
    try:
        await session.generate_reply(instructions=instructions)
    except Exception as e:
        logger.warning("Deferred on_enter reply failed: %s", e)


async def _set_current_task(user_id: str, task_id: str) -> None:
    """Update room metadata via LiveKit API to set the current task."""
    try:
        async with lkapi.LiveKitAPI(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) as lk:
            room_name = f"interview-{user_id}"
            await lk.room.update_room_metadata(lkapi.UpdateRoomMetadataRequest(
                room=room_name,
                metadata=json.dumps({
                    "current_task": task_id,
                    "interview_ongoing": True,
                }),
            ))
            logger.info(f"Set current_task to '{task_id}' in room metadata")
    except Exception as e:
        logger.warning(f"Failed to set current_task in room metadata: {e}")


def _build_insight_block(insights: list[str]) -> str:
    if not insights:
        return ""
    lines = "\n".join(f"- {s}" for s in insights)
    return (
        "\n\nContext from previous conversations with this candidate "
        "(use this to avoid repeating questions and to personalise your approach):\n"
        + lines
    )


class OpeningTask(AgentTask[None]):
    def __init__(self, user_id: str, insights: list[str] | None = None, task_id: str = "opening") -> None:
        self._task_id = task_id
        self.user_id = user_id
        super().__init__(
            instructions="""
            Your name is the "Clarvo career assistant" — you help people explore
            their goals and get matched to the right job opportunities.
            In this phase, your goal is to learn: their current motivation and
            direction, why they are here, what they hope to get, and where they
            heard about Clarvo.

            Move on to the next phase (call opening_complete) once you know these
            things about the user. You might get there by asking, for example
            (one per turn; skip if already clear):
            - What's been exciting or interesting in what they've been learning
              or doing lately?
            - What led them to the field or direction they're in right now?
            - What brought them here today — what do they hope to get out of
              this?
            - Where did they hear about Clarvo? (Lead in briefly, e.g. "Quick
              thing — where did you hear about us?")

            Rules:
            - Do not send a message when you first enter this task after another
              task was just completed; only respond after the user has spoken.
            - React to what they said in a way that shows you heard them (reflect
              a detail, show interest, or connect to the next topic). Then ask
              one question. Avoid stock phrases like "Got it," "Great,"
              "Understood" as the only reaction.
            - Accept short answers. Keep responses short — voice conversation,
              not an essay.
            - This is one phase of a longer conversation — no "wrapping up" or
              "that's everything I need" language.
            - Once you know their primary objective and how they found Clarvo,
              call opening_complete. Do not speak before calling it. Call
              silently — next phase will respond.
            """ + _build_insight_block(insights or []),
            tools=[get_faq],
        )

    async def on_enter(self) -> None:
        await _set_current_task(self.user_id, self._task_id)
        logger.info("[TASK] Opening — greeting and discovery")
        asyncio.create_task(
            _deferred_on_enter_reply(
                self.session,
                "Give a very short introduction: what this is (a discovery "
                "conversation to understand their goals and preferences), "
                "what will happen (you'll ask about their background, what they "
                "want next, and constraints so you can match them to the right "
                "roles), and why (so job recommendations can be created for "
                "them). Keep it to 2-3 sentences. "
                "Do not start with 'Okay' or 'Ok'. Start with something warm "
                "(e.g. 'Hey there!') then the intro. "
                "Then ask ONE question: e.g. what's been exciting lately, "
                "what led them here, or what they hope to get out of this.",
            )
        )

    @function_tool
    async def opening_complete(self) -> None:
        """Call this once you understand why the candidate is here and how they found Clarvo."""
        self.complete(None)
        update_completed_tasks(self.user_id, "opening")


class LogisticsTask(AgentTask[None]):
    def __init__(self, user_id: str, insights: list[str] | None = None, task_id: str = "logistics") -> None:
        self._task_id = task_id
        self.user_id = user_id
        super().__init__(
            instructions="""
            Your name is the "Clarvo career assistant". In this phase, learn
            about their job search situation so you know how urgently and
            actively to work on their behalf.

            Move on to the next phase (call logistics_complete) once you know
            these things about the user: how actively they are searching right
            now; when they are looking to make a move; and what is driving them
            to consider a change (the "push" factor). Do not ask about work
            authorization.

            Rules:
            - Do not send a message when you first enter this task after
              another task was just completed; only respond after the user has
              spoken.
            - React to what they said in a way that shows you heard them
              (reflect a detail, show interest, or connect to the next topic).
              Then ask one question. Avoid stock phrases like "Got it," "Great,"
              "Understood" as the only reaction. Accept short answers. Short
              responses.
            - One phase of a longer conversation — no "wrapping up" language.
            - Once you know the above, call logistics_complete. Do not speak
              before calling it. Call silently.
            """ + _build_insight_block(insights or []),
            tools=[get_faq],
        )

    async def on_enter(self) -> None:
        await _set_current_task(self.user_id, self._task_id)
        logger.info("[TASK] Logistics — search intensity, timing, motivation")
        asyncio.create_task(
            _deferred_on_enter_reply(
                self.session,
                "Connect to what they just said (e.g. their goal or how they "
                "found Clarvo), then ask one question: how actively they are "
                "searching right now. No generic 'In terms of your job search…' "
                "unless it naturally follows from their words.",
            )
        )

    @function_tool
    async def logistics_complete(self) -> None:
        """Call this once you have covered search intensity, timing, and motivation to leave."""
        self.complete(None)
        update_completed_tasks(self.user_id, "logistics")


class IndustryTask(AgentTask[None]):
    def __init__(self, user_id: str, insights: list[str] | None = None, task_id: str = "industry") -> None:
        self._task_id = task_id
        self.user_id = user_id
        super().__init__(
            instructions="""
            Your name is the "Clarvo career assistant". Before diving into specifics, you need to understand what industry or field they want to work in — it shapes location, work model, comp, and what "a great role" looks like for them.

            Move on to the next phase (call industry_complete) once you know these things about the user: which industry or field they are targeting (e.g. healthcare, finance, tech, education, creative, retail, logistics, public sector); whether they want to stay in their current industry or switch; and if switching, what's drawing them to the new field.

            Rules:
            - Do not send a message when you first enter this task after another task was just completed; only respond after the user has spoken.
            - React to what they said in a way that shows you heard them (reflect a detail, show interest, or connect to the next topic). Then ask one question. Avoid stock phrases like "Got it," "Great," "Understood" as the only reaction. Accept short answers. Short responses.
            - One phase of a longer conversation — no "wrapping up" language.
            - Once you know the above, call industry_complete. Do not speak before calling it. Call silently.
            """ + _build_insight_block(insights or []),
            tools=[get_faq],
        )

    async def on_enter(self) -> None:
        await _set_current_task(self.user_id, self._task_id)
        logger.info("[TASK] Industry — target field and sector")
        asyncio.create_task(
            _deferred_on_enter_reply(
                self.session,
                "Connect to what they just said (e.g. their timing or "
                "motivation), then ask one question about what industry or "
                "field they're targeting. No generic 'In terms of the kind of "
                "work you want…' unless it naturally follows from their words.",
            )
        )

    @function_tool
    async def industry_complete(self) -> None:
        """Call this once you know what industry or field the candidate is targeting."""
        self.complete(None)
        update_completed_tasks(self.user_id, "industry")


class LocationTask(AgentTask[None]):
    def __init__(self, user_id: str, insights: list[str] | None = None, task_id: str = "location") -> None:
        self._task_id = task_id
        self.user_id = user_id
        super().__init__(
            instructions="""
            Understanding location constraints is critical for narrowing down
            the right opportunities. You need this to filter jobs accurately on
            their behalf.

            Move on to the next phase (call location_complete) once you know
            these things about the user: which cities or regions they prefer;
            openness to relocation; and their preference on remote, hybrid, or
            on-site work — but only if relevant to their industry (for
            inherently on-site roles e.g. healthcare, childcare, retail,
            construction, hospitality, skip or acknowledge naturally).

            Rules:
            - Do not send a message when you first enter this task after
              another task was just completed; only respond after the user has
              spoken.
            - React to what they said in a way that shows you heard them
              (reflect a detail, show interest, or connect to the next topic).
              Then ask one question. Avoid stock phrases like "Got it," "Great,"
              "Understood" as the only reaction. Accept short answers. Short
              responses.
            - One phase of a longer conversation — no "wrapping up" language.
            - Once you know the above, call location_complete. Do not speak
              before calling it. Call silently.
            """ + _build_insight_block(insights or []),
            tools=[get_faq],
        )

    async def on_enter(self) -> None:
        await _set_current_task(self.user_id, self._task_id)
        logger.info("[TASK] Location — cities, relocation, remote/hybrid/onsite")
        asyncio.create_task(
            _deferred_on_enter_reply(
                self.session,
                "Connect to what they just said (e.g. their industry or role), "
                "then ask one question about which cities or regions they prefer. "
                "No generic 'In terms of location…' unless it naturally follows "
                "from their words.",
            )
        )

    @function_tool
    async def location_complete(self) -> None:
        """Call this once you understand their geography and work model preferences."""
        self.complete(None)
        update_completed_tasks(self.user_id, "location")


class BackgroundTask(AgentTask[None]):
    def __init__(self, user_id: str, insights: list[str] | None = None, task_id: str = "background") -> None:
        self._task_id = task_id
        self.user_id = user_id
        super().__init__(
            instructions="""
            Your name is the "Clarvo career assistant". Deep professional
            background — the better you understand them, the better the roles
            you can surface. Adapt to their field (engineering, design,
            marketing, etc.). Speak their professional language.

            Move on to the next phase (call background_complete) once you know
            these things about the user: their recent or most relevant roles;
            skills and areas where they excel; areas they want to grow into;
            key tools or domain knowledge; what makes work harder or drains
            them; and what would make the next step easier. You might get there
            by asking, for example (one per turn; skip if already clear): what
            gives them energy in their work or what projects make them lose
            track of time; what people usually come to them for or what feels
            effortless for them; what their most recent role was and what they
            did day to day; what situations make work harder or what would make
            their next step easier. When moving to a new theme, use a
            one-sentence bridge (e.g. "Another angle — …", "In terms of your
            strengths…").

            Rules:
            - Do not send a message when you first enter this task after
              another task was just completed; only respond after the user has
              spoken.
            - React to what they said in a way that shows you heard them
              (reflect a detail, show interest, or connect to the next topic).
              Then ask one question. Avoid stock phrases like "Got it," "Great,"
              "Understood" as the only reaction. Accept short answers. Short
              responses.
            - One phase of a longer conversation — no "wrapping up" language.
            - Once you know the above, call background_complete. Do not speak
              before calling it. Call silently.
            """ + _build_insight_block(insights or []),
            tools=[get_faq],
        )

    async def on_enter(self) -> None:
        await _set_current_task(self.user_id, self._task_id)
        logger.info("[TASK] Background — roles, strengths, tools/domain")
        asyncio.create_task(
            _deferred_on_enter_reply(
                self.session,
                "Connect to what they just said (e.g. their location or work "
                "model), then ask one question: e.g. what gives them energy in "
                "their work, or what their most recent role was. No generic "
                "'Let's talk about your background…' unless it naturally "
                "follows from their words.",
            )
        )

    @function_tool
    async def background_complete(self) -> None:
        """Call this once you have a clear picture of their experience, strengths, and domain knowledge."""
        self.complete(None)
        update_completed_tasks(self.user_id, "background")


class CultureTask(AgentTask[None]):
    def __init__(self, user_id: str, insights: list[str] | None = None, task_id: str = "culture") -> None:
        self._task_id = task_id
        self.user_id = user_id
        super().__init__(
            instructions="""
            Your name is the "Clarvo career assistant". Culture fit matters as
            much as skills for placement success.

            Move on to the next phase (call culture_complete) once you know
            these things about the user: what management style they thrive
            under; preferred team size; where they fall on startup vs
            established company; how they like to support or guide others; and
            how they contribute to team decisions. You might get there by
            asking, for example (one per turn; skip if already clear): what
            kind of teamwork makes them feel at their best; what environment
            helps them do their best work; how they like to support others or
            how they contribute when the team makes decisions. When moving to a
            new theme, use a one-sentence bridge (e.g. "In terms of how you
            like to work…").

            Rules:
            - Do not send a message when you first enter this task after
              another task was just completed; only respond after the user has
              spoken.
            - React to what they said in a way that shows you heard them
              (reflect a detail, show interest, or connect to the next topic).
              Then ask one question. Avoid stock phrases like "Got it," "Great,"
              "Understood" as the only reaction. Accept short answers. Short
              responses.
            - One phase of a longer conversation — no "wrapping up" language.
            - Once you know the above, call culture_complete. Do not speak
              before calling it. Call silently.
            """ + _build_insight_block(insights or []),
            tools=[get_faq],
        )

    async def on_enter(self) -> None:
        await _set_current_task(self.user_id, self._task_id)
        logger.info("[TASK] Culture — management style, team size, startup vs corp")
        asyncio.create_task(
            _deferred_on_enter_reply(
                self.session,
                "Connect to what they just said (e.g. their strengths or "
                "role), then ask one question: e.g. what kind of teamwork "
                "works best for them, or what management style they thrive "
                "under. No generic 'Let's talk about the kind of "
                "environment…' unless it naturally follows from their words.",
            )
        )

    @function_tool
    async def culture_complete(self) -> None:
        """Call this once you understand their culture and team environment preferences."""
        self.complete(None)
        update_completed_tasks(self.user_id, "culture")


class ValueVisionTask(AgentTask[None]):
    def __init__(self, user_id: str, insights: list[str] | None = None, task_id: str = "value_vision") -> None:
        self._task_id = task_id
        self.user_id = user_id
        super().__init__(
            instructions="""
            Your name is the "Clarvo career assistant". You need comp and
            vision to surface roles worth their time and advocate for them.

            Move on to the next phase (call value_vision_complete) once you know
            these things about the user: their compensation expectations (a
            range is fine; reassure this helps you filter); how they weigh comp
            vs equity, benefits, or role scope; where they see themselves in
            the next few years (ask about one timeframe only, e.g. 3-5 years —
            do not also ask about 10-15 years or longer term); and what matters
            most to them in how they work. You might get there by asking, for
            example (one per turn; skip if already clear): what are their
            compensation expectations; how they weigh comp vs other factors;
            where they see themselves in the next few years or what
            problems/causes they'd love to be part of (one career-vision
            question only; do not ask both a 3–5 year and a 10–15 year goal);
            what matters most in the way they work or what meaningful work
            means to them. When moving to a new theme, use a one-sentence
            bridge (e.g. "In terms of where you're headed…"). Warm and direct —
            you're on their side.

            Rules:
            - Do not send a message when you first enter this task after
              another task was just completed; only respond after the user has
              spoken.
            - React to what they said in a way that shows you heard them
              (reflect a detail, show interest, or connect to the next topic).
              Then ask one question. Avoid stock phrases like "Got it," "Great,"
              "Understood" as the only reaction. Accept short answers. Short
              responses.
            - One phase of a longer conversation — no "wrapping up" language.
            - Once you know the above, call value_vision_complete. Do not speak
              before calling it. Call silently.
            """ + _build_insight_block(insights or []),
            tools=[get_faq],
        )

    async def on_enter(self) -> None:
        await _set_current_task(self.user_id, self._task_id)
        logger.info("[TASK] Value & Vision — compensation, career goals")
        asyncio.create_task(
            _deferred_on_enter_reply(
                self.session,
                "Connect to what they just said (e.g. their culture or team "
                "preferences), then ask one question: e.g. compensation "
                "expectations, or what matters most to them in how they work. "
                "No generic 'To surface roles worth your time…' unless it "
                "naturally follows from their words.",
            )
        )

    @function_tool
    async def value_vision_complete(self) -> None:
        """Call this once you have covered compensation expectations and their career vision."""
        self.complete(None)
        update_completed_tasks(self.user_id, "value_vision")


class AlignmentTask(AgentTask[None]):
    def __init__(self, user_id: str, insights: list[str] | None = None, task_id: str = "alignment") -> None:
        self._task_id = task_id
        self.user_id = user_id
        super().__init__(
            instructions="""
            Your name is the "Clarvo career assistant". Wrapping up: deliver a
            brief summary, get confirmation, then close the call properly.
            Do NOT ask extra "final" questions (e.g. "Who else should I talk
            to?", "Anything else to share?"). Stick to: summary → ask if it
            sounds right → when they confirm or say goodbye, give the closing
            once and stop.

            If the user corrects one or two details (e.g. salary range, timeline
            for management): in the SAME message, (1) briefly acknowledge the
            correction (e.g. "Noted, 3000–3500." or "Got it, 10 years for a
            management role."), then (2) ask if everything else sounds right.

            When they confirm the summary (e.g. "sounds good", "that's right",
            "thank you", "bye") do NOT repeat the recap. Give the closing in
            one message: one short, warm sentence, then briefly refer back to
            the start (we said we'd explore your goals and match you — we've
            done that). Say that job recommendations will now be created for
            them and jobs will appear on their Opportunities page shortly.
            Call `alignment_complete` IN THE SAME TURN.
            Do NOT wait for them to respond to your goodbye before calling the tool.
            """ + _build_insight_block(insights or []),
            tools=[get_faq],
        )

    async def on_enter(self) -> None:
        await _set_current_task(self.user_id, self._task_id)
        logger.info("[TASK] Alignment — summary, confirm, close")
        asyncio.create_task(
            _deferred_on_enter_reply(
                self.session,
                "Use ONLY the captured insights as the basis for your summary "
                "— do not add anything not in the list. "
                "Deliver a short, warm summary: background, what they're great "
                "at, what they want next, hard constraints (location, comp, "
                "work model). "
                "Then ask if the summary sounds right. Do not ask any other "
                "questions (no 'who else should I talk to', 'anything else to "
                "share', etc.).",
            )
        )

    @function_tool
    async def alignment_complete(self) -> None:
        """Call this once the candidate has confirmed the summary and you are ready to say goodbye."""
        update_completed_tasks(self.user_id, "alignment")
        self.complete(None)

# Summary of the file:

**Across all sessions, Jack & Jill’s Voice AI showed strong structure, contextual personalization, and effective information extraction. However, devs consistently highlighted issues with pacing, repetition, interruption handling, and emotional naturalness. By refining these aspects (while retaining the strong logical flow, summarization, and goal-driven questioning), our product can feel significantly more human, less robotic, and better aligned with real conversational norms.**

---

**Note:** To preview the (formatted) `.md` file locally, press `Cmd/Ctrl + Shift + V`.

---

# I. Full Set of Questions Asked Across All Sessions

## Notes:

## Motivation & Context

- "What made you decide to explore new opportunities right now?"
- "What sparked your interest in exploring new opportunities right now?"
- "How long have you been feeling this way?"
- "Is there something specific about your current role that's driving you to look elsewhere?"
- "What brings you here today and what are you looking for in your next career move?"
- "Has anything changed about your preferences or timeline since our last conversation?"

## Background & Current Status

- "Just to confirm, you're a third-year CS student at Aalto University, minoring in data science?"
- "Can you tell me a bit about your program and what subjects or projects you're passionate about?"
- "What kind of roles have you enjoyed before?"
- "Is your **CV** up to date?"
- "How did you first hear about us?"

## Role Type & Employment Preferences

- "Are you looking for **internships**, **part-time roles**, or your first **full-time role**?"
- "**Summer job**? **Part-time**? **Full-time**?"
- "Would you prefer to start with an internship, part-time role, or something long-term?"
- "How many hours per week?"
- "How soon can you start?"
- "Are you allowed to work in **Finland** / the **EU**?"

## Daily Work & Style Preferences

- "When you imagine your ideal role, what kind of work are you doing day-to-day?"
- "Creating something new or improving existing systems?"
- "Do you enjoy constant communication or deep solo focus time?"
- "Do you prefer structured days or flexible schedules?"

## Technical Interests

- "When you say **data-oriented**, what does that look like day-to-day?"
- "Specific tools or techniques you want to use (**ML**, **visualization**, etc.)?"
- "Any industries that excite you?"
- "Are you focusing on any specific **AI** area (**NLP**, **CV**, etc.)?"
- "Languages or technologies you're most comfortable with?"
- "**DevOps** or **full-stack**—what draws you to each?"

## Projects & Strengths

- "What are your **superpowers**?"
- "Tell me more about your **AI-powered image analysis** / notable project."
- "What was most challenging or rewarding about it?"
- "Is there a project that highlights your expertise?"
- "Have you learned something new from this project?"

## Company & Team Preferences

- "**Bigger established companies** or **small fast-moving startups**?"
- "**Early-stage startup** or more established one?"
- "What kind of managers or colleagues help you thrive?"
- "Company cultures you want to avoid?"
- "Any companies you admire?"

## Location & Logistics

- "**Remote**, **hybrid**, or **on-site**?"
- "Are you open to roles outside **Helsinki**?"
- "Where would you like to focus your search now?"

## Future Career Direction

- "In **3–5 years**, what does success look like for you?"
- "**Technical expertise** or **leadership**?"
- "What do you need from your first role—**mentorship**, **diverse projects**, **certifications**?"

## Compensation

- "What salary are you hoping for?"
- "**Hourly pay**?"
- "Any flexibility in that number?"

## Follow-up Calibration Questions

- "Do you want to explore a different area, or should I hold off for now?"
- "Is there anything that hasn't quite hit the mark lately?"
- "Anything else you want to adjust?"

## Closing/Feedback

- "What was it like chatting with an **AI**?"
- "Any feedback on the service?"

---

# II. Core Conversation Drivers Used by Jack & Jill AI

## Observations

### 1. Underlying Logic / Structure

Across all developers, the AI consistently followed a recognizable pattern:

1. **Motivation exploration**
2. **Background verification**
3. **Role type clarification**
4. **Technical deep dives**
5. **Work style and cultural preferences**
6. **Future vision alignment**
7. **Constraints** (salary, location, work rights)
8. **Summary + final adjustments**


!!This structure really resembles a **recruiter intake call**, optimized for filling a structured candidate profile.

### 2. Conversational Strategies / Question Types

- **Either/or framing** (e.g., startup vs. established) to simplify decisions.
- **Reflective paraphrasing** to confirm understanding.
- **Progressive narrowing**: questions became more specific as the conversation evolved.
- **Contextual inference** using **CV/LinkedIn** data.
- **Follow-up probes** triggered whenever the user gave high-level answers.

### 3. Patterns Noted

- AI often pushed for **specificity** even when the user expressed openness.
- Occasionally **re-asked questions** (even) if previous answers were embedded inside longer replies. This did feel annoying for some devs, as explained below.
- Sometimes referenced **unverified external data**, causing confusion.

---

# III. Voice AI Experience

## Smooth or Natural Moments

- Good pronunciation, clear audio.
- Logical follow-up questions using previous answers.
- Used **CV/LinkedIn** context to personalize.
- Pauses/stutters sometimes made it feel more human.
- Final summaries generally accurate and helpful.

## Robotic, Awkward, or Confusing Moments

- **Repeated questions** were the #1 issue across all developers.
- Speaking too fast, especially at the beginning.
- Often interrupted users thinking or continued after being interrupted.
- Overly affirming responses ("fantastic idea!") reduced realism.
- Asked multiple questions in one turn.
- Voice sometimes buggy, rushed, or emotionally flat.

## Follow-ups and Clarifications

- Follow-ups were usually relevant but sometimes excessive.
- Strong summarization, but long summaries slowed pacing.
- Good at accepting corrections ("I'll incorporate that").

---

# IV. What to Replicate, Adapt, or Skip

## Features / Patterns to Replicate

- **Logical recruiter-style flow**
- **Active listening + summarizing**
- **Clear, structured questions**
- **Contextual personalization** using CV/LinkedIn
- **Either/or framing** to help decision-making
- **Ability to adapt** when corrected

## Features to Adapt / Improve

- **Pacing**: slower, more deliberate delivery
- **Interrupt handling**: detect thinking vs. finished speaking
- **Avoid repeating questions** already fully answered
- **Improve emotional tone**: add warmth and reduce over-affirmation
- **Keep it simple**: just ask one question at a time
- **Accuracy**: verify external references before using them
- **UI improvements**: progress indicator, better layout, stable transcript storage
- It does not have a chat interface. Ours will.

## Aspects to Avoid Entirely

- Re-asking the same question in slightly different forms
- Long multi-question blocks
- Overly leading questions that assume too much experience
- Artificially enthusiastic affirmations
- Voice behavior that rushes or interrupts users
- Most devs experienced problems with the initial authentication. This should be avoided.

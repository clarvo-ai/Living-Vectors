## 🚀 Create LiveKit Agent for Structured Career Conversation

### 🎯 Goal

Develop a LiveKit Agent that can conduct a structured, natural career-focused conversation with candidates, divided into three distinct phases: **Start**, **Main**, and **End**. The agent should gather comprehensive insights into the user’s motivations, background, and goals to support effective career matching.

### 🧠 Specs

#### 1. Start Phase

Kick off with friendly, open-ended questions to set a relaxed tone:

- "How are you doing today?"
- "How did you first hear about Clarvo?"
- "What brings you here today and what are you looking for in your next career move?"

#### 2. Main Phase

Systematically collect and refine information across the following categories:

- **Motivation & Timing**: Why are they exploring now? How active is their search?
- **Baseline Info**: Education, graduation, work authorization, availability, role types.
- **Location Preferences**: Cities/regions, relocation openness, remote/hybrid/on-site.
- **Experience**: Roles/projects, enjoyed/challenging parts, key learnings.
- **Technical Skills**: Current strengths vs growth areas, tools, focus areas.
- **Superpowers**: Personal strengths through examples.
- **Work Style & Culture Fit**: Team dynamics, management style, startup vs corp.
- **Learning & Growth Drivers**: Mentorship, autonomy, structure, exposure.
- **Compensation**: Expectations and flexibility.
- **Long-Term Goals**: 3–5 year career direction.

#### 3. End Phase

Close the loop with clarity and confirmation:

- Summarize understanding of role type, tech focus, preferences, constraints.
- Ask for confirmation/corrections to avoid mismatches.
- Clarify communication channel and frequency preferences.
- Reconfirm any uncertain constraints (e.g., comp, availability, location).
- Collect feedback on the conversation experience.
- End politely and confidently without introducing new topics.

### 🛠️ Implementation

- Use LiveKit’s agent framework to build and deploy this interactive agent.
- Ensure it can adapt its conversation flow based on user responses.
- Structure logic to handle the three conversation phases distinctly.
- Provide fallback or clarification prompts when user responses are ambiguous or incomplete.

### 📌 Notes

- Keep the tone professional yet warm and conversational.
- Regularly summarize and confirm inputs to maintain alignment.
- Conversation data should be structured for downstream matching or review.

EDIT:
After reading livekit docs, I found out that tasks might be very well suitable for the conversation, general idea:

### 🚀 Implement LiveKit Agent Tasks for Career Discussion Questions

#### 🔧 Tasks

- [ ] Define a set of focused tasks for each key career discussion question (e.g., current role, career goals, challenges, aspirations).
- [ ] Implement each task using LiveKit's task framework with a clear goal and typed result.
- [ ] Group these tasks using a `TaskGroup` to guide the user through a multi-step career conversation.
- [ ] Enable the ability for users to return to previous steps within the `TaskGroup` to revise their responses.
- [ ] Ensure all tasks share and update the conversation context appropriately.
- [ ] Test the flow for naturalness and accuracy of data capture.

#### 📚 Reference

- LiveKit Agent Tasks Documentation: https://docs.livekit.io/agents/logic/tasks/

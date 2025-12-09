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

# V. Raw data

## Question set 1:

1. "What made you decide to explore new opportunities right now?"
2. "How long have you been feeling this way?"
3. "Is there something specific about your current role that's driving you to look elsewhere?"
4. "Can you tell me a bit about what you've been working on and what you've enjoyed?"
5. "Are you looking for internships, part-time roles, or your first full-time role after graduation?"
6. "Are you thinking about remote roles or specific locations?"
7. "Just to confirm, you're a third-year CS student at Aalto University, minoring in data science?"
8. "What kind of opportunities are you hoping to find right now? What's your ideal start date?"
9. "When you say a data-oriented role, what does that look like day-to-day?"
10. "Are there specific tools or techniques you want to use (e.g., machine learning, visualization tools)?"
11. "Any industries or projects that excite you for applying ML?"
12. "Any specific tools or languages you want to use?"
13. "Do you prefer bigger established companies or small fast-moving startups?"
14. "Would you prefer a large team or a small team within a big company?"
15. "Any values or work-style preferences important to you?"
16. "Any companies you admire?"
17. "Any specific roles or teams at Nokia you're interested in?"
18. "In 3–5 years, what does success look like for you?"
19. "Technical expertise or leadership?"
20. "Are you excited about specific ML areas like NLP or computer vision?"
21. "What would help you grow: mentorship, cutting-edge projects, or variety?"
22. "Any project types or industries that could broaden your experience?"
23. "What are your superpowers?"
24. "Tell me more about your AI-powered image analysis project."
25. "What was most challenging or rewarding about that project?"
26. "What salary are you hoping for in your first full-time role?"
27. "Any flexibility in that number?"
28. "Are you open to roles outside Helsinki — nationally or internationally?"
29. "Hybrid, remote, or in-office preference?"
30. "Do you prefer structured days or flexible focus-time schedules?"
31. "Will you graduate at the end of 2026?"
32. "Do you have the right to work in Finland and the EU?"
33. "Would you prefer more job options or only highly targeted roles?"
34. "How did you find the experience today — what was it like talking to an AI?"

## Question set 2:

1. "What are your intentions? Just check out whats out there or looking for a job?"
2. "What kind of roles have you enjoyed before?"
3. "Is your CV up to date?"
4. "What kind of job? Summerjob? Part-time? Fulltime?"
5. "Which kind of work do you see yourself doing? (Referenced my earlier projects and answers)"
6. "What did you find fun / interesting about the project you mentioned."
7. "What are you looking to learn in your next job?"
8. "Is there a project/theme that interests you most right now."
9. "What excites you most? Technology? Problem-solving? Potential applications?"
10. "Established companies or startup atmosphere?"
11. "What excites you about that atmosphere?"
12. "What kind of managers and colleageues would help you thrive?"
13. "Anything specific about company culture?"
14. "Where do you want to be in 3 to 5 years?"
15. "What are you looking for? Hands on experience? Mentorship? Learning how startups work?"
16. "Are you focusing on a specific area in AI? (I had mentioned I do AI)"
17. "What are your biggest strengths when programming?"
18. "Is there a project that highlights your expertise? Something you are really proud of?"
19. "What was the most important or challenging part of this project?"
20. "Did you learn something new from this project?"
21. "Hourly pay how much you want?"
22. "How many hours per week?"
23. "Remote, hybrid or on-site?"
24. "How soon can you start? Are you allowed to work in finland?"
25. "How often do we mail you?"
26. "Feedback on the service?"

## Question set 3:

1. "Has anything changed about your preferences or timeline since our last conversation?"
2. "Do you want to explore a different area, or should I just hold off on the search for now until you're more certain?"
3. "Has anything else changed about your preferences or timeline that I should know before diving in?"
4. "Just to confirm, are you thinking about a specific range or number, or just aiming generally higher than our previous conversations?"
5. "Anything else you'd like me to tweak or keep an eye out for?"
6. "What else should I keep in mind while searching for your new role?"
7. "Is there anything else that's on your mind regarding job types, companies, or locations?"
8. "Anything else you want to update or adjust while we're at it?"
9. "Based on the roles I've been sending, is there anything that hasn't quite hit the mark for you lately?"
10. "Is there something specific you want to steer towards?"
11. "Is there any other area you'd like to explore or modify?"
12. "Is there any other specific technology or skill areas you're interested in?"
13. "Where would you like to focus your job search now?"
14. "Anything else you'd like to tweak or update while we're at it?"

## Question set 4:

1. "How did you first hear about us?"
2. "What made you decide to explore new opportunities right now?"
3. "Is there anything else you'd like me to know about your current situation?"
4. "Imagine you've landed a great position. What activities do you see yourself doing day to day? Are you deep in development work, collaborating with others, or maybe solving specific customer problems?"
5. "In your experience as a programming teaching assistant, what aspects of collaboration have you found most rewarding? Is it the team brainstorming sessions, providing mentorship, or something else?"
6. "In your day-to-day work, would you prefer a role where you're in constant communication with a team to brainstorm these solutions, or do you enjoy having some solo time to dig into a problem deeply before coming back together?"
7. "Thinking about your ideal role, are there specific technologies, programming languages, or areas within computer science that you're particularly excited to work with? For instance, is there a certain field like web development or machine learning that excites you?"
8. "When it comes to collaborating with others, what kind of team environment helps you do your best work? For instance, do you thrive in a place with clear roles and responsibilities, or do you prefer a more flexible and dynamic setting where everyone can contribute in different ways?"
9. "What kind of company structure appeals to you for your first role post-university? Do you see yourself thriving in a large, established tech company with structured programs, or maybe in a smaller, nimble startup where you can wear many hats and dive into various projects?"
10. "Are there any particular company cultures you find appealing or any that you definitely want to avoid?"
11. "Is there anything more about your work environment or team dynamics that you'd like to dive into?"
12. "Looking ahead a few years, if we were to chat again in, say, three to five years, what would you hope to have achieved in your career by then?"
13. "For your first role, what do you think is most essential to help you build that strong beginning? Is it mentorship, exposure to diverse projects, or maybe gaining certain technical skills?"
14. "Are there any specific mentors or role models, whether in your personal life or industry figures, who inspire you in your career path?"
15. "What would you say are your superpowers or key strengths, thinking about your studies and your work as a Teaching Assistant?"
16. "With that strength in mind, can you share an example of a project or situation where your patience really made a difference in overcoming a challenge or achieving success?"
17. "Have you found that your patience has helped you guide students or manage tricky coding challenges in other situations?"
18. "Could you walk me through a specific problem you managed during your work as a Teaching Assistant that was particularly tricky but you solved effectively using your patience and skills?"
19. "Does that sum up things accurately? Anything you'd like to add?"
20. "Does that sound about right? Anything you'd like to tweak or add?"
21. "Would you like a higher volume of broadly matching roles, or just a few strong fits?"
22. "What's it been like chatting with an AI career agent like me?"

## Question set 5:

1. "What sparked your interest in exploring new opportunities right now?"
2. "Could you share more about what kind of roles you're interested in within startups?"
3. "Would you prefer to start with an internship or part-time role... or are you thinking about something more long-term?"
4. "When you imagine your ideal role, what kind of software development work are you doing day-to-day?"
5. "Do you prefer creating something entirely new... or do you enjoy taking something existing and improving it?"
6. "What is it about the startup environment that really excites you?"
7. "Do you envision being part of a very early-stage company... or something more established...?"
8. "Are there specific aspects of the business side like Product Management, Sales, or Marketing... or is it more about understanding how everything functions strategically?"
9. "Looking three to five years ahead... what is your ideal career look like?"
10. "What do you think you need most from an internship or entry-level role to help prepare you...?"
11. "What would you say are your superpowers? What are you uniquely good at?"
12. "Given you're looking for an internship or part-time role, what are your expectations around compensation?"
13. "Are you mostly looking for roles in the Helsinki area? And do you have a preference for a work setup...?"

## Question set 6:

1. "How are you doing today?"
2. "How did you first hear about Jack and Jill?"
3. "What brings you here today and what are you looking for in your next career move?"
4. "Can you tell me a bit about your program and what subjects or projects you're most passionate about right now?"
5. "Have there been any projects or experiences in your studies that stand out to you? Maybe something where you applied your programming skills or any group project that you found particularly rewarding?"
6. "Are there any specific languages or technologies you're most comfortable with or eager to dive deeper into?"
7. "What does your ideal workday or week look like in terms of hours and tasks?"
8. "When you think about DevOps and full stack development, what draws you to each? Is there something specific you've learned at Aalto or any other experience that sparked your interest in these fields?"
9. "When you envision your ideal day-to-day work, is it about having the autonomy to tackle problems your way, flexible working hours, or an environment with minimal supervision?"
10. "When you picture the company that offers you freedom and growth, what size are you imagining? A small, fast-moving startup or a larger, more established company?"
11. "What kind of people do you see yourself working with? And what does a great manager look like to you? Would they be hands-on or someone who gives you the freedom to figure things out on your own?"
12. "Looking ahead three to five years from now, after you've graduated and had a role or two, what would you want your career to look like?"
13. "What would be the most important thing this first trainee role could offer you? Is it mentorship, certifications, or exposure to specific technologies?"
14. "What would you say are your superpowers when it comes to programming and development?"
15. "Is there a part of programming where you feel you're really in your element?"
16. "What kind of monthly salary are you targeting for a first trainee position?"
17. "Would you prefer to work fully remotely or are you open to a hybrid model where you might visit an office occasionally?"
18. "How has your experience been chatting with me and AI this way? Any feedback is super helpful."

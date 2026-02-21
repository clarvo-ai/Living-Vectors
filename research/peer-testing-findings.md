# Peer Testing – Session 1 Findings

## Overview

- **Date:** 28 January 2026  
- **Duration:** ~1 hour per tester  
- **Testers:** Arno Muttilainen, Joar Nylund  
- **Testing type:** Exploratory usability testing 
- **Primary focus:**  
  - Voice interface  
  - Interview/chat flow  
  - Basic navigation  
  - Profile form usability and validation  

This document summarizes the findings from the first peer testing session and is intended for documentation and future reference.

---

## Test Charter Summary

The purpose of this session was to evaluate the **usability and intuitiveness** of the current build, with a particular focus on:

- Conversational flow of the AI interview
- Voice interaction behavior
- Basic navigation and session handling
- Discoverability of system behavior and constraints

Testing was conducted in an exploratory manner to surface usability issues and unexpected behaviors early.

---

## Key Findings

### 1. Interview & Chat Flow

Several issues were observed related to controlling and understanding the interview process:

- Users were **unable to reliably end or restart** the interview.
- Explicit commands such as *“end interview”* were ignored.
- After the interview appeared to end, the **chat remained open** and continued the conversation.
- Users could not tell:
  - How many questions remained
  - How long the interview would take
  - How far along they were in the process
- The chat advanced automatically even when:
  - An answer was cut off
  - The user replied with a question
  - The response was unclear or incomplete

This caused confusion and frustration, especially after answering around 10 questions.

---

### 2. AI Response Behavior

- Responses became **overly long and repetitive** over time.
- Excessive praise before questions felt unnecessary and reduced readability.
- The AI showed weak conversational memory:
  - Repeated previously asked questions
  - Failed to notice contradictory answers
- The system did not clearly distinguish between:
  - A response to a question
  - A new topic introduced by the user

---

### 3. Profile Form & Input Validation

The profile form lacked basic validation:

- No length limits on input fields
- Phone number field accepted letters and arbitrary characters
- Fields accepted random strings
- Saving the profile caused the user to be **kicked out of the page** each time

These issues impact both usability and data integrity.

---

### 4. UI / UX Issues

- Chat bubbles visually break when entering long strings without spaces.
- Mapping from user name to first name / last name was unclear.
- The end state of an interview was not visually distinguishable.
- No progress indicator or time expectation was shown.
- No FAQ or practical guidance was available in the UI.



---

## What Worked Well

Despite several usability issues, testers also highlighted multiple aspects of the system that worked well and validated core design decisions.

### Authentication & Navigation
- Google sign-in, sign-out, and re-login worked reliably.
- Basic navigation outside the chat behaved as expected.
- Profile data persisted correctly after refresh.
- Responsive layout on smaller screens was perceived as clean and visually pleasant.

### Voice & Sound Interaction
- Voice output functioned correctly:
  - Chatbot responses were read aloud when enabled.
  - Audio stopped immediately when sound was disabled.
- This confirmed that the voice interaction feature is technically stable and intuitive to control.

### Chat Content Quality
- Some AI follow-up questions were perceived as relevant and engaging, particularly when:
  - They built naturally on previous answers
  - They focused on future goals, interests, or learning intentions
- These moments demonstrated the potential value of the interview flow when responses remain concise and focused.

### System Robustness
- The system handled edge cases such as:
  - Nonsensical inputs
  - Contradictory answers
  - Prompt injection attempts (chat) without crashing or breaking the application.

### Overall Impression
- Testers implicitly validated the core concept:
  - The voice + chat interaction works
  - The UI foundation is stable
  - The interview model has potential when better constrained and guided

Overall, the feedback suggests that the product does not require fundamental redesign, but rather improvements in clarity, control, and interaction flow.

---

## Issues & Suggestions

### High Priority
- Clear interview state handling (start / in progress / ended)
- Explicit interview termination with chat closure
- Progress indicator (e.g. “Question X of Y”)
- Estimated duration shown before interview starts
- Proper input validation for profile form fields

### Medium Priority
- Shorten AI responses and reduce repetitive praise
- Improve conversational memory consistency
- Prevent auto-advancing when answers are incomplete

### Low Priority / Nice to Have
- FAQ section for practical questions (duration, data usage, purpose)
- Dark mode

---

## Summary

The first peer testing session successfully identified several **core usability and interaction issues**, particularly around interview flow control, system transparency, and form validation. Addressing these findings will significantly improve user experience and clarity in future iterations.

These findings should be used for backlog refinement and upcoming design and technical improvements.

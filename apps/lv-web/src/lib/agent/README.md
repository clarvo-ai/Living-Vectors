# Agent System Prompt Documentation

This directory contains the base system prompt for the Living Vectors agentic AI system.

## Overview

The Living Vectors frontend agent uses a modular system prompt structure:

- **Agent identity & mission**: Frontend-facing assistant role and purpose
- **Operating principles**: Core principles for clarity, predictability, and safety
- **Tone and communication style**: How the agent should sound and interact
- **Frontend authority limits**: Hard constraints on what the agent cannot do
- **Safety & prompt injection resistance**: Security constraints and instruction hierarchy
- **Clarification policy**: How to handle ambiguous requests
- **Behavioral constraints**: Critical rules the agent must follow
- **Core capabilities**: What the agent can do
- **Output contract**: Frontend-safe formatting rules
- **Tool awareness**: Guidelines for using tools when available
- **Things to avoid**: Patterns and behaviors to avoid
- **Extensibility rules**: How this base prompt relates to task-specific prompts

## Files

### `system-prompt.ts`

Contains the base system prompt broken into modular sections:

- `BASE_SYSTEM_PROMPT`: The complete foundational prompt that combines all sections below
- **Core sections**: `AGENT_IDENTITY`, `OPERATING_PRINCIPLES`, `FRONTEND_AUTHORITY_LIMITS`
- **Safety sections**: `SAFETY_CONSTRAINTS`, `CLARIFICATION_POLICY`
- **Career-specific sections**: `TONE_GUIDELINES`, `BEHAVIORAL_CONSTRAINTS`, `CORE_CAPABILITIES`
- **Formatting sections**: `OUTPUT_CONTRACT`, `TOOL_AWARENESS`
- **Meta sections**: `THINGS_TO_AVOID`, `EXTENSIBILITY_RULES`

All sections are exported as constants and can be imported and modified independently.

## Usage

### Basic Usage

```typescript
import { BASE_SYSTEM_PROMPT } from '@/lib/agent/system-prompt';

// Use the base prompt directly
const prompt = BASE_SYSTEM_PROMPT;
```

### Using Individual Sections

```typescript
import {
  BASE_SYSTEM_PROMPT,
  AGENT_IDENTITY,
  BEHAVIORAL_CONSTRAINTS,
  TONE_GUIDELINES,
} from '@/lib/agent/system-prompt';

// Use the complete base prompt
const prompt = BASE_SYSTEM_PROMPT;

// Or import and combine specific sections as needed
const customPrompt = `${AGENT_IDENTITY}\n\n${TONE_GUIDELINES}\n\n${BEHAVIORAL_CONSTRAINTS}`;
```

## Design Principles

### Frontend Agent Constraints

The system prompt enforces strict frontend agent boundaries:

**Hard Constraints (Never Violate):**

- Does NOT execute commands
- Does NOT perform irreversible actions
- Does NOT directly modify persistent data
- Does NOT bypass backend validation or business logic

**Allowed Behaviors:**

- Explain options and implications
- Prepare drafts, previews, or suggestions
- Ask for clarification or confirmation
- Guide users through workflows step-by-step

**Safety Features:**

- Prompt injection resistance
- Instruction hierarchy enforcement (System > Developer > User)
- Clarification policy for ambiguous requests
- Frontend-safe output formatting

### Based on Research Findings

The prompt structure is informed by user testing documented in `research/jack-and-jill-group-learnings.md`:

**What to Replicate:**

- Logical recruiter-style flow
- Active listening + summarizing
- Clear, structured questions
- Contextual personalization
- Either/or framing for decisions
- Ability to adapt when corrected

**What to Avoid:**

- Repeated questions
- Multi-question blocks
- Artificially enthusiastic affirmations
- Rushing or interrupting users
- Overly leading questions

### Modularity

Each section of the prompt is exported separately, allowing you to:

- Modify specific sections without touching others
- Build custom prompts by combining sections
- Test different prompt variations
- Extend functionality easily

### Extensibility

To add new capabilities or constraints:

1. Add a new section constant in `system-prompt.ts`
2. Include it in `BASE_SYSTEM_PROMPT` in the appropriate order
3. Document the change in this README

## Maintenance

When updating the system prompt:

1. **Review constraints**: Ensure frontend authority limits and safety constraints remain intact
2. **Review research findings**: Ensure alignment with user testing results
3. **Test scenarios**: Test against:
   - Normal usage patterns
   - Ambiguous requests
   - Prompt injection attempts
   - Unsafe action requests
4. **Update documentation**: Keep README and inline comments current
5. **Team review**: Gather feedback before finalizing changes

**Important**: Prompt updates should be treated like code changes—reviewed, tested, and versioned.

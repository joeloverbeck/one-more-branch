# Chat Turn Planner Prompt

- Source: `src/llm/prompts/chat/chat-planner-prompt.ts`
- Stage: `chatPlanner`

## Purpose

Plan exactly one hidden in-character reply turn before any visible wording is written. The planner decides intent, pressure response, honesty mode, subtext, block sequence, and expected impact so the writer can execute without improvising strategy.

## Authority Boundary

- The planner is authoritative for the turn's hidden intent and ordered visible `blockPlan`.
- It must react to the latest user turn using the chat bible as the continuity anchor.
- It must not write final dialogue, invent unsupported knowledge, or bypass physical and knowledge constraints.

## System Prompt Requirements

The system prompt must instruct the model to:

- plan exactly one in-character reply turn
- produce a hidden response plan, not visible prose
- treat the chat bible as authoritative for current reality, pressures, and continuity
- treat physical reality, knowledge boundaries, false beliefs, and secrets as hard constraints
- plan from motivation, leverage, and subtext first
- use speech fingerprint to shape delivery second
- avoid inventing knowledge, off-screen events, or unsupported state changes
- keep the plan specific enough for a downstream writer to execute without improvising intent
- include the shared content policy block

## User Message Sections

The user message is organized into these sections, in order:

1. `CHAT BIBLE`
2. `TARGET CHARACTER DECOMPOSITION`
3. `TARGET CHARACTER SPEECH FINGERPRINT`
4. `RECENT CHAT TURNS`
5. `LATEST USER TURN`

## Output Contract

The planner returns a strict `TurnPlannerOutput` object with:

- `internalSelfCheck`
- `responseGoal`
- `speechAct`
- `honestyMode`
- `surfaceEmotion`
- `suppressedEmotion`
- `subtext`
- `mustAddress`
- `mustAvoid`
- `blockPlan`
- `actionPlan`
- `questionBack`
- `targetLength`
- `expectedImpact`

The `internalSelfCheck` object is required and includes:

- `whatDoIWant`
- `whatDoIKnow`
- `whatAmIHiding`
- `howHonestAmI`

## Schema

- `CHAT_PLANNER_SCHEMA` from `src/llm/schemas/chat-planner-schema.ts`
- Parsed by `parseChatPlannerResponse()`
- Returned by `generateChatTurnPlan()` in `src/llm/chat/chat-planner-generation.ts`

## Pipeline Notes

- The planner runs after bible refresh or reuse and before the writer.
- The downstream writer is expected to follow this plan rather than re-plan the turn.

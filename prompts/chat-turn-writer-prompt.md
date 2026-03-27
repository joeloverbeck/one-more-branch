# Chat Turn Writer Prompt

- Source: `src/llm/prompts/chat/chat-writer-prompt.ts`
- Stage: `chatWriter`

## Purpose

Render exactly one visible in-world reply turn for the target character after the planner has already decided intent, honesty mode, subtext, and block structure.

## Authority Boundary

- The planner is authoritative for hidden intent and ordered `blockPlan`.
- The writer is authoritative only for the visible wording and action phrasing of that single turn.
- The writer must not silently re-plan the turn, introduce new hidden goals, or drift away from the planner sequence.

## System Prompt Requirements

The system prompt must instruct the model to:

- write exactly one in-world turn
- stay in chat form, not page prose
- keep `ACTION` concise, visible, and non-omniscient
- make `SPEECH` carry the character voice
- follow planner honesty mode, subtext, and action plan
- respect physical reality, knowledge boundaries, and secrets
- avoid narrating the interlocutor's inner thoughts
- keep the turn bounded and reply-shaped
- stay within 2 `ACTION` blocks and 3 `SPEECH` blocks
- allow controlled imperfections only when they serve characterization
- match the planner's ordered `blockPlan`
- include the shared content policy block

## User Message Sections

The user message is organized into these sections, in order:

1. `TARGET CHARACTER NAME`
2. `FULL SPEECH FINGERPRINT`
3. `CHAT BIBLE`
4. `TURN PLAN`
5. `RECENT CHAT TURNS`
6. `LATEST USER TURN`

## Output Contract

The writer returns a strict JSON object with:

- `blocks: ChatBlock[]`
- `turnMeta: TurnMeta`

`ChatBlock.type` must be `ACTION` or `SPEECH`. `delivery` is only valid on `SPEECH`. The generation layer performs post-parse validation to enforce planner alignment and block-count invariants.

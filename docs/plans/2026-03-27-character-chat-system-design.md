# Character Chat System Design

## Context

Users want to have one-on-one in-character conversations with saved characters outside of story gameplay. The existing branching narrative pipeline (planner -> writer -> analyst) is too heavy for chat, but the character decomposition system provides rich speech fingerprints, knowledge boundaries, false beliefs, and decision patterns that enable high-quality embodied dialogue.

ChatGPT Pro was consulted for pipeline design (see `brainstorming/create-chat-functionality.md`). Its proposal was reassessed against the actual codebase, refined with user input, and validated against research on character consistency and NPC dialogue quality.

## Decisions Made

1. **Standalone only** — No story context. User chats with saved `StandaloneDecomposedCharacter` profiles.
2. **Two-character model** — User selects an avatar character (controls via free text) and a target character (LLM-controlled).
3. **Full 4-stage pipeline** — Chat Bible Curator (conditional) -> Turn Planner -> Turn Writer -> Chat State Updater. Bible runs at session start and on refresh triggers, not every turn.
4. **Setup form** — Physical context (location, time, activity) and lead-in situation provided before chat starts.
5. **Free text input** — User types directly as their character. `*asterisks*` = ACTION, rest = SPEECH.
6. **Dynamic physical context** — State Updater can change location, distance, objects mid-conversation.
7. **LLM-generated rolling summaries** — Every 8 turns, an LLM compresses older turns into a factual summary.
8. **File-based persistence** — `chats/{chatId}/chat.json` + `turns.json`. Resumable across sessions.
9. **Dedicated /chat page** — Linked from Characters dropdown in global header.

## Key Research Findings

- Separation of conversational memory from world knowledge improves consistency (Generative Agents, NPC dialogue research).
- Speech fingerprints with anti-examples and register shifts are critical for voice consistency (already in codebase).
- Chain-of-thought self-check in the planner ("What do I want? What am I hiding?") improves persona maintenance.
- Controlled imperfections (self-corrections, hesitations) improve realism in dialogue-heavy interactions.
- Rolling summary should focus on facts, commitments, and power dynamics — not sentiment.

## Deviations from ChatGPT Proposal

- Removed "sandbox vs canon" distinction (not needed for standalone chat).
- Removed "interlocutor card" as a separate concept — replaced by using a second saved character.
- Removed "salient retrieved memories" via embedding/vector search — file-based rolling summary is sufficient.
- Removed "scene handoff" to page pipeline — out of scope for standalone chat.
- Made bible conditional (not every turn) per ChatGPT's own recommendation.
- Added controlled imperfections directive to Turn Writer prompt.

## Implementation

Full specification in `specs/character-chat-system.md`.

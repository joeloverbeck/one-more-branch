# Chat Character Context Prompt

- Source: `src/llm/prompts/chat/chat-character-context-prompt.ts`
- Stage: `chatCharacterContext`

## Purpose

Synthesize the character-side conversation state for the next 1-3 chat turns. This stage projects the target character's objective, emotional posture, relationship leverage, and knowledge boundaries against an already-established scene context.

## Authority Boundary

- The character context is authoritative for current objective, emotional stance, relationship framing, knowledge boundaries, continuity guardrails, and response constraints.
- It must treat the provided `ChatSceneContext` as ground truth and must not contradict it.
- It must not write dialogue.

## System Prompt Requirements

The system prompt must instruct the model to:

- synthesize the character's psychological and strategic state for an in-world one-on-one conversation
- treat the scene context as established ground truth
- determine the current objective, emotional state, and willingness to engage
- model relationship dynamics, knowledge asymmetries, and protected topics
- derive continuity guardrails and response constraints from the available context
- compress aggressively for the next 1-3 turns only
- not write dialogue
- include the shared content policy block

## User Message Sections

The user message is organized into these sections, in order:

1. `ESTABLISHED SCENE CONTEXT`
2. `TARGET CHARACTER DECOMPOSITION`
3. `INTERLOCUTOR CHARACTER PROFILE`
4. `RELATIONSHIP STATE`
5. `KNOWLEDGE STATE`
6. `RECENT CHAT TURNS`

## Output Contract

The stage returns a strict `ChatCharacterContext` object with:

- `characterNow`
- `relationshipNow`
- `knowledgeNow`
- `continuityGuardrails`
- `responseConstraints`

Notable required nested fields include:

- `characterNow.willingnessToEngage`
- `relationshipNow.whatCharacterBelievesAboutInterlocutor`
- `knowledgeNow.secretsKept`
- `knowledgeNow.knowledgeBoundaries`

## Schema

- `CHAT_CHARACTER_CONTEXT_SCHEMA` from `src/llm/schemas/chat-character-context-schema.ts`
- Parsed by `parseChatCharacterContextResponse()`
- Returned by `generateChatCharacterContext()` in `src/llm/chat/chat-character-context-generation.ts`

## Pipeline Notes

- This is the second half of chat-bible refresh.
- The chat pipeline assembles `ChatSceneContext` and `ChatCharacterContext` into the runtime `ChatBible` consumed by planner, writer, and state-updater stages.

# Chat Bible Curator Prompt

- Source: `src/llm/prompts/chat/chat-bible-prompt.ts`
- Stage: `chatBible`

## Purpose

Curate a short-lived authoritative chat brief for the next 1-3 turns. The bible compresses permanent character profile, mutable chat state, physical reality, and conversation memory into a continuity-safe handoff for downstream planner, writer, and state-updater stages.

## Authority Boundary

- The bible is authoritative for current physical reality, active pressure, knowledge boundaries, false beliefs, and secrets.
- It is a compression stage, not a dialogue stage.
- It must not invent events, dialogue, or off-screen developments not supported by the supplied characters, state, summary, and recent turns.

## System Prompt Requirements

The system prompt must instruct the model to:

- curate an authoritative brief for a one-on-one in-world chat
- treat physical context as mandatory and authoritative
- separate permanent profile, current state, and conversation memory
- preserve knowledge boundaries, false beliefs, and secrets
- explain why the conversation is happening now
- surface what the character wants, fears, protects, and what pressure is active
- compress aggressively for the next 1-3 turns only
- not write dialogue
- include the shared content policy block

## User Message Sections

The user message is organized into these sections, in order:

1. `TARGET CHARACTER DECOMPOSITION`
2. `INTERLOCUTOR CHARACTER PROFILE`
3. `RELATIONSHIP STATE`
4. `KNOWLEDGE STATE`
5. `PHYSICAL CONTEXT`
6. `PRE-CHAT LEAD-IN`
7. `OLDER CHAT SUMMARY`
8. `RECENT CHAT TURNS`

## Output Contract

The curator returns a strict `ChatBible` object with these top-level fields:

- `sessionPremise`
- `physicalReality`
- `preChatMomentum`
- `characterNow`
- `relationshipNow`
- `knowledgeNow`
- `conversationNow`
- `continuityGuardrails`
- `responseConstraints`

Notable required nested fields include:

- `characterNow.willingnessToEngage`
- `relationshipNow.whatCharacterBelievesAboutInterlocutor`
- `knowledgeNow.secretsKept`
- `knowledgeNow.knowledgeBoundaries`
- `conversationNow.lastTurnPressure`

## Schema

- `CHAT_BIBLE_SCHEMA` from `src/llm/schemas/chat-bible-schema.ts`
- Parsed by `parseChatBibleResponse()`
- Returned by `generateChatBible()` in `src/llm/chat/chat-bible-generation.ts`

## Pipeline Notes

- The chat pipeline refreshes the bible on session resume, when no cached bible exists, every 10 turns as a safety cadence, or when the prior character turn requested a refresh.
- Downstream planner, writer, and state-updater stages consume this bible as the continuity anchor.

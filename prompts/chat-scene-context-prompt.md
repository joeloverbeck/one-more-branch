# Chat Scene Context Prompt

- Source: `src/llm/prompts/chat/chat-scene-context-prompt.ts`
- Stage: `chatSceneContext`

## Purpose

Establish the objective scene reality for the next 1-3 chat turns. This stage compresses the physical environment, lead-in pressure, and active conversation state into an authoritative scene brief before any character psychology is synthesized.

## Authority Boundary

- The scene context is authoritative for physical reality, pre-chat momentum, and conversation state.
- It must stay grounded in supplied world, relationship, physical, summary, and recent-turn inputs.
- It must not write dialogue or infer unsupported interior psychology.

## System Prompt Requirements

The system prompt must instruct the model to:

- establish the objective scene reality for a one-on-one in-world conversation
- treat physical context as mandatory and authoritative
- explain why the conversation is happening now and what pressures are active
- focus on environment, narrative momentum, and conversation state
- compress aggressively for the next 1-3 turns only
- not write dialogue
- not analyze character psychology
- include the shared content policy block

## User Message Sections

The user message is organized into these sections, in order:

1. `TARGET CHARACTER DECOMPOSITION`
2. `INTERLOCUTOR CHARACTER PROFILE`
3. `WORLD FACTS`
4. `PHYSICAL CONTEXT`
5. `PRE-CHAT LEAD-IN`
6. `OLDER CHAT SUMMARY`
7. `RECENT CHAT TURNS`

## Output Contract

The stage returns a strict `ChatSceneContext` object with:

- `sessionPremise`
- `physicalReality`
- `preChatMomentum`
- `conversationNow`

Notable required nested fields include:

- `physicalReality.interactableObjects`
- `preChatMomentum.stakesNow`
- `preChatMomentum.unresolvedPressures`
- `conversationNow.activeThreads`
- `conversationNow.lastTurnPressure`

## Schema

- `CHAT_SCENE_CONTEXT_SCHEMA` from `src/llm/schemas/chat-scene-context-schema.ts`
- Parsed by `parseChatSceneContextResponse()`
- Returned by `generateChatSceneContext()` in `src/llm/chat/chat-scene-context-generation.ts`

## Pipeline Notes

- This is the first half of chat-bible refresh.
- The downstream character-context stage receives this output as established scene ground truth.

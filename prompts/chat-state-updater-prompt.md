# Chat State Updater Prompt

- Source: `src/llm/prompts/chat/chat-state-updater-prompt.ts`
- Stage: `chatStateUpdater`

## Purpose

Extract the factual post-turn state caused by the completed character turn. This stage converts the hidden plan plus final written turn into:

- delta-oriented session updates (`stateUpdate`)
- one canonical absolute post-turn relationship snapshot (`relationshipSnapshot`)

## Authority Boundary

- The updater is authoritative only for state extraction from what actually happened on the page.
- It uses the planner to distinguish intent from what was actually revealed, but it must not treat planned intent as realized state unless the final written turn supports it.
- It must not invent state changes unsupported by the latest user turn and final written character turn.

## System Prompt Requirements

The system prompt must instruct the model to:

- extract only state changes that actually occurred
- track relationship shifts only when meaningful
- return the canonical post-turn relationship snapshot
- track knowledge asymmetry, false beliefs, and secret movement
- track commitments, threats, opened questions, and resolved questions
- track physical changes only if they are visible in the written turn
- use the planner to distinguish intent from what was actually revealed on the page
- signal when the chat bible should be refreshed
- signal when a rolling summary should be generated
- avoid inventing unsupported state changes
- include the shared content policy block

## User Message Sections

The user message is organized into these sections, in order:

1. `PRE-TURN CHAT BIBLE`
2. `LATEST USER TURN`
3. `TURN PLAN`
4. `FINAL WRITTEN TURN`

## Output Contract

The updater returns a strict object with:

- `stateUpdate`
- `relationshipSnapshot`

`stateUpdate` still contains:

- `summaryDelta`
- `relationshipShifts`
- `knowledgeChanges`
- `conversationUpdate`
- `physicalStateUpdate`
- `shouldRefreshChatBible`
- `shouldTriggerSummary`

`relationshipSnapshot` contains:

- `dynamic`
- `valence`
- `tension`
- `leverage`
- `whatCharacterBelievesAboutInterlocutor`

Notable required nested fields include:

- `knowledgeChanges.falseBeliefsCorrected`
- `conversationUpdate.questionsOpened`
- `conversationUpdate.questionsResolved`
- `physicalStateUpdate.locationChanged`
- `physicalStateUpdate.newDistanceBand`
- `physicalStateUpdate.objectStateChanges`

## Schema

- `CHAT_STATE_UPDATER_SCHEMA` from `src/llm/schemas/chat-state-updater-schema.ts`
- Parsed by `parseChatStateUpdaterResponse()`
- Returned by `generateChatStateUpdate()` in `src/llm/chat/chat-state-updater-generation.ts`

## Pipeline Notes

- The updater runs after the writer and before session state is applied by `applyChatStateUpdate()`.
- Its refresh and summarize booleans feed directly into pipeline orchestration.
- The pipeline persists `relationshipSnapshot` on the committed character turn as the canonical relationship-display timeline source.

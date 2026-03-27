# CHACHASYS-011: Chat Service

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001, CHACHASYS-002, CHACHASYS-003, CHACHASYS-010, CHACHASYS-016 (if delivered first)

## Problem

The chat service is the business logic layer between routes and the pipeline/persistence. It handles chat creation (validating characters, initializing session state), sending turns (parsing input, persisting user turn, running pipeline, persisting results), resuming sessions, listing, and deleting.

## Assumption Reassessment (2026-03-27)

1. `character-repository.ts` provides `loadCharacter(id)` → `StandaloneDecomposedCharacter | null`.
2. Chat repository from CHACHASYS-002 provides all CRUD operations.
3. Chat pipeline from CHACHASYS-010 provides `runChatPipeline`.
4. Input parser from CHACHASYS-003 provides `parseChatInput`.
5. If CHACHASYS-016 lands first, the service must treat `ChatSession.rollingSummary` as an opaque canonical domain field and must not collapse it back to a string.

## Architecture Check

1. Service is stateless — all state is in the repository and pipeline.
2. User turn is persisted BEFORE pipeline runs (spec invariant: no turn lost on failure).
3. Service delegates to pipeline for LLM work, repository for persistence.
4. This ticket should not re-own rolling-summary shape decisions. It should consume whatever canonical `ChatSession` contract exists when implemented.

## What to Change

### 1. Create `src/server/services/chat-service.ts`

Implement:

**`createChat(params: CreateChatParams): Promise<ChatSession>`**
- Validate target and interlocutor are different character IDs
- Load both characters from character repository (throw if not found)
- Build initial `ChatSession` with UUID, timestamps, denormalized names, physical context, lead-in context
- Initialize empty relationship state (default valence 0, tension 0)
- Initialize empty knowledge state (empty arrays)
- Save session via repository
- Return session

**`sendTurn(chatId: string, userMessage: string, apiKey: string): Promise<ChatPipelineResult>`**
- Load session (throw if not found)
- Parse user message into ChatBlock[]
- Build user ChatTurn (turnNumber = session.turnCount + 1, speaker = 'USER')
- Save user turn via repository (BEFORE pipeline runs)
- Load both characters
- Load recent turns (last 12)
- Load all turns (for summary if needed)
- Determine isSessionResume (check if last turn was from a previous browser session — heuristic: >5 min gap or first turn after page load)
- Run pipeline
- Save character turn via repository
- Update session via repository (from pipeline result's updatedSession)
- Return pipeline result

**`resumeChat(chatId: string): Promise<{ session: ChatSession; turns: ChatTurn[] }>`**
- Load session and all turns
- Return both

**`deleteChat(chatId: string): Promise<void>`**
- Delete via repository

**`listChats(): Promise<ChatSessionSummary[]>`**
- List via repository

Define `CreateChatParams`:
```typescript
interface CreateChatParams {
  readonly targetCharacterId: string;
  readonly interlocutorCharacterId: string;
  readonly physicalContext: ChatPhysicalContext;
  readonly leadInContext: ChatLeadInContext;
}
```

## Files to Touch

- `src/server/services/chat-service.ts` (new)

## Out of Scope

- Routes / HTTP handling (CHACHASYS-012)
- Views / EJS templates (CHACHASYS-013)
- Client-side JS (CHACHASYS-014)
- Progress tracking (CHACHASYS-012)
- LLM stage implementation (CHACHASYS-005-009)
- Pipeline implementation (CHACHASYS-010)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `createChat` rejects when target === interlocutor character ID
2. Unit test: `createChat` rejects when target character not found
3. Unit test: `createChat` saves session with correct initial state (valence 0, tension 0, empty knowledge)
4. Unit test: `sendTurn` saves user turn BEFORE calling pipeline
5. Unit test: `sendTurn` saves character turn AFTER pipeline completes
6. Unit test: `sendTurn` updates session with pipeline result
7. Unit test: `sendTurn` rejects when session not found
8. Unit test: `sendTurn` rejects when user message is empty
9. Unit test: `resumeChat` returns session + all turns
10. Unit test: `deleteChat` calls repository delete
11. Unit test: `listChats` delegates to repository
12. Existing suite: `npm test` passes

### Invariants

1. User turn is persisted before pipeline runs (crash safety)
2. Character turn is persisted after pipeline succeeds
3. Target and interlocutor must be different characters
4. API key is never persisted — only passed through to pipeline
5. Service never modifies StandaloneDecomposedCharacter profiles

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/chat-service.test.ts` — full service test suite with mocked repository, pipeline, and character repository

### Commands

1. `npm run test:unit -- --testPathPattern='chat-service'`
2. `npm run typecheck`
3. `npm test`

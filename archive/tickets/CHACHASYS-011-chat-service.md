# CHACHASYS-011: Chat Service

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001, CHACHASYS-002, CHACHASYS-003, CHACHASYS-010

## Problem

The chat service is the business-logic layer between routes and the existing chat domain/persistence/pipeline. It should orchestrate chat creation, turn submission, session resume loading, listing, and deletion without re-owning parsing, persistence, or pipeline decisions that already exist elsewhere.

## Assumption Reassessment (2026-03-27)

1. `src/persistence/character-repository.ts` already provides `loadCharacter(id)` returning `StandaloneDecomposedCharacter | null`.
2. `src/persistence/chat-repository.ts` already provides chat CRUD plus turn persistence: `saveChat`, `loadChat`, `listChats`, `updateChat`, `deleteChat`, `saveTurn`, `loadTurns`, and `getRecentTurns`.
3. `src/llm/chat/chat-pipeline.ts` is already implemented and exported from `src/llm/index.ts` as `runChatPipeline(context, apiKey)`.
4. `src/models/chat/chat-input-parser.ts` is already implemented and exported as `parseChatInput(rawText)`.
5. `ChatSession.rollingSummary` is already canonicalized as `RollingSummaryOutput | null`; the service must treat it as opaque structured state and never collapse it to a string.
6. The current pipeline contract already accepts `isSessionResume` explicitly. Inferring "resume" from timestamps or browser behavior inside the service would be brittle and is not aligned with the current architecture.

## Architecture Check

1. Service remains stateless. Durable state lives in repositories and the pipeline result.
2. User turn must be persisted before the pipeline runs so a failed generation never loses the user's input.
3. Service delegates parsing to `parseChatInput`, LLM work to `runChatPipeline`, and storage to repositories.
4. Resume intent belongs to the caller boundary. The service should accept explicit `isSessionResume?: boolean` and forward it to the pipeline, defaulting to `false`.
5. The cleanest implementation is a small factory with injected dependencies plus a default singleton export. That keeps route wiring simple while preserving unit-test isolation.

## What to Change

### 1. Create `src/server/services/chat-service.ts`

Implement a service factory plus default instance:

```typescript
interface ChatService {
  createChat(params: CreateChatParams): Promise<ChatSession>;
  sendTurn(params: SendTurnParams): Promise<ChatPipelineResult>;
  resumeChat(chatId: string): Promise<{ session: ChatSession; turns: ChatTurn[] }>;
  deleteChat(chatId: string): Promise<void>;
  listChats(): Promise<ChatSessionSummary[]>;
}
```

Inject dependencies for:
- `loadCharacter`
- `saveChat`, `loadChat`, `listChats`, `deleteChat`, `saveTurn`, `loadTurns`, `getRecentTurns`
- `parseChatInput`
- `runChatPipeline`
- `randomUUID`
- timestamp creation helper

Required behavior:

**`createChat(params: CreateChatParams): Promise<ChatSession>`**
- Validate target and interlocutor are different character IDs
- Load both characters and reject missing IDs
- Build initial `ChatSession` with UUID, timestamps, denormalized names, physical context, and lead-in context
- Initialize `chatBible: null`, `turnCount: 0`, `rollingSummary: null`
- Initialize relationship state as:
  - `dynamic: ''`
  - `valence: 0`
  - `tension: 0`
  - `leverage: ''`
- Initialize empty knowledge arrays
- Save session via repository
- Return session

**`sendTurn(params: SendTurnParams): Promise<ChatPipelineResult>`**
- Trim and validate `userMessage`; reject empty input before parsing or persistence
- Load session and reject missing chat IDs
- Parse message into `ChatBlock[]`
- Reject parsed-empty input
- Build user `ChatTurn` with `turnNumber = session.turnCount + 1`, `speaker = 'USER'`, `rawText` equal to the trimmed input, and current timestamp
- Persist the user turn BEFORE calling the pipeline
- Load target and interlocutor characters from the character repository
- Load recent turns (`getRecentTurns(chatId, 12)`)
- Load all turns (`loadTurns(chatId)`)
- Call `runChatPipeline` with `isSessionResume: params.isSessionResume ?? false`
- Persist the returned character turn
- Persist `pipelineResult.updatedSession` via `saveChat`
- Return the pipeline result

**`resumeChat(chatId: string): Promise<{ session: ChatSession; turns: ChatTurn[] }>`**
- Load session and all turns
- Reject missing chat IDs
- Return both

**`deleteChat(chatId: string): Promise<void>`**
- Delegate to repository

**`listChats(): Promise<ChatSessionSummary[]>`**
- Delegate to repository

Define params:

```typescript
interface CreateChatParams {
  readonly targetCharacterId: string;
  readonly interlocutorCharacterId: string;
  readonly physicalContext: ChatPhysicalContext;
  readonly leadInContext: ChatLeadInContext;
}

interface SendTurnParams {
  readonly chatId: string;
  readonly userMessage: string;
  readonly apiKey: string;
  readonly isSessionResume?: boolean;
}
```

## Files to Touch

- `src/server/services/chat-service.ts` (new)
- `src/server/services/index.ts` (export service)
- `test/unit/server/services/chat-service.test.ts` (new)

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
2. Unit test: `createChat` rejects when a requested character is missing
3. Unit test: `createChat` saves a session with the correct initial state (`chatBible: null`, `turnCount: 0`, neutral relationship fields, empty knowledge arrays)
4. Unit test: `sendTurn` saves the user turn before calling the pipeline
5. Unit test: `sendTurn` saves the character turn after the pipeline completes
6. Unit test: `sendTurn` persists `updatedSession` returned by the pipeline
7. Unit test: `sendTurn` rejects when the chat session is missing
8. Unit test: `sendTurn` rejects empty or parsed-empty user input
9. Unit test: `sendTurn` forwards explicit `isSessionResume` and defaults it to `false`
10. Unit test: `resumeChat` returns the session and all turns
11. Unit test: `resumeChat` rejects when the chat session is missing
12. Unit test: `deleteChat` delegates to repository delete
13. Unit test: `listChats` delegates to repository list
14. Relevant unit/typecheck/lint suites pass

### Invariants

1. User turn is persisted before pipeline runs
2. Character turn is persisted after pipeline succeeds
3. Target and interlocutor must be different characters
4. API key is never persisted
5. Service never mutates loaded character profiles
6. Service does not infer resume state from timestamps or browser heuristics

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/chat-service.test.ts` — full service orchestration suite with mocked repositories, parser, and pipeline

### Commands

1. `npm run test:unit -- --testPathPatterns='chat-service'`
2. `npm run test:unit`
3. `npm run typecheck`
4. `npm run lint`

## Outcome

- Completed: 2026-03-27
- Actually changed:
  - Added `src/server/services/chat-service.ts` as a small injected orchestration layer with `createChat`, `sendTurn`, `resumeChat`, `deleteChat`, and `listChats`
  - Exported the service through `src/server/services/index.ts`
  - Added `test/unit/server/services/chat-service.test.ts` covering creation validation, persistence ordering, explicit resume propagation, resume loading, and repository delegation
- Deviations from original plan:
  - Reassessed the ticket first because the chat parser, models, repository, structured rolling summary contract, and pipeline already existed
  - Replaced the proposed timestamp/browser heuristic for session resume with explicit `isSessionResume` input, matching the existing pipeline contract and keeping transport concerns out of the service layer
  - Persisted the pipeline's returned `updatedSession` directly through `saveChat` rather than re-deriving session mutations in the service
  - Corrected the stale Jest CLI flag in the ticket command list from `--testPathPattern` to `--testPathPatterns`
- Verification:
  - `npm run test:unit -- --testPathPatterns='chat-service'`
  - `npm run test:unit`
  - `npm run typecheck`
  - `npm run lint`

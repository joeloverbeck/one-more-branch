# CHACHASYS-002: Chat Persistence Layer

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models)

## Problem

Chat sessions and turns need file-based persistence following existing project patterns. The chat repository provides CRUD for sessions and turns, with atomic writes and proper serialization. Storage lives in `chats/` at the project root.

## Assumption Reassessment (2026-03-27)

1. `src/persistence/storage.ts` provides `writeJsonAtomic`, `readJson`, `listDirectories`, `deleteDirectory` — these are the low-level primitives to build on.
2. Existing `page-serializer.ts` demonstrates the serialization pattern with converters.
3. `chats/` directory does not exist yet and is not in `.gitignore`.

## Architecture Check

1. Follow `page-serializer.ts` + `storage.ts` patterns for consistency with existing persistence layer.
2. Two files per chat directory: `chat.json` (session metadata) and `turns.json` (all turns). This avoids per-turn files which would be excessive for chat.
3. `updateChat` uses read-modify-write with the existing file lock pattern.

## What to Change

### 1. Create `src/persistence/chat-serializer.ts`

- `serializeChatSession(session: ChatSession): string` — JSON.stringify with formatting
- `deserializeChatSession(json: string): ChatSession` — parse with validation
- `serializeTurns(turns: readonly ChatTurn[]): string` — JSON.stringify array
- `deserializeTurns(json: string): ChatTurn[]` — parse with validation

### 2. Create `src/persistence/chat-repository.ts`

Implement the repository API:
- `saveChat(session: ChatSession): Promise<void>` — creates `chats/{id}/chat.json`
- `loadChat(chatId: string): Promise<ChatSession | null>` — reads chat.json or returns null
- `listChats(): Promise<ChatSessionSummary[]>` — scans `chats/` directories, loads each chat.json, returns summaries sorted by updatedAt desc
- `updateChat(chatId: string, updater: (s: ChatSession) => ChatSession): Promise<ChatSession>` — read-modify-write with lock
- `deleteChat(chatId: string): Promise<void>` — deletes `chats/{chatId}/` directory
- `saveTurn(chatId: string, turn: ChatTurn): Promise<void>` — appends turn to turns.json (read all, append, write)
- `loadTurns(chatId: string): Promise<ChatTurn[]>` — reads all turns
- `getRecentTurns(chatId: string, count: number): Promise<ChatTurn[]>` — loads all, returns last N

### 3. Add `chats/` to `.gitignore`

Add `chats/` entry under the "Runtime data" section, next to `stories/`.

## Files to Touch

- `src/persistence/chat-serializer.ts` (new)
- `src/persistence/chat-repository.ts` (new)
- `.gitignore` (modify — add `chats/`)

## Out of Scope

- LLM pipeline or generation code
- Server routes or services
- UI/views
- Modifying existing persistence files (`storage.ts`, `page-serializer.ts`)
- Chat creation business logic (CHACHASYS-011)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `saveChat` + `loadChat` round-trips a ChatSession correctly
2. Unit test: `loadChat` returns null for non-existent chat
3. Unit test: `saveTurn` + `loadTurns` round-trips turns correctly
4. Unit test: `saveTurn` appends to existing turns without losing previous turns
5. Unit test: `getRecentTurns` returns only the last N turns
6. Unit test: `listChats` returns summaries sorted by updatedAt descending
7. Unit test: `deleteChat` removes the directory
8. Unit test: `updateChat` applies the updater function and persists the result
9. Existing suite: `npm test` passes

### Invariants

1. All writes are atomic (use existing `writeJsonAtomic` or equivalent pattern)
2. `loadChat` never throws on missing directory — returns null
3. `saveTurn` never overwrites existing turns — always appends
4. Chat data lives exclusively under `chats/{chatId}/`
5. No turn data is lost on concurrent read-modify-write (file lock)

## Test Plan

### New/Modified Tests

1. `test/unit/persistence/chat-repository.test.ts` — full CRUD test suite using tmp directories
2. `test/unit/persistence/chat-serializer.test.ts` — round-trip serialization tests

### Commands

1. `npm run test:unit -- --testPathPattern='chat-repository|chat-serializer'`
2. `npm run typecheck`
3. `npm test`

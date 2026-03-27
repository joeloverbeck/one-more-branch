# CHACHASYS-002: Chat Persistence Layer

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models)

## Problem

Chat sessions and turns need file-based persistence that matches the repository's actual persistence architecture: configured storage roots, atomic JSON writes, lock-scoped read-modify-write, and runtime validation of persisted payloads. Storage should live under a configured chat root, defaulting to `chats/` at the project root.

## Assumption Reassessment (2026-03-27)

1. `src/persistence/storage.ts` is only the story/page facade. It is not the low-level persistence layer for new entity types.
2. The real persistence primitives already exist in `src/persistence/file-utils.ts` (`writeJsonFile`, `readJsonFile`, `ensureDirectory`, `listDirectories`, `deleteDirectory`, atomic writes) plus `src/persistence/lock-manager.ts`.
3. The repo already has reusable persistence abstractions, but they fit different storage shapes:
   - `createJsonFileStore()` fits lock-scoped file reads/writes
   - `createJsonEntityRepository()` assumes a flat directory of `*.json` entity files and therefore does not fit `chats/{chatId}/chat.json`
4. Chat models already exist under `src/models/chat/`, but they currently provide TypeScript contracts only. There is no runtime validation/parsing for persisted `ChatSession` or `ChatTurn[]` payloads yet.
5. Storage config does not yet expose `storage.chatsDir`, `file-utils.ts` does not yet expose chat path helpers, and Jest fixture cleanup currently resets only `stories/`, `concepts/`, and `kernels/`.
6. `.gitignore` does not yet ignore the default `chats/` runtime directory.

## Architecture Check

1. Use `storage.chatsDir` with a default of `chats`, not a hardcoded root path. This keeps chat persistence aligned with every other persisted artifact in the repo.
2. Keep the two-file layout from the spec because it is still the cleanest tradeoff here:
   - `chat.json` for session state
   - `turns.json` for the full ordered turn log
3. Follow the `story-repository.ts` pattern for nested per-entity directories: use `createJsonFileStore()` for `chat.json` and `turns.json`, plus explicit `listDirectories()` / `deleteDirectory()` operations at the chat-root level.
4. Session and turn persistence must use the same per-chat lock key strategy. This preserves append semantics and avoids split-brain locking between session and turns updates.
5. Do not add a standalone serializer whose only job is `JSON.stringify`/`JSON.parse`. That would duplicate existing patterns without improving safety. The persistence boundary should instead enforce runtime validation/parsing of `ChatSession` and `ChatTurn[]`.
6. `listChats()` should derive `ChatSessionSummary` from persisted sessions and sort by `updatedAt` descending. No alias summary file or compatibility layer is justified.

## What to Change

### 1. Extend storage configuration and file helpers

- Add `chatsDir` to `src/config/schemas.ts` with default `chats`
- Add the default `storage.chatsDir` entry to `configs/default.json`
- Add chat path helpers to `src/persistence/file-utils.ts`:
  - `getChatsDir()`
  - `ensureChatsDir()`
  - `getChatDir(chatId: string)`
  - `getChatSessionFilePath(chatId: string)`
  - `getChatTurnsFilePath(chatId: string)`
- Add `chats/` to `.gitignore` under the runtime data section
- Update shared Jest fixture setup so chat storage is created and cleared alongside other storage roots

### 2. Add runtime validation/parsing for persisted chat payloads

- Add runtime guards/parsers for persisted chat data rather than string serializers
- Required validation scope:
  - `ChatSession`
  - `ChatTurn`
  - persisted `ChatTurn[]` payloads from `turns.json`
- The validation must reject malformed on-disk payloads with a useful error instead of silently accepting corrupted data
- Keep the validation code close to chat contracts/persistence, but avoid introducing a parallel alias model layer

### 3. Create `src/persistence/chat-repository.ts`

Implement the repository API using the nested-directory pattern already present in story persistence:

- `saveChat(session: ChatSession): Promise<void>` — persists `chat.json`
- `loadChat(chatId: string): Promise<ChatSession | null>` — reads `chat.json` or returns null
- `listChats(): Promise<ChatSessionSummary[]>` — scans chat directories, loads valid sessions, returns summaries sorted by `updatedAt` desc
- `updateChat(chatId: string, updater: (s: ChatSession) => ChatSession): Promise<ChatSession>` — lock-scoped read-modify-write
- `deleteChat(chatId: string): Promise<void>` — deletes `chats/{chatId}/`
- `saveTurn(chatId: string, turn: ChatTurn): Promise<void>` — lock-scoped append to `turns.json`
- `loadTurns(chatId: string): Promise<ChatTurn[]>` — returns all turns, or `[]` when `turns.json` is absent
- `getRecentTurns(chatId: string, count: number): Promise<ChatTurn[]>` — returns the last `count` turns

Implementation requirements:

- Session and turn persistence must share a consistent lock-key strategy per chat
- `saveTurn` must preserve existing turns exactly and append in-order
- `loadChat` should return `null` for a missing chat; malformed persisted payloads should still throw
- `deleteChat` should remain idempotent

## Files to Touch

- `tickets/CHACHASYS-002-persistence-layer.md` (this ticket)
- `src/config/schemas.ts`
- `configs/default.json`
- `src/persistence/file-utils.ts`
- `src/persistence/chat-repository.ts` (new)
- `src/models/chat/*.ts` or a narrow chat persistence parser module as needed for runtime validation
- `test/fixtures/setup.ts`
- `.gitignore`

## Out of Scope

- LLM pipeline or generation code
- Server routes or services
- UI/views
- Storage aliases, backward-compat shims, or duplicate repository abstractions
- Rewriting generic persistence helpers for a storage shape they are not meant to support
- Chat creation business logic (CHACHASYS-011)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `saveChat` + `loadChat` round-trips a `ChatSession`
2. Unit test: `loadChat` returns `null` for a non-existent chat
3. Unit test: `saveTurn` + `loadTurns` round-trips turns
4. Unit test: `saveTurn` appends without losing prior turns
5. Unit test: `getRecentTurns` returns only the last `N` turns
6. Unit test: `listChats` returns summaries sorted by `updatedAt` descending
7. Unit test: `deleteChat` removes the chat directory and remains safe on repeated calls
8. Unit test: `updateChat` applies the updater under the chat lock and persists the result
9. Unit test: malformed persisted `chat.json` throws a validation error
10. Unit test: malformed persisted `turns.json` throws a validation error
11. Existing relevant suites, lint, and typecheck pass

### Invariants

1. All persisted writes remain atomic through existing file utility behavior
2. Chat data lives exclusively under `storage.chatsDir/{chatId}/`
3. Session updates and turn appends are serialized per chat via lock keys
4. Missing chat/session files are treated as absent data, not fatal corruption
5. Malformed persisted payloads are surfaced as errors, not silently ignored

## Test Plan

### New/Modified Tests

1. `test/unit/persistence/chat-repository.test.ts` — repository CRUD, append semantics, ordering, invalid persisted payload handling
2. `test/unit/models/chat/chat-models.test.ts` or a focused chat persistence validation test — runtime guard/parser coverage
3. `test/unit/persistence/file-utils.test.ts` — chat path helper coverage if added there
4. `test/unit/config/schemas.test.ts` and `test/unit/config/loader.test.ts` — `chatsDir` default/override coverage
5. `test/fixtures/setup.ts` behavior implicitly exercised by repository tests

### Commands

1. `npm run test:unit -- --runInBand --testPathPatterns='chat-repository|chat-models|file-utils|config'`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

## Outcome

- Completion date: 2026-03-27
- What actually changed:
  - Added `storage.chatsDir` config support and defaulted it to `chats`
  - Added chat path helpers to `file-utils.ts` and ignored `chats/` in `.gitignore`
  - Added runtime chat payload validators/parsers instead of a string-based serializer layer
  - Implemented `src/persistence/chat-repository.ts` with nested chat directories, atomic writes, and per-chat locking
  - Extended Jest fixture storage cleanup for chats and added focused repository/config/file-utils/model tests
- Deviations from the original plan:
  - Did not create `src/persistence/chat-serializer.ts`
  - Used the `json-file-store` + nested-directory story-repository pattern instead of `createJsonEntityRepository()`, because chat persistence stores `chat.json` under `chats/{chatId}/` rather than in a flat entity directory
- Verification results:
  - `npx jest test/unit/persistence/chat-repository.test.ts test/unit/models/chat/chat-models.test.ts test/unit/persistence/file-utils.test.ts test/unit/config/schemas.test.ts test/unit/config/loader.test.ts --runInBand`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

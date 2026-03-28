# CHATCOMMIT-001: Atomically persist chat turn results

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: `archive/tickets/CHATTURNSAV-001-defer-user-turn-save-until-pipeline-success.md`

## Problem

`chat-service.sendTurn()` still persists a successful turn through three separate writes: user turn, character turn, then session. The recent fix for orphaned user turns removed the main failure mode, but the architecture still allows narrower partial-write states if one of the later writes fails after an earlier one succeeds.

That means chat persistence still does not guarantee that transcript state and session state advance as one atomic unit. For a system that treats a generated chat exchange as one logical commit, that is the wrong boundary.

## Assumption Reassessment (2026-03-28)

1. `src/server/services/chat-service.ts` currently performs three sequential writes after pipeline success: `saveTurn(userTurn)`, `saveTurn(characterTurn)`, then `saveChat(updatedSession)` — CONFIRMED.
2. `src/persistence/chat-repository.ts` already has a shared chat-level lock key via `getChatLockKey(chatId)`, and both the session store and turn store use that same lock namespace — CONFIRMED.
3. However, those stores still write to two different files: `chat.json` and `turns.json`. A single repository method wrapped around those two writes would improve coordination, but it would still not provide true atomic persistence across write failure or process crash — CORRECTED.
4. The deferred-save fix in `archive/tickets/CHATTURNSAV-001-defer-user-turn-save-until-pipeline-success.md` solved the duplicate-orphan bug, but it intentionally left the split-write architecture in place — CONFIRMED.
5. There is no current repository API or file format that makes a successful chat exchange a single persisted aggregate commit — CONFIRMED.
6. The right scope for this ticket is not just repository/API cleanup. To actually satisfy the atomicity goal, the persistence model itself must change so the chat aggregate is stored as one file and committed with one atomic rename — CORRECTED SCOPE.

## Architecture Check

1. A single repository operation such as `commitChatTurn(chatId, { userTurn, characterTurn, updatedSession })` is still the right API shape, but API shape alone is not enough. The persistence unit must also become a single aggregate file.
2. The cleaner architecture is a canonical persisted chat aggregate, for example `{ session, turns }`, stored in one file under the chat directory. Then one successful exchange maps to one locked read-modify-write cycle and one atomic file replacement.
3. This is more robust than simply adding more guards around `saveTurn()` or `saveChat()` because it removes the split-brain state entirely instead of trying to detect it later.
4. The change should replace the split `chat.json` / `turns.json` write path, not coexist with compatibility aliases, fallback branches, or legacy dual-write behavior.
5. This also improves extensibility: future chat-commit concerns such as audit metadata, transcript validation, summaries, checkpoints, or versioning have one canonical repository entry point and one persisted source of truth.

## What to Change

### 1. Replace split chat persistence with a single aggregate file

Change `src/persistence/chat-repository.ts` and supporting file-path helpers so one chat is persisted as one aggregate payload in one file instead of two sibling files.

Preferred shape:

`{ session: ChatSession, turns: ChatTurn[] }`

Requirements:
- one canonical file path per chat
- one chat-level lock acquisition per commit/update
- one atomic file replacement per successful aggregate write
- no compatibility aliases that continue treating `chat.json` and `turns.json` as first-class sources

### 2. Add a canonical atomic chat commit repository API

Add a new repository operation in `src/persistence/chat-repository.ts` that:
- acquires the existing chat lock once
- validates `userTurn`, `characterTurn`, and `updatedSession`
- loads the existing persisted chat aggregate
- appends the two new turns in order
- persists the updated aggregate within the same locked operation

Prefer a single canonical API for this path, for example:

`commitChatTurn(chatId, { userTurn, characterTurn, updatedSession })`

The API should enforce that:
- `updatedSession.id === chatId`
- `userTurn.speaker === 'USER'`
- `characterTurn.speaker === 'CHARACTER'`
- `characterTurn.turnNumber === userTurn.turnNumber + 1`
- existing persisted aggregate, if present, already belongs to `chatId`

It should also reject impossible aggregate states rather than silently normalizing them.

### 3. Keep repository read APIs, but make them projections of the aggregate

`loadChat()`, `loadTurns()`, `getRecentTurns()`, `saveChat()`, and `updateChat()` may remain if that keeps the public repository surface clean, but they must all read/write through the single aggregate file rather than maintaining independent stores.

In other words:
- `loadChat()` projects `aggregate.session`
- `loadTurns()` projects `aggregate.turns`
- `saveChat()` writes or updates the aggregate session in the same canonical file
- `saveTurn()` should not remain the service-layer success path for `sendTurn()`

### 4. Move `chat-service` to the repository commit boundary

Update `src/server/services/chat-service.ts` so that successful pipeline completion calls the new atomic repository API instead of issuing separate `saveTurn()` and `saveChat()` calls.

The service should remain responsible for:
- building the in-memory user turn
- reconstructing `recentTurns` and `allTurns` for the pipeline
- invoking the pipeline

The repository should become responsible for persisting the successful result as one operation.

### 5. Preserve transcript and session semantics

Do not change:
- how `recentTurns`, `allTurns`, or `latestUserTurn` are constructed for the pipeline
- session `turnCount` semantics
- prompt contracts
- transcript ordering

This ticket is about commit atomicity, not behavior changes in generation or prompt formatting.

### 6. Tighten repository and service tests around atomicity

Add or update tests to verify:
- a successful commit persists both turns and the updated session together
- invalid commit payloads are rejected before partial persistence
- `chat-service` delegates successful persistence through the new canonical repository API
- failures inside the atomic commit do not leave partial transcript/session state behind
- repository reads and updates now operate against the aggregate file, not split session/turn files

## Files to Touch

- `src/persistence/chat-repository.ts` (modify)
- `src/persistence/file-utils.ts` (modify)
- `src/persistence/index.ts` (modify, if export surface changes)
- `src/server/services/chat-service.ts` (modify)
- `test/unit/persistence/chat-repository.test.ts` (modify)
- `test/unit/persistence/file-utils.test.ts` (modify)
- `test/unit/server/services/chat-service.test.ts` (modify)

## Out of Scope

- Reworking `runChatPipeline()` or prompt contracts
- Cleaning up historical duplicate transcript data
- Cross-process transactional guarantees beyond the existing in-process lock model
- Building a legacy compatibility reader for old `chat.json` / `turns.json` chat directories

## Acceptance Criteria

### Tests That Must Pass

1. A successful chat-turn commit persists the user turn, character turn, and updated session through one aggregate-file write path
2. If commit validation or write fails, no partial transcript/session state is left behind
3. `chat-service.sendTurn()` no longer coordinates persistence through separate `saveTurn()`/`saveChat()` success writes
4. Existing suite: `npm test`

### Invariants

1. A successful chat exchange is persisted through exactly one canonical repository commit path
2. Persisted chat transcript state and persisted chat session state must never represent different logical turns after a successful commit attempt returns
3. The repository has exactly one persisted source of truth for chat state

## Test Plan

### New/Modified Tests

1. `test/unit/persistence/chat-repository.test.ts` — verify the new atomic commit API persists transcript and session together through the aggregate file, and rejects invalid commit payloads without partial writes
2. `test/unit/persistence/file-utils.test.ts` — verify the canonical chat aggregate file path helper replaces the old split session/turn path assumption
3. `test/unit/server/services/chat-service.test.ts` — verify `sendTurn()` delegates persistence through the atomic commit path and no longer performs split success writes

### Commands

1. `npm run test:unit -- --testPathPatterns=chat-repository|chat-service`
2. `npm run lint && npm run typecheck && npm test`

## Outcome

- Completed: 2026-03-28
- Actual changes:
  - Replaced split chat persistence (`chat.json` plus `turns.json`) with a single aggregate `state.json` file per chat directory.
  - Added a canonical `commitChatTurn()` repository API and moved `chat-service.sendTurn()` onto that single commit boundary.
  - Kept chat read/update APIs available, but made them projections over the aggregate file instead of separate stores.
  - Strengthened repository tests to cover aggregate validation, rejected commit payloads, and write-failure rollback behavior.
- Deviations from original plan:
  - The original ticket proposed an “atomic” repository method over the existing two-file layout. Reassessment showed that would still permit partial persistence on write failure or crash, so the implementation changed the file format itself to make the persistence boundary truly single-file.
  - `saveTurn()` no longer behaves like a standalone transcript bootstrap primitive; it now requires an existing chat aggregate, which is the cleaner invariant for this repository.
- Verification:
  - `npm run test:unit -- --testPathPatterns='chat-repository|chat-service|file-utils'`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`

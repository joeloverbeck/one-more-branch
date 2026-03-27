# CHACHASYS-016: Structured Rolling Summary Persistence

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: [specs/character-chat-system.md](/home/joeloverbeck/projects/one-more-branch/specs/character-chat-system.md), [archive/tickets/CHACHASYS-001-data-models.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-001-data-models.md), [archive/tickets/CHACHASYS-002-persistence-layer.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-002-persistence-layer.completed.md), [archive/tickets/CHACHASYS-009-rolling-summary-stage.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-009-rolling-summary-stage.md), [archive/tickets/CHACHASYS-010-chat-pipeline.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-010-chat-pipeline.completed.md)

## Problem

`RollingSummaryOutput` already exists as the structured summary contract, but `ChatSession.rollingSummary` still persists only a lossy `string | null`. That mismatch discards commitments, revelations, unresolved questions, leverage shifts, and emotional trajectory immediately after summary generation.

## Assumption Reassessment (2026-03-27)

1. The summary generator already returns structured `RollingSummaryOutput`, while the persisted session shape still stores only a nullable string.
2. The pipeline currently keeps only `summary.compressedSummary` when updating the session, so the data loss is happening in orchestration/persistence rather than in the summary stage.
3. No remaining active `CHACHASYS-011` through `CHACHASYS-015` ticket currently owns chat domain-model or persistence-contract changes, so this issue is otherwise orphaned.
4. The character chat spec still reflects the older string-backed contract and should be updated when the canonical model changes.

## Architecture Check

1. Persisting the full `RollingSummaryOutput` is cleaner than collapsing it to a string because it preserves all already-generated continuity signals in one canonical object.
2. The chat domain should expose one summary contract end to end: generator output, session storage, prompt inputs, and downstream consumers should all speak the same type.
3. No backwards-compatibility aliasing, dual-read, or dual-write storage should be introduced. Update the canonical `ChatSession` contract directly and fix fallout at compile time.
4. This ticket should stay narrowly focused on domain and persistence truth. UI or route work can consume the richer summary later without redefining it.

## What to Change

### 1. Update chat domain contracts

- Change `ChatSession.rollingSummary` from `string | null` to `RollingSummaryOutput | null`
- Update chat validation helpers and representative fixtures accordingly
- Update [specs/character-chat-system.md](/home/joeloverbeck/projects/one-more-branch/specs/character-chat-system.md) so the spec matches the canonical implemented contract

### 2. Update persistence and pipeline integration

- Update persisted session parsing/validation so `chat.json` stores the full structured rolling summary object
- Update `runChatPipeline()` so it stores the full summary object, not only `compressedSummary`
- Update chat prompt builders that currently render `rollingSummary` as if it were a string so they intentionally format `RollingSummaryOutput`
- Keep summarizer stage input/output contracts unchanged unless a direct mismatch is discovered

### 3. Propagate contract assumptions

- Update any active chat tickets that still implicitly assume string-backed session summaries
- Keep scope limited to canonical contract propagation, not new UI presentation features

## Files to Touch

- `tickets/CHACHASYS-016-structured-rolling-summary-persistence.md` (new)
- `specs/character-chat-system.md` (modify)
- `src/models/chat/chat-session.ts` (modify)
- `src/models/chat/chat-validation.ts` (modify)
- `src/llm/chat/chat-pipeline.ts` (modify)
- `src/llm/prompts/chat/*` (modify only where rolling-summary formatting assumes string)
- `test/unit/models/chat/chat-models.test.ts` (modify)
- `test/unit/llm/chat/chat-pipeline.test.ts` (modify)
- `test/unit/persistence/chat-repository.test.ts` (modify)

## Out of Scope

- New UI widgets that display structured summary sections separately
- Route or client behavior changes unrelated to the contract update
- Changes to the summarizer schema shape unless required by a direct contract mismatch
- Data migration shims or legacy compatibility paths

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `ChatSession` fixtures and validators accept `RollingSummaryOutput | null`
2. Unit test: persisted chat sessions round-trip with a full structured rolling summary object
3. Unit test: chat pipeline stores the full summary object on `updatedSession.rollingSummary`
4. Unit test: chat prompt formatting still renders rolling-summary context deterministically from the structured object
5. Existing suite: `npm test` passes

### Invariants

1. `RollingSummaryOutput` remains the only structured rolling-summary contract in the chat domain
2. `ChatSession.rollingSummary` and summary-stage output stay type-aligned
3. No string-only alias field is introduced for compatibility
4. Prompt builders must consume structured summary deliberately rather than accidentally rendering `[object Object]`

## Test Plan

### New/Modified Tests

1. `test/unit/models/chat/chat-models.test.ts` — update model fixtures and runtime validation coverage for structured session summaries
2. `test/unit/persistence/chat-repository.test.ts` — verify session persistence round-trips the full summary object
3. `test/unit/llm/chat/chat-pipeline.test.ts` — verify full summary object is retained on the updated session
4. `test/unit/llm/prompts/chat/*.test.ts` — verify formatted prompt sections still render meaningful rolling-summary text

### Commands

1. `npm run test:unit -- --testPathPatterns='chat-models|chat-repository|chat-pipeline|prompts/chat'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

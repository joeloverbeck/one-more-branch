# CHACHASYS-017: Chat Memory Prompt Adapter Layer

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: [archive/tickets/CHACHASYS-016-structured-rolling-summary-persistence.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-016-structured-rolling-summary-persistence.completed.md), [specs/character-chat-system.md](/home/joeloverbeck/projects/one-more-branch/specs/character-chat-system.md)

## Problem

`CHACHASYS-016` established `RollingSummaryOutput` as the canonical persisted chat-memory contract, but prompt-boundary rendering still lives inside the generic chat prompt formatter module. That is acceptable at the current size, but it mixes durable memory adaptation with broader prompt formatting responsibilities. If more chat memory sources or prompt consumers are added, this will become an avoidable coupling point.

## Assumption Reassessment (2026-03-27)

1. `ChatSession.rollingSummary` now persists `RollingSummaryOutput | null`, and prompt builders deliberately format that structure at the boundary instead of coercing it implicitly.
2. The current formatting logic lives in `src/llm/prompts/chat/chat-prompt-formatters.ts`, alongside unrelated helpers for recent turns, speech fingerprints, full chat-bible formatting, and planner formatting.
3. No active ticket in `tickets/` currently owns a TypeScript refactor of chat prompt-boundary memory adaptation:
   - `CHACHASYS-011` owns service orchestration.
   - `CHACHASYS-012` owns routes.
   - `CHACHASYS-013` and `CHACHASYS-014` own UI.
   - `CHACHASYS-015` is explicitly docs-only and forbids functional code changes.
4. The current architecture is not broken, so this should remain a focused cleanup ticket rather than expanding unrelated chat-stage logic.

## Architecture Check

1. Extracting a dedicated chat-memory adapter layer is cleaner than leaving memory rendering in a grab-bag formatter module because it gives one explicit ownership point for converting canonical chat-memory structures into prompt text.
2. The adapter should be directional: canonical domain data in, prompt-safe text out. It should not introduce alternate storage types, alias fields, or backwards-compatibility shims.
3. Keeping the adapter separate from prompt builders makes future additions easier:
   - additional memory sources can compose through the same adapter layer;
   - prompt builders stay focused on prompt assembly;
   - tests can pin memory rendering behavior without pulling in unrelated formatter concerns.
4. This ticket should stay narrowly scoped to extracting and naming the seam cleanly. It should not redesign chat schemas or prompt contents.

## What to Change

### 1. Introduce a dedicated chat-memory adapter module

- Create a new module under `src/llm/chat/` or `src/llm/prompts/chat/` with a name that clearly communicates prompt-boundary memory adaptation.
- Move the structured rolling-summary formatting logic out of the generic formatter module into that adapter.
- If helpful, colocate any future-facing helper names around “rolling summary”, “chat memory”, or “prompt memory rendering” there, but do not add speculative abstractions that are not yet used.

### 2. Rewire prompt-boundary consumers

- Update the chat bible and chat summarizer prompt builders to depend on the dedicated memory adapter instead of the generic formatter module for rolling-summary rendering.
- Keep prompt contents behaviorally identical unless a direct bug is discovered.
- Leave unrelated prompt helpers in place unless they become unused as a result of this extraction.

### 3. Keep documentation and ownership clear

- Add a succinct code comment only if the new adapter boundary is otherwise non-obvious.
- If `CHACHASYS-015` has not yet landed when this is implemented, ensure the prompt docs derive their rolling-summary behavior from the new adapter-backed source files rather than older assumptions.

## Files to Touch

- `tickets/CHACHASYS-017-chat-memory-prompt-adapter-layer.md` (new)
- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify)
- `src/llm/prompts/chat/chat-bible-prompt.ts` (modify)
- `src/llm/prompts/chat/chat-summary-prompt.ts` (modify)
- `src/llm/prompts/chat/*` or `src/llm/chat/*` adapter module (new)
- `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` (modify if imports/behavior coverage need adjustment)
- `test/unit/llm/prompts/chat/chat-summary-prompt.test.ts` (modify if imports/behavior coverage need adjustment)
- adapter-focused unit test file (new if the extraction produces enough logic to justify direct coverage)

## Out of Scope

- Any changes to `RollingSummaryOutput` shape
- Any changes to persisted `ChatSession` schema
- Route, service, EJS, or client-side chat work
- Rewriting unrelated prompt formatter helpers solely for consistency
- Prompt-content redesign beyond preserving current behavior

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: rolling-summary prompt rendering is owned by the dedicated adapter module and still produces the current deterministic text
2. Unit test: chat bible prompt uses the adapter-backed rendering path without changing rendered content
3. Unit test: chat summary prompt uses the adapter-backed rendering path without changing rendered content
4. Existing suite: `npm test` passes

### Invariants

1. `RollingSummaryOutput` remains the single canonical persisted rolling-summary contract
2. Prompt builders do not contain ad hoc rolling-summary formatting logic
3. The adapter layer only converts canonical memory data into prompt text; it does not redefine storage contracts
4. No backwards-compatibility aliasing or dual-path memory representation is introduced

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` — confirms bible prompts still render rolling-summary text identically after the extraction
2. `test/unit/llm/prompts/chat/chat-summary-prompt.test.ts` — confirms summarizer prompts still render prior structured summary text identically after the extraction
3. `test/unit/llm/prompts/chat/<adapter-test>.test.ts` — covers the adapter module directly if the extracted formatting logic warrants isolated unit tests

### Commands

1. `npm run test:unit -- --testPathPatterns='chat-bible-prompt|chat-summary-prompt|chat'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

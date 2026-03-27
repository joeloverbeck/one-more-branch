# CHABIBSTASPL-007: Add strict-false fallback to all chat generation functions

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — chat generation error handling
**Deps**: CHABIBSTASPL-005 (pipeline rewired with new generation functions)

## Problem

The story engine's planner already has a `strict: false` fallback for the Anthropic "compiled grammar is too large" error (`generatePlannerWithFallback` pattern in `src/llm/planner-generation.ts`). The chat pipeline has no such protection. While the stage split (CHABIBSTASPL-001 through 006) should keep both schemas under the limit, adding the fallback as a safety net protects against future schema growth pushing any stage over the grammar limit.

## Assumption Reassessment (2026-03-27)

1. `generatePlannerWithFallback()` pattern at `src/llm/planner-generation.ts:165-188` — **confirmed**. It catches the error, builds a lenient schema copy with `strict: false`, and retries.
2. Error detection checks for `"compiled grammar is too large"` or `"reduce the number of strict tools"` in the error message — **confirmed**.
3. Chat generation functions that need the fallback (after CHABIBSTASPL-005): `generateChatSceneContext`, `generateChatCharacterContext`, `generateChatTurnPlan`, `generateChatWriterTurn`, `generateChatStateUpdate`, `generateChatSummary` — **confirmed** (6 functions total).
4. All chat generation functions follow the same `buildMessages → runLlmStage` pattern — **confirmed**.
5. None of the existing chat generation functions have any fallback logic — **confirmed**.

## Architecture Check

1. Extracting the error-detection and lenient-schema-building into a shared utility is cleaner than duplicating the pattern in 6 files. Create a small shared helper: `withGrammarFallback(fn, buildLenientSchema)` or similar.
2. No backwards-compatibility aliasing. This is a pure addition of error resilience.

## What to Change

### 1. Extract shared grammar fallback utility

New file `src/llm/grammar-fallback.ts`:

```typescript
function isGrammarTooLargeError(error: unknown): boolean {
  // Same check as isPlannerGrammarTooLargeError but generalized
}

function buildLenientSchema(schema: JsonSchema): JsonSchema {
  return {
    ...schema,
    json_schema: {
      ...schema.json_schema,
      strict: false,
    },
  };
}

async function withGrammarFallback<T>(
  attempt: () => Promise<T>,
  retryWithLenient: () => Promise<T>
): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (isGrammarTooLargeError(error)) {
      return retryWithLenient();
    }
    throw error;
  }
}
```

### 2. Apply fallback to all 6 chat generation functions

For each of these files, wrap the `runLlmStage` call with `withGrammarFallback`:

- `src/llm/chat/chat-scene-context-generation.ts`
- `src/llm/chat/chat-character-context-generation.ts`
- `src/llm/chat/chat-planner-generation.ts`
- `src/llm/chat/chat-writer-generation.ts`
- `src/llm/chat/chat-state-updater-generation.ts`
- `src/llm/chat/chat-summary-generation.ts`

Pattern per file:
```typescript
return withGrammarFallback(
  () => runLlmStage({ ...options, schema: STRICT_SCHEMA }),
  () => runLlmStage({ ...options, schema: buildLenientSchema(STRICT_SCHEMA) })
);
```

### 3. Optionally refactor planner to use shared utility

Refactor `src/llm/planner-generation.ts` to use the shared `isGrammarTooLargeError` and `buildLenientSchema` from the new utility, eliminating the duplicated helper functions. This is optional but reduces duplication.

## Files to Touch

- `src/llm/grammar-fallback.ts` (new)
- `src/llm/chat/chat-scene-context-generation.ts` (modify)
- `src/llm/chat/chat-character-context-generation.ts` (modify)
- `src/llm/chat/chat-planner-generation.ts` (modify)
- `src/llm/chat/chat-writer-generation.ts` (modify)
- `src/llm/chat/chat-state-updater-generation.ts` (modify)
- `src/llm/chat/chat-summary-generation.ts` (modify)
- `src/llm/planner-generation.ts` (modify — optional, use shared utility)

## Out of Scope

- Changes to model types, schemas, or prompts
- Changes to the chat pipeline orchestration logic
- Changes to stage registry or metadata
- Changes to any non-chat generation functions (story engine stages) beyond the optional planner refactor
- Adding retry logic for other error types (rate limits, 5xx — already handled elsewhere)

## Acceptance Criteria

### Tests That Must Pass

1. `isGrammarTooLargeError` returns `true` for errors containing "compiled grammar is too large".
2. `isGrammarTooLargeError` returns `true` for errors containing "reduce the number of strict tools".
3. `isGrammarTooLargeError` returns `false` for unrelated errors.
4. `buildLenientSchema` produces a schema identical to input except `strict: false`.
5. Each of the 6 chat generation functions retries with `strict: false` when the grammar error is thrown.
6. Each of the 6 chat generation functions re-throws non-grammar errors without retry.
7. If planner refactor is done: `generatePlannerWithFallback` still works identically.
8. Existing suite: `npm test` passes. `npm run typecheck` passes.

### Invariants

1. Normal (non-error) code path is unchanged — `strict: true` is always attempted first.
2. Fallback only triggers on the specific grammar-too-large error, not on any other failure.
3. No generation function silently swallows errors.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/grammar-fallback.test.ts` — `isGrammarTooLargeError` detection, `buildLenientSchema` output, `withGrammarFallback` retry and re-throw behavior
2. `test/unit/llm/chat/chat-scene-context-generation.test.ts` (modify) — Add fallback test case
3. `test/unit/llm/chat/chat-character-context-generation.test.ts` (modify) — Add fallback test case
4. `test/unit/llm/chat/chat-planner-generation.test.ts` (modify) — Add fallback test case
5. `test/unit/llm/chat/chat-writer-generation.test.ts` (modify) — Add fallback test case
6. `test/unit/llm/chat/chat-state-updater-generation.test.ts` (modify) — Add fallback test case
7. `test/unit/llm/chat/chat-summary-generation.test.ts` (modify) — Add fallback test case

### Commands

1. `npm test -- --testPathPattern="test/unit/llm/(grammar-fallback|chat/)"`
2. `npm run typecheck && npm run lint && npm test`

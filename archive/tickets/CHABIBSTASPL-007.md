# CHABIBSTASPL-007: Centralize grammar-too-large fallback and apply it to chat structured-output stages

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — structured output error handling
**Deps**: CHABIBSTASPL-005 (pipeline rewired with new generation functions)

## Problem

The chat pipeline has no fallback when a provider rejects a strict JSON schema because the compiled grammar is too large. The recent chat-bible stage split should keep the new chat schemas comfortably below the current Anthropic limit, but schema growth is ongoing and any structured-output stage can regress into this failure mode over time.

The repository already contains two independent implementations of this fallback pattern:

1. `generatePlannerWithFallback()` in `src/llm/planner-generation.ts`
2. `generateAccountantWithFallback()` in `src/llm/accountant-generation.ts`

Adding six more chat-local copies would improve resilience but worsen the architecture. The more robust direction is to centralize the grammar-error detection and strict-to-lenient schema transform in a shared LLM utility, then apply that utility consistently to chat stages and the already duplicated planner/accountant paths.

## Assumption Reassessment (2026-03-28)

1. Planner already has a grammar-too-large retry path at `src/llm/planner-generation.ts` — **confirmed**.
2. Accountant also already has the same retry path at `src/llm/accountant-generation.ts` — **confirmed**. The original ticket missed this duplication.
3. Both existing implementations detect the same signal phrases: `"compiled grammar is too large"` and `"reduce the number of strict tools"` — **confirmed**.
4. The six chat structured-output generation functions that still lack the fallback are:
   - `generateChatSceneContext`
   - `generateChatCharacterContext`
   - `generateChatTurnPlan`
   - `generateChatWriterTurn`
   - `generateChatStateUpdate`
   - `generateChatSummary`
   — **confirmed**.
5. All six chat functions currently follow the same `buildMessages(...) -> runLlmStage(...)` pattern with a schema argument and no retry wrapper — **confirmed**.
6. Existing chat unit tests currently verify prompt wiring, schema wiring, option pass-through, return shape, and error propagation, but they do **not** cover grammar-too-large fallback behavior — **confirmed**.
7. The related spec `specs/chat-bible-stage-split.md` explicitly proposed this fallback as an additional safety net after the stage split — **confirmed**.

## Architecture Check

1. A chat-only helper is **not** the cleanest architecture. The fallback concern already exists outside chat, so the correct abstraction boundary is shared structured-output retry support in `src/llm/`.
2. The preferred implementation is a focused utility that:
   - detects the grammar-too-large failure signal from `Error`, `LLMError`, and raw error-body text
   - converts any `JsonSchema` from strict to lenient mode
   - retries exactly once with the lenient schema
3. This is more beneficial than the current architecture because it removes existing planner/accountant duplication while adding the missing chat protection. It also gives future structured-output stages one obvious integration path instead of encouraging copy-pasted fallback code.
4. Longer-term ideal architecture: planner and accountant still bypass `runLlmStage()` and maintain their own HTTP/request logic. That broader unification is out of scope here, but the new shared fallback utility should make a later consolidation easier rather than harder.
5. No backwards-compatibility aliasing. If any call sites or tests were relying on duplicated helper internals, they should be updated to the shared utility instead.

## What to Change

### 1. Extract shared structured-output grammar fallback utility

New file `src/llm/structured-output-fallback.ts`:

```typescript
function isGrammarTooLargeError(error: unknown): boolean {
  // Shared detection for provider grammar-size failures
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

For each of these files, wrap the strict `runLlmStage` call with the shared retry utility:

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

### 3. Refactor existing duplicated fallback callers to the shared utility

Refactor both of these files to use the shared `isGrammarTooLargeError` and `buildLenientSchema` helpers:

- `src/llm/planner-generation.ts`
- `src/llm/accountant-generation.ts`

This is no longer optional. Leaving the existing duplicates in place would preserve avoidable architectural drift while adding a third fallback implementation style for chat.

## Files to Touch

- `src/llm/structured-output-fallback.ts` (new)
- `src/llm/chat/chat-scene-context-generation.ts` (modify)
- `src/llm/chat/chat-character-context-generation.ts` (modify)
- `src/llm/chat/chat-planner-generation.ts` (modify)
- `src/llm/chat/chat-writer-generation.ts` (modify)
- `src/llm/chat/chat-state-updater-generation.ts` (modify)
- `src/llm/chat/chat-summary-generation.ts` (modify)
- `src/llm/planner-generation.ts` (modify)
- `src/llm/accountant-generation.ts` (modify)

## Out of Scope

- Changes to model types, schemas, or prompts
- Changes to the chat pipeline orchestration logic
- Changes to stage registry or metadata
- General LLM client consolidation or rewriting planner/accountant to use `runLlmStage()`
- Adding retry logic for other error types (rate limits, 5xx — already handled elsewhere)

## Acceptance Criteria

### Tests That Must Pass

1. `isGrammarTooLargeError` returns `true` for errors containing `"compiled grammar is too large"`.
2. `isGrammarTooLargeError` returns `true` for errors containing `"reduce the number of strict tools"`.
3. `isGrammarTooLargeError` returns `false` for unrelated errors.
4. `buildLenientSchema` produces a schema identical to input except `strict: false`.
5. Each of the 6 chat generation functions retries with `strict: false` when the grammar error is thrown.
6. Each of the 6 chat generation functions re-throws non-grammar errors without retry.
7. Planner fallback behavior remains unchanged after refactor.
8. Accountant fallback behavior remains unchanged after refactor.
9. Relevant unit tests pass, then `npm run typecheck`, `npm run lint`, and `npm test` pass.

### Invariants

1. Normal (non-error) code path is unchanged — `strict: true` is always attempted first.
2. Fallback only triggers on the specific grammar-too-large error, not on any other failure.
3. No generation function silently swallows errors.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/structured-output-fallback.test.ts` — `isGrammarTooLargeError` detection, `buildLenientSchema` output, `withGrammarFallback` retry and re-throw behavior
2. `test/unit/llm/chat/chat-scene-context-generation.test.ts` (modify) — Add fallback test case
3. `test/unit/llm/chat/chat-character-context-generation.test.ts` (modify) — Add fallback test case
4. `test/unit/llm/chat/chat-planner-generation.test.ts` (modify) — Add fallback test case
5. `test/unit/llm/chat/chat-writer-generation.test.ts` (modify) — Add fallback test case
6. `test/unit/llm/chat/chat-state-updater-generation.test.ts` (modify) — Add fallback test case
7. `test/unit/llm/chat/chat-summary-generation.test.ts` (modify) — Add fallback test case
8. `test/unit/llm/planner-generation.test.ts` (modify only if needed) — Ensure shared utility refactor preserves existing planner retry behavior
9. `test/unit/llm/accountant-generation.test.ts` (add or modify if missing) — Cover shared utility refactor for accountant retry behavior if no equivalent test currently exists

### Commands

1. `npm test -- --runInBand --testPathPatterns="test/unit/llm/(structured-output-fallback|chat/|planner-generation|accountant-generation)"`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completed on 2026-03-28.
- Corrected the ticket scope first: this was not just a chat concern. The repository already duplicated the same grammar-too-large fallback in planner and accountant, so the final implementation centralized the fallback in `src/llm/structured-output-fallback.ts` and reused it across planner, accountant, and all six chat structured-output generators.
- Added targeted unit coverage for the shared utility, the six chat generators, and accountant fallback behavior. Existing planner fallback coverage remained valid after the refactor.
- Verification completed successfully with:
  - `npm test -- --runInBand --testPathPatterns="test/unit/llm/(structured-output-fallback|chat/|planner-generation|accountant-generation)"`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

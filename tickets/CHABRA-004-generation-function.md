# CHABRA-004: Character brainstormer LLM generation function

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CHABRA-001, CHABRA-002, CHABRA-003

## Problem

Need the orchestration function that wires together the prompt builder, schema, LLM client call, response transformer, and progress callbacks into a single `generateCharacterBrainstorm()` function. This is the single entry point the route handler will call.

## Assumption Reassessment (2026-03-25)

1. Generation functions follow the pattern in `writer-generation.ts`: import schema, import prompt builder, call LLM with structured output, transform response, fire progress callbacks.
2. The LLM client is called via a structured-output helper (schema-based) — confirmed.
3. `getStageModel()` from `stage-model.ts` resolves the model for the stage key registered in CHABRA-001.
4. Prompt logging happens automatically within the LLM client — no manual `logPrompt()` call needed in the generation function.

## Architecture Check

1. Single LLM call, single function — minimal complexity.
2. Follows the exact same pattern as all other generation functions in the project.
3. No backwards-compatibility shims needed.

## What to Change

### 1. Create generation function

File: `src/llm/character-brainstormer-generation.ts`

```typescript
export async function generateCharacterBrainstorm(
  context: CharacterBrainstormerContext,
  apiKey: string,
  modelOverride?: string,
  callbacks?: {
    onStageStarted?: (stage: string) => void;
    onStageCompleted?: (stage: string) => void;
  }
): Promise<CharacterBrainstormerResult>
```

Implementation:
1. Fire `onStageStarted('BRAINSTORMING_CHARACTERS')`
2. Build messages via `buildCharacterBrainstormerMessages(context)`
3. Get schema via `getCharacterBrainstormerSchema()`
4. Call LLM with messages, schema, apiKey, model (override or `getStageModel(...)`)
5. Transform response via `transformCharacterBrainstormerResponse(result)`
6. Fire `onStageCompleted('BRAINSTORMING_CHARACTERS')`
7. Return result

## Files to Touch

- `src/llm/character-brainstormer-generation.ts` (new)

## Out of Scope

- Schema and types (CHABRA-002 — already done)
- Prompt builder (CHABRA-003 — already done)
- Route handler integration (CHABRA-005)
- Retry logic beyond what the LLM client already provides
- Any modification to the LLM client itself
- Progress service integration (that's the route handler's job)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `generateCharacterBrainstorm()` calls prompt builder with the provided context
2. Unit test: calls LLM client with the schema from `getCharacterBrainstormerSchema()`
3. Unit test: uses `modelOverride` when provided, falls back to `getStageModel()` otherwise
4. Unit test: fires `onStageStarted` before LLM call and `onStageCompleted` after
5. Unit test: returns the transformed result from `transformCharacterBrainstormerResponse()`
6. Unit test: propagates LLM client errors without swallowing them
7. `npm run typecheck` passes
8. `npm run lint` passes
9. Existing suite: `npm test` — no regressions

### Invariants

1. Single LLM call per invocation — no retries beyond what the client provides
2. Progress callbacks are optional and never cause failures if missing
3. No side effects other than the LLM call and progress callbacks
4. No mutation of the input context

## Test Plan

### New/Modified Tests

1. `test/unit/llm/character-brainstormer-generation.test.ts` — mock LLM client, verify wiring, test callback ordering, test model override

### Commands

1. `npm run test:unit -- --testPathPattern="character-brainstormer-generation"` — targeted test
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` — full suite

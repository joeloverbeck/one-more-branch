# STRSTOARCSYS-014: Update Few-Shot Examples

## Status
Completed (2026-02-07)

## Summary
Update few-shot examples in `src/llm/examples.ts` to remove legacy `storyArc` usage and align example assistant JSON with the current story generation schema (including beat evaluation fields).

## Files to Touch
- `src/llm/examples.ts`
- `test/unit/llm/examples.test.ts`

## Out of Scope
- DO NOT modify `src/llm/prompts/structure-prompt.ts` few-shot constants (owned by STRSTOARCSYS-004)
- DO NOT modify opening/continuation prompt builders beyond consuming existing `buildFewShotMessages()`
- DO NOT modify schemas
- DO NOT modify engine layer
- DO NOT create new example files

## Reassessed Assumptions (Current Repo Reality)
- `src/llm/examples.ts` currently provides inlined few-shot message pairs used by opening/continuation prompt builders via `buildFewShotMessages()`.
- Structure-generation few-shot examples are defined in `src/llm/prompts/structure-prompt.ts`, not in `src/llm/examples.ts`.
- Existing examples still contain legacy `storyArc` content and do not fully reflect the current response schema requirements.
- The current story generation schema requires `beatConcluded` and `beatResolution` fields, plus health/NPC-state fields, in assistant JSON outputs.

## Updated Scope
1. Remove legacy `storyArc` references from `src/llm/examples.ts` example prompts/responses.
2. Update assistant JSON examples in `src/llm/examples.ts` to include current required response fields:
   - `beatConcluded`
   - `beatResolution`
   - `healthAdded`
   - `healthRemoved`
   - `characterStateChangesAdded`
   - `characterStateChangesRemoved`
3. Keep the existing `buildFewShotMessages()` API and behavior (opening: 1 pair, continuation: 1 pair minimal / + ending pair standard).
4. Update `test/unit/llm/examples.test.ts` to validate new expectations and guard against `storyArc` regression.

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/llm/examples.test.ts`:

1. Example format validation
   - Few-shot assistant JSON parses cleanly
   - No assistant example contains `storyArc`
   - Examples include `beatConcluded` and `beatResolution`
   - Examples include health/NPC-state arrays required by schema
2. Opening few-shot behavior
   - `buildFewShotMessages('opening', ...)` returns one example pair
   - Opening assistant example remains non-ending
3. Continuation few-shot behavior
   - Minimal mode returns one continuation pair
   - Standard mode includes continuation + ending example pairs
   - Includes both beat evaluation outcomes:
     - continuation example with `beatConcluded: false`
     - ending example with `beatConcluded: true` and non-empty `beatResolution`
4. Example usage in prompts
   - Existing prompt imports still work with unchanged `buildFewShotMessages()` API

### Invariants That Must Remain True
- All examples valid for their respective schemas
- No `storyArc` references anywhere in examples
- Beat evaluation examples show both concluded and not-concluded cases
- TypeScript strict mode passes

## Dependencies
- STRSTOARCSYS-012 (schemas must be updated first to know correct format)

## Breaking Changes
- None expected. `buildFewShotMessages()` public API remains unchanged.

## Estimated Scope
Small/medium: targeted updates to existing examples + unit test assertions.

## Outcome
- Updated `src/llm/examples.ts` to remove legacy `storyArc` references from example prompts/responses and align assistant example JSON with the current schema fields used by generation.
- Kept `buildFewShotMessages()` API and behavior unchanged.
- Updated `test/unit/llm/examples.test.ts` to enforce:
  - no `storyArc` in assistant examples
  - presence and expected values for beat evaluation fields
  - presence of health and NPC-state schema arrays
  - both beat outcomes across continuation + ending examples
- Verified with `npm run test:unit` and `npm run typecheck`.

### Actual vs Originally Planned
- Originally planned to introduce structure-generation examples in `src/llm/examples.ts`; this was not applicable because structure few-shot examples are owned by `src/llm/prompts/structure-prompt.ts`.
- Work was narrowed to the real integration points: opening/continuation few-shot examples and their unit tests.

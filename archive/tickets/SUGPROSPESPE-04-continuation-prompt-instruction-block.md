# SUGPROSPESPE-04: Add continuation-only suggested speech instruction block

## Status
**Status**: ✅ COMPLETED

## Summary
Reassessed scope: only the continuation writer prompt is still missing the suggested protagonist speech instruction block. Route/API validation, engine pass-through, and `ContinuationContext` typing are already in place.

## Depends on
- `tickets/SUGPROSPESPE-03-engine-and-context-threading.md`

## Blocks
- `tickets/SUGPROSPESPE-05-integration-and-regression-verification.md`

## File list it expects to touch
- `src/llm/prompts/continuation-prompt.ts`
- `test/unit/llm/prompts/continuation-prompt.test.ts`

## Reassessed assumptions and scope (2026-02-12)
1. Already implemented in codebase:
   - `suggestedProtagonistSpeech` request parsing/normalization in `src/server/routes/play.ts`
   - engine threading (`src/engine/*`) and LLM context field (`src/llm/types.ts`)
   - unit/integration coverage for route + engine pass-through
2. Remaining gap:
   - `buildContinuationPrompt(...)` does not currently render any suggested-speech guidance block.
3. Scope update for this ticket:
   - Add continuation-only prompt guidance block.
   - Add/strengthen continuation prompt tests for include/omit semantics.
   - Keep opening/planner prompt code untouched; verify no regression by running their existing tests.

## Implementation checklist
1. Add conditional continuation prompt section rendered only when `suggestedProtagonistSpeech` exists.
2. Ensure instruction text captures all semantics:
   - protagonist has considered saying it
   - use only when circumstances support it
   - adapt wording/tone/timing naturally
   - omit when implausible
3. Ensure section is omitted when field is absent or blank.
4. Confirm no references are added to opening or planner prompt builders.

## Out of scope
- Changing model, retry, or schema validation behavior.
- Editing opening prompt semantics unrelated to this feature.
- Editing planner prompt semantics unrelated to this feature.
- Route/UI behavior changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/continuation-prompt.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/opening-prompt.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/page-planner-prompt.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Suggested speech text appears only in continuation writer prompt path.
- Opening and planner prompt content remains unaffected.
- Advisory semantics are explicit; prompt never mandates literal insertion.

## Outcome
- Completion date: 2026-02-12
- What was actually changed:
  - Added a conditional continuation-only `SUGGESTED PROTAGONIST SPEECH (OPTIONAL GUIDANCE)` section in `src/llm/prompts/continuation-prompt.ts`.
  - Added unit coverage in `test/unit/llm/prompts/continuation-prompt.test.ts` for:
    - section inclusion when `suggestedProtagonistSpeech` is provided
    - section omission when absent
    - section omission when blank after trim
- Deviations from original plan:
  - No helper extraction in `src/llm/prompts/continuation/index.ts` was needed.
  - No edits were needed in opening/planner prompt test files; existing suites were run unchanged for regression verification.
- Verification results:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/continuation-prompt.test.ts` ✅
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/opening-prompt.test.ts` ✅
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/page-planner-prompt.test.ts` ✅
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/sections/planner/continuation-context.test.ts` ✅
  - `npm run typecheck` ✅

# STANARPROPLA-09: Update ContinuationContext type and builder for tracked promises

**Status**: COMPLETED
**Depends on**: STANARPROPLA-01, STANARPROPLA-06
**Blocks**: STANARPROPLA-10, STANARPROPLA-11

## Summary

`inheritedNarrativePromises`/`parentAnalystNarrativePromises` were already removed and the builder already reads from `parentPage.accumulatedPromises`. The remaining gap is architectural strictness: `ContinuationContext.accumulatedPromises` is currently optional in type definitions, which weakens the invariant expected by downstream planner/accountant prompt sections.

## File list

- **Modify**: `src/llm/context-types.ts`
  - Keep existing `TrackedPromise` import from `../models/state/index.js`
  - Enforce `accumulatedPromises: readonly TrackedPromise[]` as required on `ContinuationContext`
  - Keep `parentThreadPayoffAssessments` unchanged (thread-payoff specific)

- **Modify**: `src/engine/continuation-context-builder.ts`
  - Verify existing context object construction keeps `accumulatedPromises: parentPage.accumulatedPromises`
  - Verify `parentThreadPayoffAssessments` continues to read from `parentPage.analystResult?.threadPayoffAssessments ?? []`

- **Modify**: tests that instantiate `ContinuationContext`
  - Add/adjust fixtures so `accumulatedPromises` is present where `ContinuationContext` is created
  - Add or strengthen tests covering builder promise/payoff wiring invariants

## Out of scope

- Do NOT modify planner prompt files (`continuation-context.ts` prompt section) - that's STANARPROPLA-10
- Do NOT modify `thread-pacing-directive.ts` - that's STANARPROPLA-10
- Do NOT modify `page-service.ts` - that's STANARPROPLA-11
- Do NOT modify analyst types or prompts
- Do NOT modify unrelated tests

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` passes
- Relevant unit tests for continuation context typing/builder pass
- `npm run lint` passes

### Invariants that must remain true

- `ContinuationContext.accumulatedPromises` is required (not optional); all call sites must be updated in the same pass
- `parentThreadPayoffAssessments` field is unchanged (it's about thread resolution quality, not promise resolution)
- All other `ContinuationContext` fields are unchanged (parentPage metadata, active state, structure, threads, inventory, health, character state, NPC agendas, etc.)
- The builder reads `accumulatedPromises` from `parentPage.accumulatedPromises` (the page's accumulated tracked promises)

## Reassessed assumptions

- The ticket's original "replace legacy promise fields" scope is already complete in this branch.
- Remaining work is a strictness hardening pass (required `accumulatedPromises`) plus invariant-focused tests.
- This strictness is preferred over optional/defensive typing for long-term architecture: continuation prompts should receive a fully-formed continuation context contract, not nullable contract edges.

## Outcome

- **Completion date**: 2026-02-14
- **What changed**
  - Enforced `ContinuationContext.accumulatedPromises` as required in `src/llm/context-types.ts`.
  - Verified builder wiring remains correct (`parentPage.accumulatedPromises` and thread payoff assessments source).
  - Strengthened tests for continuation-context invariants and updated continuation fixtures to satisfy the stricter contract.
- **Deviation from original plan**
  - The original migration steps (removing legacy promise fields and wiring builder to `accumulatedPromises`) were already complete before this ticket pass; final implementation focused on contract strictness and tests rather than structural replacement.
- **Verification**
  - `npm run test:unit -- --coverage=false test/unit/engine/continuation-context-builder.test.ts test/unit/llm/types.test.ts test/unit/llm/few-shot-none-mode.test.ts test/integration/llm/few-shot-examples.test.ts test/integration/engine/lorekeeper-writer-pipeline.test.ts test/unit/llm/index.test.ts test/unit/llm/prompts/page-planner-prompt.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/llm/prompts/state-accountant-prompt.test.ts`
  - `npm test -- --runTestsByPath test/integration/llm/few-shot-examples.test.ts test/integration/engine/lorekeeper-writer-pipeline.test.ts`
  - `npm run typecheck`
  - `npm run lint`

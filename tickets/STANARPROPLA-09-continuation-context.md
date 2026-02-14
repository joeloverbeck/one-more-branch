# STANARPROPLA-09: Update ContinuationContext type and builder for tracked promises

**Status**: PENDING
**Depends on**: STANARPROPLA-01, STANARPROPLA-06
**Blocks**: STANARPROPLA-10, STANARPROPLA-11

## Summary

Replace the promise-related fields on `ContinuationContext` (`inheritedNarrativePromises`, `parentAnalystNarrativePromises`) with a single `accumulatedPromises: readonly TrackedPromise[]`. Update `continuation-context-builder.ts` to read from `parentPage.accumulatedPromises`.

## File list

- **Modify**: `src/llm/context-types.ts`
  - Add import: `TrackedPromise` from `'../models/state/keyed-entry'` (or `'../models/state/index.js'`)
  - Remove `inheritedNarrativePromises` and `parentAnalystNarrativePromises` fields from `ContinuationContext`
  - Add `accumulatedPromises: readonly TrackedPromise[]` to `ContinuationContext`
  - Keep `parentThreadPayoffAssessments` (it's for thread payoffs, not promise payoffs)

- **Modify**: `src/engine/continuation-context-builder.ts`
  - Update the context object construction: replace `inheritedNarrativePromises: parentPage.inheritedNarrativePromises` and `parentAnalystNarrativePromises: parentPage.analystResult?.narrativePromises ?? []` with `accumulatedPromises: parentPage.accumulatedPromises`
  - Update `parentThreadPayoffAssessments` to read from `parentPage.analystResult?.threadPayoffAssessments ?? []` (should already be correct)

## Out of scope

- Do NOT modify planner prompt files (`continuation-context.ts` prompt section) - that's STANARPROPLA-10
- Do NOT modify `thread-pacing-directive.ts` - that's STANARPROPLA-10
- Do NOT modify `page-service.ts` - that's STANARPROPLA-11
- Do NOT modify analyst types or prompts
- Do NOT modify any test files

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` on these two files must pass (assuming STANARPROPLA-06 is complete)

### Invariants that must remain true

- `ContinuationContext.accumulatedPromises` is required (not optional); all call sites must be updated in the same pass
- `parentThreadPayoffAssessments` field is unchanged (it's about thread resolution quality, not promise resolution)
- All other `ContinuationContext` fields are unchanged (parentPage metadata, active state, structure, threads, inventory, health, character state, NPC agendas, etc.)
- The builder reads `accumulatedPromises` from `parentPage.accumulatedPromises` (the page's accumulated tracked promises)

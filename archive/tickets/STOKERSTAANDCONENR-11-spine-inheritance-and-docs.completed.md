# STOKERSTAANDCONENR-11: Spine Inheritance & Prompt Documentation

**Status**: COMPLETED
**Priority**: LOW
**Depends On**: STOKERSTAANDCONENR-09, STOKERSTAANDCONENR-10
**Spec Phase**: 8a, 10a, 10b

## Summary

Reassessment shows spine conflict inheritance and most related prompt docs are already implemented. Remaining work is to close documentation gaps and keep docs aligned with production prompt behavior.

## Reassessed Assumptions (Code + Tests)

Confirmed in codebase:
- `src/llm/prompts/spine-prompt.ts` already enforces conflict inheritance from selected concept via hard instructions in the concept analysis block.
- `prompts/spine-prompt.md` already documents this inheritance behavior.
- `prompts/concept-ideator-prompt.md` already documents kernel input requirement and `whatIfQuestion` / `ironicTwist` / `playerFantasy`.
- `test/unit/llm/prompts/spine-prompt.test.ts` already covers concept-driven `conflictAxis` / `conflictType` inheritance instructions.

Discrepancies found:
- `prompts/kernel-evaluator-prompt.md` is missing.
- `prompts/concept-evaluator-prompt.md` does not yet document the enriched `hookStrength` and `conflictEngine` rubric criteria that exist in `src/llm/prompts/concept-evaluator-prompt.ts`.

## Corrected Scope

Only prompt documentation alignment work is in scope for this ticket:
1. Create `prompts/kernel-evaluator-prompt.md`.
2. Update `prompts/concept-evaluator-prompt.md` to reflect current rubric details.
3. Verify targeted prompt tests plus lint/typecheck still pass.

## File List

### New Files
- `prompts/kernel-evaluator-prompt.md` -- Kernel evaluator prompt documentation

### Modified (docs only)
- `prompts/concept-evaluator-prompt.md` -- Document updated scoring rubric for hookStrength and conflictEngine

## Detailed Requirements

### `prompts/kernel-evaluator-prompt.md`

New file. Mirror format of `prompts/concept-evaluator-prompt.md`:
- Source files: `src/llm/kernel-evaluator.ts`, `src/llm/prompts/kernel-evaluator-prompt.ts`, `src/llm/schemas/kernel-evaluator-schema.ts`
- Pipeline position: Second stage in kernel flow (after kernel ideator)
- Scoring dimensions: 5 dimensions with weights and thresholds
- Messages sent to model: system + user for scoring pass, then system + user for deep-eval pass
- Schema: kernel evaluator schema structure
- Response format: `scoredKernels` then `evaluatedKernels` (all kernels retained)

### Existing prompt doc updates

**`prompts/concept-evaluator-prompt.md`**:
- Document `hookStrength` explicitly includes `whatIfQuestion` quality and `playerFantasy` appeal.
- Document `conflictEngine` explicitly includes `ironicTwist` quality and conflict-type/axis coherence guidance.
- Keep two-pass evaluator behavior documentation aligned with runtime (`scoring` then `deep eval`).

## Architecture Rationale

This corrected scope is more robust than adding more prompt code now:
- The runtime architecture already enforces concept-to-spine conflict inheritance; duplicating code changes would add churn without architectural gain.
- The current risk is documentation drift between prompt code and prompt docs. Closing that drift improves maintainability and future extensibility without touching stable runtime paths.
- Keeping prompt docs as first-class artifacts supports safer iteration on LLM behavior because operators can reason about stage responsibilities without reverse-engineering TypeScript sources.

## Out of Scope

- Kernel implementation (STOKERSTAANDCONENR-01 through -08)
- ConceptSpec field changes (STOKERSTAANDCONENR-09)
- Concept-kernel integration (STOKERSTAANDCONENR-10)
- Any additional spine prompt/runtime changes beyond doc alignment
- Any changes to the StorySpine interface or spine-related types
- Any changes to the structure generator
- Any changes to the per-page generation pipeline

## Acceptance Criteria

### Tests That Must Pass
- Existing spine prompt tests still pass (including inheritance coverage)
- Concept evaluator unit tests still pass (including enrichment rubric assertions)
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants
- StorySpine interface is UNCHANGED
- No runtime behavior changes; docs reflect existing implementation
- Existing prompt docs maintain their format and structure
- Kernel evaluator documentation reflects two-pass scoring/deep-eval flow
- No code changes to structure generator or per-page pipeline

## Outcome

- Completion date: 2026-02-19
- What changed:
  - Reassessed ticket assumptions against current code/tests and corrected scope to documentation-only alignment.
  - Added missing `prompts/kernel-evaluator-prompt.md`.
  - Updated `prompts/concept-evaluator-prompt.md` with implemented rubric specifics for `hookStrength` and `conflictEngine` enrichment criteria.
- Deviations from original plan:
  - Did not modify `src/llm/prompts/spine-prompt.ts` or `prompts/spine-prompt.md` because inheritance behavior and documentation were already in place.
  - Did not modify `prompts/concept-ideator-prompt.md` because kernel-input and enrichment-field documentation were already present.
- Verification:
  - `npm run test:unit -- --coverage=false test/unit/llm/prompts/spine-prompt.test.ts test/unit/llm/concept-evaluator.test.ts test/unit/llm/kernel-evaluator.test.ts` (pass; suite executed full unit set due Jest pattern behavior)
  - `npm run typecheck` (pass)
  - `npm run lint` (pass)

# NARARCAUD-12: Premise Promises — Concept Stage

**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: S
**Dependencies**: None
**Spec reference**: D1 (part 1) — Concept-to-Delivery Pipeline gaps

## Summary

Add `premisePromises` to `ConceptVerification` so the concept verifier explicitly identifies 3-5 promises the premise makes to the audience. These are tracked at runtime in NARARCAUD-13.

## Files to Touch

- `src/models/concept-generator.ts` — add `readonly premisePromises: readonly string[]` to `ConceptVerification`
- `src/llm/schemas/concept-verifier-schema.ts` — add `premisePromises` array (3-5 items, required)
- `src/llm/prompts/concept-verifier-prompt.ts` — add premise promise instruction
- `prompts/concept-verifier-prompt.md` — update doc

## Out of Scope

- Runtime tracking of premise promise fulfillment (NARARCAUD-13)
- Analyst/planner wiring

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: concept verifier schema includes `premisePromises` array
- [ ] Unit test: `ConceptVerification` requires `premisePromises`
- [ ] Invariant: All existing concept tests pass (mocks updated)

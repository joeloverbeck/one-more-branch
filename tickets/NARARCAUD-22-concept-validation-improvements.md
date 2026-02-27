# NARARCAUD-22: Concept Validation Improvements

**Wave**: 4 (New Subsystems)
**Effort**: S
**Dependencies**: None
**Spec reference**: G1, G2 — Concept Validation gaps

## Summary

Strengthen the concept verifier with two new tests: (1) logline compression — can the concept be compressed to a compelling logline? (2) setpiece causal chain — do the setpieces form a causal chain rather than disconnected spectacles?

## Files to Touch

- `src/models/concept-generator.ts` — add to `ConceptVerification`: `loglineCompressible: boolean`, `logline: string`, `setpieceCausalChainBroken: boolean`, `setpieceCausalLinks: readonly string[]`
- `src/llm/schemas/concept-verifier-schema.ts` — add all 4 fields (required)
- `src/llm/prompts/concept-verifier-prompt.ts` — add logline compression test + setpiece causal chain test
- `prompts/concept-verifier-prompt.md` — update doc

## Out of Scope

- Downstream effects of validation results
- Concept evaluator/evolver

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: concept verifier schema includes all 4 new fields
- [ ] Unit test: `ConceptVerification` requires all new fields
- [ ] Invariant: All existing concept tests pass (mocks updated)

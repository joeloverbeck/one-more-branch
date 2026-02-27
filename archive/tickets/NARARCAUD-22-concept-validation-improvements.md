# NARARCAUD-22: Concept Validation Improvements

**Status**: COMPLETED
**Wave**: 4 (New Subsystems)
**Effort**: S
**Dependencies**: None
**Spec reference**: G1, G2 — Concept Validation gaps

## Summary

Strengthen concept verification with two additional hard checks:
1. Logline compression test: can the concept compress into a compelling <=27-word logline?
2. Setpiece causal chain test: do the six escalating setpieces connect via clear cause-and-effect rather than disconnected spectacle?

## Assumption Reassessment

1. The verifier has already evolved beyond the original ticket draft.
Current code already contains `premisePromises` and `kernelFidelityCheck` in model/schema/prompt/parser/tests.
Therefore, this ticket must not treat the verifier as baseline-minimal.

2. Touching model/schema/prompt alone is insufficient in this codebase.
`src/llm/concept-verifier.ts` performs strict runtime parsing, and fixtures/model guards enforce shape constraints across integration/e2e routes.
All of these must be updated in the same pass.

3. Backward-compatibility behavior in concept verification is now architectural debt.
`ConceptVerification.kernelFidelityCheck` is currently optional in the TypeScript model and `isSavedConcept` still accepts missing verifier fields.
Given project direction (no backward compatibility), this ticket should tighten verifier contracts rather than preserve legacy omission paths.

## Architecture Decision (Benefit vs Current State)

This change is beneficial and aligns with the desired architecture:
- It turns two narrative-quality heuristics (G1/G2) into explicit, typed invariants.
- It keeps verifier output self-contained, so downstream stages can rely on one canonical `ConceptVerification` contract instead of ad hoc derived checks.
- It removes permissive/legacy verification shapes in model guards, reducing hidden invalid-state drift.

Design choice for robustness/extensibility:
- Keep new checks inside `ConceptVerification` as first-class required fields.
- Enforce at three layers: JSON schema, runtime parser, and model guard/tests.
- Keep downstream behavior unchanged for this ticket (out of scope), but preserve future extensibility by exposing the data in the verifier contract now.

## Files to Touch

- `src/models/concept-generator.ts`
  - Add to `ConceptVerification`:
    - `loglineCompressible: boolean`
    - `logline: string`
    - `setpieceCausalChainBroken: boolean`
    - `setpieceCausalLinks: readonly string[]` (exactly 5 causal links between 6 setpieces)
  - Make `kernelFidelityCheck` required (remove optional marker) to align with strict no-legacy contract.
- `src/llm/schemas/concept-verifier-schema.ts`
  - Add all 4 new fields as required.
- `src/llm/prompts/concept-verifier-prompt.ts`
  - Add explicit instructions and output requirements for logline compression and setpiece causal-chain analysis.
- `src/llm/concept-verifier.ts`
  - Parse/validate the 4 new fields with strict constraints.
- `src/models/saved-concept.ts`
  - Tighten `isConceptVerification` guard to require full verifier contract (including `conceptId`, `premisePromises`, `kernelFidelityCheck`, and new fields).
- `test/fixtures/concept-generator.ts`
  - Update `createConceptVerificationFixture` to include required new fields.
- `test/unit/llm/concept-verifier.test.ts`
  - Add/adjust parser and schema contract tests for the 4 new fields and edge cases.
- `test/unit/models/saved-concept.test.ts`
  - Update verification guard tests to reflect strict required contract (remove backward-compat acceptance case).
- `prompts/concept-verifier-prompt.md`
  - Update prompt documentation to reflect new required verifier outputs.

## Out of Scope

- Changing how spine/structure/planner consume verification results.
- Concept evaluator/evolver changes.
- Any new scoring logic beyond adding the new verifier checks.

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Relevant verifier/model guard unit tests pass
- [x] `ConceptVerification` requires all new fields and required `kernelFidelityCheck`
- [x] Concept verifier schema requires all new fields
- [x] Parser rejects malformed causal-link/logline payloads and accepts valid payloads
- [x] Saved concept model guard rejects incomplete/legacy verification payloads

## Outcome

- Completion date: 2026-02-27
- What was changed:
  - Added required concept-verifier fields: `loglineCompressible`, `logline`, `setpieceCausalChainBroken`, `setpieceCausalLinks`.
  - Tightened `ConceptVerification` contract by making `kernelFidelityCheck` required.
  - Updated schema, prompt instructions, parser/runtime validation, saved-concept model guard, fixtures, and unit tests.
  - Added parser tests for boolean validation, logline word-limit enforcement, and strict causal-link array constraints.
- Deviations from original plan:
  - Expanded scope to include `src/llm/concept-verifier.ts`, `src/models/saved-concept.ts`, fixtures, and prompt/unit tests because model/schema-only changes would have left runtime/model-guard contract mismatches.
  - Removed backward-compat acceptance path for missing `kernelFidelityCheck` in saved-concept validation to align with strict architecture direction.
- Verification results:
  - `npm run typecheck` passed.
  - Focused suites passed:
    - `npm test -- test/unit/llm/concept-verifier.test.ts`
    - `npm test -- test/unit/models/saved-concept.test.ts`
    - `npm test -- test/unit/llm/prompts/concept-verifier-prompt.test.ts`
    - `npm test -- test/unit/llm/prompts/structure-prompt.test.ts`
    - `npm test -- test/unit/llm/structure-generator.test.ts`
  - Full `npm test` passed (241 suites, 2856 tests).
  - `npm run lint` passed.

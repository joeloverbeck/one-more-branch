**Status**: ✅ COMPLETED

# BEACONSCESIGGAT-03: Extend analyst types/schema/validation/transformer with scene-signal and gate diagnostics

## Summary
Add required diagnostics to analyst result contract, ensure strict-schema compatibility, and guarantee conservative fallback behavior through Zod defaults/catches and response transformation.

## Reassessed assumptions (2026-02-10)
- Scene-signal and completion-gate prompt instructions are already present in `src/llm/prompts/continuation/story-structure-section.ts`; this ticket should not re-implement prompt text.
- The required work is concentrated in analyst types + JSON schema + Zod validation + response transformer, with test updates.
- Adding required fields to `AnalystResult` propagates to typed analyst mocks beyond the originally listed files; update only files that fail typecheck/tests.
- Conservative behavior should prefer robustness over backward compatibility: malformed/partial diagnostics must not allow `beatConcluded` to resolve true.

## Depends on
- BEACONSCESIGGAT-01
- BEACONSCESIGGAT-02

## Blocks
- BEACONSCESIGGAT-04
- BEACONSCESIGGAT-05

## File list it expects to touch
- `src/llm/types.ts`
- `src/llm/schemas/analyst-schema.ts`
- `src/llm/schemas/analyst-validation-schema.ts`
- `src/llm/schemas/analyst-response-transformer.ts`
- `test/unit/llm/schemas/analyst-response-transformer.test.ts`
- `test/unit/llm/result-merger.test.ts` (if analyst mock shape requires updates)
- `test/unit/engine/page-service.test.ts` (if analyst mock shape requires updates)
- Additional typed test files that construct `AnalystResult` literals (only as required by typecheck/test failures)

## Implementation checklist
1. In `AnalystResult` and propagated types, add:
   - `sceneMomentum`
   - `objectiveEvidenceStrength`
   - `commitmentStrength`
   - `structuralPositionSignal`
   - `entryConditionReadiness`
   - `objectiveAnchors: string[]`
   - `anchorEvidence: string[]`
   - `completionGateSatisfied: boolean`
   - `completionGateFailureReason: string`
2. In `ANALYST_SCHEMA`, add corresponding properties with strict enums and include all new fields in `required`.
3. In `AnalystResultSchema` (Zod):
   - Add enum validators with conservative defaults/catches.
   - Add array normalization for `objectiveAnchors` and `anchorEvidence`.
   - Enforce/sanitize max length of 3 anchors.
   - Ensure fallback behavior keeps system conservative (`beatConcluded` should not become true due to malformed diagnostics).
4. In transformer:
   - Pass through diagnostics with trimming/sanitization.
   - Keep anchors/evidence order aligned and stable.
   - Enforce conservative conclusion fallback (`beatConcluded` cannot remain true when completion-gate diagnostics are malformed/unsatisfied).
5. Update tests for valid parse, missing fields, invalid enum values, malformed arrays, and conservative defaults.

## Out of scope
- Do not modify prompt copy beyond what is required to keep tests compiling.
- Do not implement engine-level beat progression override logic (BEACONSCESIGGAT-05).
- Do not add new persistence model fields.
- Do not modify writer schema.

## Acceptance criteria

### Specific tests that must pass
- `test/unit/llm/schemas/analyst-response-transformer.test.ts`
  - Valid response includes all diagnostics and preserves values.
  - Missing diagnostics default to safe values.
  - Invalid enum diagnostics are coerced to safe defaults.
  - `objectiveAnchors` and `anchorEvidence` are trimmed/sanitized.
  - Anchor/evidence arrays are bounded and aligned in order.
- `test/unit/llm/result-merger.test.ts` passes with updated mocks/types.
- `test/unit/engine/page-service.test.ts` passes with updated mocks/types.
- `npm run test:unit -- test/unit/llm/schemas/analyst-response-transformer.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- `ANALYST_SCHEMA` stays `strict: true` and `additionalProperties: false`.
- Invalid analyst payloads do not crash parsing pipeline.
- Existing fields (`beatConcluded`, `beatResolution`, deviation and pacing fields) retain behavior.
- Backward-safe behavior remains conservative when diagnostics are missing or malformed.

## Outcome
- Completion date: 2026-02-10
- What changed:
  - Added scene-signal and completion-gate diagnostics to `AnalystResult` contract in `src/llm/types.ts`.
  - Extended `src/llm/schemas/analyst-schema.ts` with required diagnostic fields and strict enums while preserving `strict: true` and `additionalProperties: false`.
  - Extended `src/llm/schemas/analyst-validation-schema.ts` with enum defaults/catches and robust array preprocessing for malformed diagnostics.
  - Updated `src/llm/schemas/analyst-response-transformer.ts` to sanitize/trim diagnostics, cap anchors to 3, align `anchorEvidence` to anchor order/length, and enforce conservative conclusion fallback (`beatConcluded` requires `completionGateSatisfied`).
  - Updated tests in `test/unit/llm/schemas/analyst-response-transformer.test.ts`, `test/unit/llm/result-merger.test.ts`, and typed fixture coverage in `test/unit/llm/types.test.ts`.
- Deviations from original plan:
  - Prompt updates were not implemented because prompt scene-signal/gate instructions were already present (scope corrected in reassessed assumptions).
  - Additional targeted typed fixture update was required in `test/unit/llm/types.test.ts`.
- Verification:
  - `npm run typecheck` passed.
  - `npx jest --runTestsByPath test/unit/llm/schemas/analyst-response-transformer.test.ts test/unit/llm/result-merger.test.ts test/unit/engine/page-service.test.ts` passed.

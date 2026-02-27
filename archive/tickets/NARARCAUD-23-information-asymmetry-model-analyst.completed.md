# NARARCAUD-23: Information Asymmetry — Model & Analyst

**Status**: COMPLETED
**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: None
**Spec reference**: F3 (part 1) — Subsystem gaps

## Summary

Create the `KnowledgeAsymmetry` data model tracking what each character knows, believes falsely, and keeps secret. Wire analyst detection so the analyst emits per-scene asymmetry observations for downstream page accumulation in NARARCAUD-24.

## Assumption Reassessment (2026-02-27)

- The repo already uses a strict analyst pipeline: JSON Schema (`analyst-schema.ts`) + Zod validation (`analyst-validation-schema.ts`) + response normalization (`analyst-response-transformer.ts`) + broad fixture usage (`test/fixtures/llm-results.ts`).
- Because of this architecture, adding required fields only to `AnalystResult` and JSON schema is insufficient; the validation and normalization layers must be updated in the same change or runtime/type regressions occur.
- Existing architecture is already clean and extensible for this feature: analyst emits normalized scene-level signals; page/planner persistence is handled separately. This separation is preferable to coupling persistence concerns into analyst generation.

## Files to Create

- `src/models/state/knowledge-state.ts` — `KnowledgeAsymmetry` interface: `characterName`, `knownFacts: readonly string[]`, `falseBeliefs: readonly string[]`, `secrets: readonly string[]` (all required)

## Files to Touch

- `src/models/state/index.ts` — export new types
- `src/llm/analyst-types.ts` — add asymmetry detection fields to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — add knowledge asymmetry output fields
- `src/llm/schemas/analyst-validation-schema.ts` — add required validation/defaulting for asymmetry fields
- `src/llm/schemas/analyst-response-transformer.ts` — normalize asymmetry payload into canonical shape
- `src/llm/prompts/analyst-prompt.ts` — add information asymmetry detection instruction
- `prompts/analyst-prompt.md` — update doc
- `test/fixtures/llm-results.ts` — include defaults for new required `AnalystResult` fields

## Out of Scope

- Page storage (NARARCAUD-24)
- Planner context
- Serialization

## Architectural Direction

- Keep the analyst output canonical and explicit:
  - one field for current observed asymmetry state per character
  - one field for scene-level dramatic irony opportunities
- No backward compatibility or alias fields. New fields are required and normalized at ingest boundaries.
- Keep all persistence and accumulation logic in NARARCAUD-24 to preserve subsystem boundaries.

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: `KnowledgeAsymmetry` model shape/is-guard validates
- [x] Unit test: analyst JSON schema includes asymmetry fields in `properties` and `required`
- [x] Unit test: analyst response transformer normalizes asymmetry fields (trim/filter behavior and defaults)
- [x] Invariant: All existing tests pass

## Outcome

- **Completion date**: 2026-02-27
- **What changed**
  - Added `KnowledgeAsymmetry` state model + runtime guard (`src/models/state/knowledge-state.ts`) and exported it from state/model barrels.
  - Added required analyst output fields:
    - `knowledgeAsymmetryDetected: KnowledgeAsymmetry[]`
    - `dramaticIronyOpportunities: string[]`
  - Updated analyst JSON schema, Zod validation schema, response transformer normalization, analyst prompt rules, and prompt documentation.
  - Updated persistence file types and analyst-result converter to persist/restore the new fields.
  - Updated shared analyst test factory and added/expanded tests for model guard, schema fields, prompt instructions, and transformer normalization behavior.
- **Deviation from original ticket plan**
  - Original scope did not include `analyst-validation-schema.ts`, `analyst-response-transformer.ts`, and persistence converter/file-type updates. These were required by the current architecture’s strict validation + normalization + serialization boundaries.
- **Verification**
  - `npm run typecheck` passed.
  - Focused unit tests for touched areas passed.
  - `npm test` passed (`245/245` suites, `2875/2875` tests).
  - `npm run lint` passed.

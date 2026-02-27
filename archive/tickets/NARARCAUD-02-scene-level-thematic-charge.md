# NARARCAUD-02: Scene-Level Thematic Charge in Analyst

**Status**: COMPLETED
**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: NARARCAUD-01 (antithesis field on AnalystContext)
**Spec reference**: B4 — Thematic Architecture gaps

## Summary

Add thematic charge classification to the analyst stage so each scene is tagged as `THESIS_SUPPORTING`, `ANTITHESIS_SUPPORTING`, or `AMBIGUOUS`. This provides a canonical scene-level thematic signal for downstream dialectical tracking (NARARCAUD-17).

## Reassessed Assumptions (Current Code Reality)

1. `src/llm/analyst.ts` is not part of the pipeline (file does not exist).
   - Analyst output validation/mapping lives in:
     - `src/llm/schemas/analyst-validation-schema.ts` (zod parsing/defaulting)
     - `src/llm/schemas/analyst-response-transformer.ts` (normalization to `AnalystResult`)
2. Analyst prompt already includes `antithesis` in the user message via `buildKernelAntithesisSection(...)`.
   - Missing piece is threading and rendering `thematicQuestion`, plus explicit scene-level thematic charge instruction.
3. Analyst context is assembled in `src/engine/post-generation-processor.ts` through `runAnalystEvaluation(...)`.
   - `antithesis` is already passed from `story.storyKernel?.antithesis ?? ''`.
   - `thematicQuestion` is not currently passed.
4. The ticket originally omitted tests that enforce parser/transformer behavior, which is the authoritative mapping layer between LLM JSON and runtime types.

## Architecture Decision

Implement thematic charge as a first-class, required `AnalystResult` field validated by schema and transformed in one place. Do not alias or keep backward-compatible fallbacks.

Why this is better than current architecture:
- Keeps analyst outputs strongly typed and explicit (no implicit inference downstream).
- Preserves separation of concerns: prompt instructs, schema constrains, transformer normalizes.
- Makes downstream dialectical features deterministic and extensible.

## Updated Files to Touch

- `src/llm/analyst-types.ts`
  - Add `thematicCharge: 'THESIS_SUPPORTING' | 'ANTITHESIS_SUPPORTING' | 'AMBIGUOUS'`
  - Add `thematicChargeDescription: string`
  - Add `thematicQuestion: string` to `AnalystContext`
- `src/llm/schemas/analyst-schema.ts`
  - Add both thematic output fields and mark required
- `src/llm/schemas/analyst-validation-schema.ts`
  - Add zod validation/defaulting for thematic fields
- `src/llm/schemas/analyst-response-transformer.ts`
  - Map and normalize thematic fields into `AnalystResult`
- `src/llm/prompts/analyst-prompt.ts`
  - Add thematic charge classification instruction to system message
  - Render thematic question + antithesis in user message
- `src/engine/analyst-evaluation.ts`
  - Add `thematicQuestion` to `AnalystEvaluationContext` and thread into `generateAnalystEvaluation(...)`
- `src/engine/post-generation-processor.ts`
  - Pass `story.storyKernel?.thematicQuestion ?? ''` to analyst context
- `prompts/analyst-prompt.md`
  - Update production prompt doc to match implementation

## Tests to Add/Update

- `test/unit/llm/schemas/analyst-schema.test.ts`
  - Assert schema includes required `thematicCharge` and `thematicChargeDescription`
- `test/unit/llm/prompts/analyst-prompt.test.ts`
  - Assert thematic question/antithesis section rendering
  - Assert system prompt includes thematic charge instructions
- `test/unit/llm/schemas/analyst-response-transformer.test.ts`
  - Assert transformer maps and trims thematic fields
- Update impacted `AnalystResult`/`AnalystContext` test fixtures or typed literals as needed

## Out of Scope

- Dialectical tracking across pages (NARARCAUD-17)
- Page-level storage of thematic charge
- UI presentation of thematic charge

## Acceptance Criteria

- [x] `npm run typecheck` passes with new required analyst fields
- [x] Analyst schema includes `thematicCharge` and `thematicChargeDescription` as required
- [x] Analyst prompt renders thematic context (`thematicQuestion` + `antithesis`) and classification instructions
- [x] Analyst response transformer maps thematic fields correctly
- [x] Relevant analyst unit/integration tests pass with updated required fields

## Outcome

- **Completion date**: 2026-02-27
- **What changed**:
  - Added required scene-level thematic fields to analyst contracts (`thematicCharge`, `thematicChargeDescription`) and threaded required `thematicQuestion` through analyst context assembly.
  - Updated analyst JSON schema, zod validation schema, and response transformer so thematic classification is validated, normalized, and persisted as canonical analyst output.
  - Updated analyst prompt generation and prompt documentation to include explicit thematic classification rules and thematic kernel rendering (`thematicQuestion` + `antithesis`).
  - Updated persistence converter and page serializer types to include thematic fields in serialized analyst payloads.
  - Added/updated unit and integration tests covering schema requirements, prompt rendering/instructions, transformer mapping/defaulting, and new required context fields.
- **Deviation from original plan**:
  - Original ticket omitted persistence converter/file-data typing changes; these were required to keep the typed persistence pipeline consistent after making thematic fields required.
- **Verification results**:
  - `npm run test:unit -- --coverage=false` passed (`204` suites, `2475` tests)
  - `npm run test:integration` passed (`23` suites, `229` tests)
  - `npm run typecheck` passed
  - `npm run lint` passed

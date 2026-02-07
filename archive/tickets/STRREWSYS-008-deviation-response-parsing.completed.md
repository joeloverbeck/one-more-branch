# STRREWSYS-008: Parse Deviation Detection from LLM Response

## Status
Completed

## Summary
Extend structured LLM response handling so continuation results include deviation detection signals (`deviationDetected`, `deviationReason`, `invalidatedBeatIds`, `narrativeSummary`) as a typed `DeviationResult`.

## Reassessment of Prior Assumptions
The original ticket assumed raw text parsing (for example `DEVIATION: YES` line scanning). That assumption does not match the current codebase architecture:
- Continuation generation already uses strict OpenRouter `json_schema` output.
- Responses are parsed as JSON and validated through `GenerationResultSchema`.
- Therefore, deviation extraction belongs in schema + response transformation, not a new raw-text parser module.

## Dependencies
- STRREWSYS-005 (deviation types in story-arc)
- STRREWSYS-006 (ContinuationGenerationResult type)
- STRREWSYS-007 (prompts updated to request deviation)

## Updated Scope

### In Scope
- Add deviation fields to structured output schema.
- Validate and normalize deviation fields in Zod schema.
- Transform validated deviation fields into `DeviationResult` in response transformer.
- Return `ContinuationGenerationResult` from continuation generation path.
- Add/adjust unit tests for schema and transformer behavior.

### Out of Scope
- Do NOT add a raw text parser (`deviation-detector.ts`).
- Do NOT modify `structure-manager.ts` (handled in STRREWSYS-012).
- Do NOT implement structure rewriting (handled in STRREWSYS-013).
- Do NOT modify `page-service.ts` logic (handled in STRREWSYS-011).

## Files to Touch

### Modified Files
- `src/llm/schemas/openrouter-schema.ts`
- `src/llm/schemas/validation-schema.ts`
- `src/llm/schemas/response-transformer.ts`
- `src/llm/client.ts`
- `test/unit/llm/schemas/openrouter-schema.test.ts`
- `test/unit/llm/schemas/validation-schema.test.ts`
- `test/unit/llm/schemas/response-transformer.test.ts`

## Implementation Details

### `src/llm/schemas/openrouter-schema.ts`
- Add structured fields:
  - `deviationDetected: boolean`
  - `deviationReason: string`
  - `invalidatedBeatIds: string[]`
  - `narrativeSummary: string`
- Require these fields in schema for deterministic output shape.

### `src/llm/schemas/validation-schema.ts`
- Add defaults for deviation fields:
  - `deviationDetected` default `false`
  - `deviationReason` default `''`
  - `invalidatedBeatIds` default `[]`
  - `narrativeSummary` default `''`

### `src/llm/schemas/response-transformer.ts`
- Build `deviation` from validated JSON fields:
  - If `deviationDetected !== true`, return `createNoDeviation()`.
  - If `deviationDetected === true`, require non-empty reason/summary and at least one valid beat ID (`X.Y` format).
  - On malformed deviation payload, fall back safely to `createNoDeviation()`.

### `src/llm/client.ts`
- Keep opening generation unchanged.
- Return `ContinuationGenerationResult` for `generateContinuationPage`.

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/llm/schemas/response-transformer.test.ts`
- `test/unit/llm/schemas/validation-schema.test.ts`
- `test/unit/llm/schemas/openrouter-schema.test.ts`
- `test/unit/llm/client.test.ts`
- Existing `npm run test:unit` remains green for touched behavior.

### Invariants That Must Remain True
1. **Safe fallback**: malformed deviation payload yields `NoDeviation` without crash.
2. **Beat ID format validation**: only `X.Y` IDs are accepted in deviation.
3. **Backward compatibility**: non-deviation responses still validate and transform correctly.
4. **No public API break beyond intended typing alignment**: continuation returns `ContinuationGenerationResult`.

## Outcome
Originally planned: add raw text parser and parser-specific tests.
Actually changed: implemented deviation extraction in the existing structured schema-validation-transform pipeline, which matches the repository architecture and prompt/schema contract.

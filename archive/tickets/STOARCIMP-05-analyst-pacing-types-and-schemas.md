**Status**: ✅ COMPLETED

# STOARCIMP-05: Extend analyst types, JSON schema, Zod schema, and response transformer for pacing detection

**Phase**: 2 (Analyst Pacing Detection)
**Spec sections**: 2.1, 2.2, 2.3, 2.4
**Depends on**: STOARCIMP-01, STOARCIMP-02
**Blocks**: STOARCIMP-06, STOARCIMP-08

## Description

Extend the analyst pipeline to support pacing detection fields:

1. **Types** (`types.ts`):
   - Add `PacingRecommendedAction = 'none' | 'nudge' | 'rewrite'` type.
   - Add `pacingIssueDetected: boolean`, `pacingIssueReason: string`, `recommendedAction: PacingRecommendedAction` to `AnalystResult`.
   - Add `pacingIssueDetected: boolean`, `pacingIssueReason: string`, `recommendedAction: PacingRecommendedAction` to `ContinuationGenerationResult`.

2. **Analyst JSON schema** (`analyst-schema.ts`): Add three new required fields: `pacingIssueDetected` (boolean), `pacingIssueReason` (string), `recommendedAction` (string enum).

3. **Analyst Zod validation schema** (`analyst-validation-schema.ts`): Add `pacingIssueDetected` (boolean, default false), `pacingIssueReason` (string, default ''), `recommendedAction` (enum, default 'none').

4. **Analyst response transformer** (`analyst-response-transformer.ts`): Pass through the three new fields in the returned `AnalystResult`.

## Files to touch

| File | Change |
|------|--------|
| `src/llm/types.ts` | Add `PacingRecommendedAction` type. Extend `AnalystResult` with 3 pacing fields. Extend `ContinuationGenerationResult` with 3 pacing fields. |
| `src/llm/schemas/analyst-schema.ts` | Add `pacingIssueDetected`, `pacingIssueReason`, `recommendedAction` to JSON schema and `required` array. |
| `src/llm/schemas/analyst-validation-schema.ts` | Add 3 pacing fields to Zod schema with defaults. |
| `src/llm/schemas/analyst-response-transformer.ts` | Include 3 pacing fields in returned `AnalystResult`. |
| `test/unit/llm/schemas/analyst-response-transformer.test.ts` | Test parsing of pacing fields -- present, missing (defaults), invalid `recommendedAction` (defaults to 'none'). |
| `test/unit/llm/types.test.ts` | If type tests exist, verify `PacingRecommendedAction` and extended interfaces. |

## Out of scope

- Data model types (`story-arc.ts`) -- STOARCIMP-01, STOARCIMP-02.
- Structure schema/parser -- STOARCIMP-03.
- `result-merger.ts` -- STOARCIMP-06.
- `page-service.ts` runtime logic -- STOARCIMP-06.
- Analyst prompt text changes (pacing instructions) -- STOARCIMP-08.
- Writer/continuation prompt changes -- STOARCIMP-08.

## Acceptance criteria

### Tests that must pass

1. **`validateAnalystResponse` parses all pacing fields correctly**: Given valid JSON with `pacingIssueDetected: true`, `pacingIssueReason: 'Beat stalled'`, `recommendedAction: 'nudge'`, the returned `AnalystResult` contains these values.
2. **Missing pacing fields default**: Given JSON without pacing fields, `pacingIssueDetected` defaults to `false`, `pacingIssueReason` to `''`, `recommendedAction` to `'none'`.
3. **Invalid `recommendedAction` defaults to `'none'`**: Given `recommendedAction: 'invalid_value'`, the Zod schema coerces to `'none'`.
4. **`pacingIssueReason` is trimmed**: Leading/trailing whitespace is removed.
5. **Analyst JSON schema includes pacing fields in `required`**: Schema inspection confirms all 3 fields are required.
6. **`AnalystResult` type includes pacing fields**: TypeScript compilation confirms the extended interface.
7. **`ContinuationGenerationResult` includes pacing fields**: TypeScript compilation confirms the extended interface.
8. **All existing analyst-response-transformer tests pass**.
9. **TypeScript build (`npm run typecheck`) passes**.

### Invariants that must remain true

- **Existing analyst fields unchanged**: `beatConcluded`, `beatResolution`, `deviationDetected`, `deviationReason`, `invalidatedBeatIds`, `narrativeSummary` behavior identical.
- **Backward-safe defaults**: If LLM omits pacing fields, system behaves as if no pacing issue.
- **All existing tests pass**.

## Outcome

**Completed**: 2026-02-09

**What was changed**:
- `src/llm/types.ts`: Added `PacingRecommendedAction` type, extended `AnalystResult` and `ContinuationGenerationResult` with 3 pacing fields.
- `src/llm/schemas/analyst-schema.ts`: Added 3 pacing fields to JSON schema properties and `required` array.
- `src/llm/schemas/analyst-validation-schema.ts`: Added 3 pacing fields with defaults; used `.catch('none')` to coerce invalid `recommendedAction`.
- `src/llm/schemas/analyst-response-transformer.ts`: Passed through 3 pacing fields with `pacingIssueReason` trimmed.
- `src/llm/result-merger.ts`: Added backward-safe pacing defaults to satisfy `ContinuationGenerationResult` type.
- `src/llm/schemas/response-transformer.ts`: Added backward-safe pacing defaults.
- `test/unit/llm/schemas/analyst-response-transformer.test.ts`: 6 new tests for pacing field parsing, defaults, coercion, and trimming.
- `test/unit/llm/result-merger.test.ts`: Updated mock to include pacing fields.
- `test/unit/llm/types.test.ts`: Updated mocks for `AnalystResult` and `ContinuationGenerationResult`.

**Deviations**: `result-merger.ts` and `response-transformer.ts` were listed as out-of-scope but required minimal changes (adding defaults) because extending `ContinuationGenerationResult` broke their return types.

**Verification**: TypeScript typecheck passes. 95 test suites, 1424 tests all passing.

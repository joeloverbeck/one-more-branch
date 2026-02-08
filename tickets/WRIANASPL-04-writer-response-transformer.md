# WRIANASPL-04: Create Writer Response Transformer

## Summary

Create `validateWriterResponse()` — the function that takes raw JSON from the writer LLM call, normalizes malformed choices, validates via `WriterResultSchema`, trims/filters all fields, and returns a `WriterResult`.

## Files to Touch

- `src/llm/schemas/writer-response-transformer.ts` — **New file**: `validateWriterResponse()` function
- `test/unit/llm/schemas/writer-response-transformer.test.ts` — **New file**: Unit tests

## Out of Scope

- Do NOT modify `response-transformer.ts` or `validateGenerationResponse()`
- Do NOT update `schemas/index.ts` exports (that is WRIANASPL-10)
- Do NOT create or modify any generation strategy files

## Implementation Details

Create `src/llm/schemas/writer-response-transformer.ts` with:

```typescript
export function validateWriterResponse(
  rawJson: unknown,
  rawResponse: string,
): WriterResult
```

Follow the same pattern as `validateGenerationResponse()` in `response-transformer.ts`:

1. **Normalize**: Reuse the `normalizeRawResponse()` logic for malformed choices. Either import it (if exported) or duplicate the `isMalformedChoicesArray` + `extractChoicesFromMalformedString` + `normalizeRawResponse` functions. Prefer duplication to avoid modifying `response-transformer.ts`.

2. **Validate**: Parse via `WriterResultSchema` from `writer-validation-schema.ts`.

3. **Trim/filter**: Apply the same trimming and empty-filtering to all string/array fields:
   - `narrative.trim()`
   - `choices.map(c => c.trim())`
   - All `*Added`/`*Removed` arrays: `.map(s => s.trim()).filter(s => s)`
   - `newCharacterCanonFacts`: trim keys and values, filter empties
   - `characterStateChangesAdded/Removed`: trim names and states, filter empties
   - `protagonistAffect`: trim all string fields

4. **Return `WriterResult`**: Include `rawResponse` in the result. Do NOT include any deviation or beat fields.

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/schemas/writer-response-transformer.test.ts`:
  - Parses valid writer response JSON correctly
  - Trims whitespace from all string fields
  - Filters empty strings from arrays
  - Handles malformed single-string choices array (recovery)
  - Rejects responses with empty narrative
  - Rejects non-ending responses with fewer than 2 choices
  - Accepts ending responses with 0 choices
  - Handles missing optional fields with defaults
  - Returns `rawResponse` in the result
  - Does NOT include `beatConcluded`, `beatResolution`, `deviation`, `deviationDetected`, `deviationReason`, `invalidatedBeatIds`, or `narrativeSummary` in output

### Invariants that must remain true

- `validateGenerationResponse()` in `response-transformer.ts` is unchanged
- All existing tests pass: `npm run test:unit`

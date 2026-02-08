# WRIANASPL-11: Create Result Merger

## Summary

Create `mergeWriterAndAnalystResults()` — the pure function that combines a `WriterResult` and an optional `AnalystResult` into a `ContinuationGenerationResult`. This is the single integration point between the two-call pipeline and the existing downstream code.

## Files to Touch

- `src/llm/result-merger.ts` — **New file**: `mergeWriterAndAnalystResults()` function
- `test/unit/llm/result-merger.test.ts` — **New file**: Unit tests

## Out of Scope

- Do NOT modify `ContinuationGenerationResult` or any existing types
- Do NOT modify any existing transformer or validation files
- Do NOT modify `page-service.ts` (that is WRIANASPL-12)
- Do NOT update `src/llm/index.ts` exports (that is WRIANASPL-10)

## Implementation Details

Create `src/llm/result-merger.ts`:

```typescript
import { createBeatDeviation, createNoDeviation } from '../models/story-arc.js';
import type { AnalystResult, ContinuationGenerationResult, WriterResult } from './types.js';

export function mergeWriterAndAnalystResults(
  writer: WriterResult,
  analyst: AnalystResult | null,
): ContinuationGenerationResult {
  const beatConcluded = analyst?.beatConcluded ?? false;
  const beatResolution = analyst?.beatResolution ?? '';
  const deviationReason = analyst?.deviationReason?.trim() ?? '';
  const narrativeSummary = analyst?.narrativeSummary?.trim() ?? '';
  const invalidatedBeatIds = analyst?.invalidatedBeatIds ?? [];

  const deviation =
    analyst?.deviationDetected && deviationReason && narrativeSummary && invalidatedBeatIds.length > 0
      ? createBeatDeviation(deviationReason, invalidatedBeatIds, narrativeSummary)
      : createNoDeviation();

  return {
    ...writer,
    beatConcluded,
    beatResolution,
    deviation,
    rawResponse: writer.rawResponse,
  };
}
```

Key behavior:
- When `analyst` is `null` (no structure): all beat/deviation fields default to zero values (`false`, `''`, no-deviation)
- Deviation is only constructed when ALL four conditions are true: `deviationDetected`, non-empty `deviationReason`, non-empty `narrativeSummary`, and non-empty `invalidatedBeatIds`
- Uses `createBeatDeviation()` and `createNoDeviation()` from `../models/story-arc.js` — same functions used in existing `validateGenerationResponse()`
- Spreads all writer fields directly — the writer fields map 1:1 to the corresponding `GenerationResult` fields

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/result-merger.test.ts`:
  - **Null analyst**: Returns defaults (beatConcluded false, empty beatResolution, no deviation)
  - **Analyst with no deviation**: beatConcluded and beatResolution from analyst, deviation is no-deviation
  - **Analyst with full deviation**: Creates beat deviation with reason, invalidated beat IDs, narrative summary
  - **Partial deviation** (missing narrativeSummary): Falls back to no-deviation
  - **Partial deviation** (empty invalidatedBeatIds): Falls back to no-deviation
  - **Writer fields passthrough**: All writer fields (narrative, choices, inventory, health, etc.) appear unchanged in result
  - **rawResponse**: Uses writer's rawResponse
  - **Result shape**: Output satisfies `ContinuationGenerationResult` type (has `deviation` field of `DeviationResult` type)

### Invariants that must remain true

- `ContinuationGenerationResult` type is unchanged
- `createBeatDeviation()` and `createNoDeviation()` in `story-arc.ts` are unchanged
- The deviation construction logic matches exactly what `validateGenerationResponse()` does (same 4-condition check)
- All existing tests pass: `npm run test:unit`

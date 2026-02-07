# STRREWSYS-008: Parse Deviation Detection from LLM Response

## Summary
Extend the LLM response parsing to extract deviation detection signals from continuation responses and return them as part of the generation result.

## Dependencies
- STRREWSYS-005 (deviation types in story-arc)
- STRREWSYS-006 (ContinuationGenerationResult type)
- STRREWSYS-007 (prompts updated to request deviation)

## Files to Touch

### New Files
- `src/llm/deviation-detector.ts`

### Modified Files
- `src/llm/schemas/response-transformer.ts` (or equivalent response parser)
- `src/llm/index.ts` (add exports)
- `test/unit/llm/schemas/response-transformer.test.ts`

## Out of Scope
- Do NOT modify the LLM client itself
- Do NOT modify structure-manager.ts (handled in STRREWSYS-012)
- Do NOT implement structure rewriting (handled in STRREWSYS-013)
- Do NOT modify page-service.ts (handled in STRREWSYS-011)

## Implementation Details

### New File: `src/llm/deviation-detector.ts`

```typescript
import {
  DeviationResult,
  BeatDeviation,
  NoDeviation,
  createBeatDeviation,
  createNoDeviation,
} from '../models/story-arc.js';

/**
 * Parses deviation detection from raw LLM response.
 * Returns NoDeviation if parsing fails or DEVIATION: NO.
 */
export function parseDeviationFromResponse(rawResponse: string): DeviationResult {
  const lines = rawResponse.split('\n');

  // Find DEVIATION line
  const deviationLine = lines.find(line =>
    line.trim().toUpperCase().startsWith('DEVIATION:')
  );

  if (!deviationLine) {
    return createNoDeviation();
  }

  const deviationValue = deviationLine.split(':')[1]?.trim().toUpperCase();

  if (deviationValue !== 'YES') {
    return createNoDeviation();
  }

  // Parse deviation details
  const reason = extractField(lines, 'DEVIATION_REASON');
  const invalidatedBeatsRaw = extractField(lines, 'INVALIDATED_BEATS');
  const narrativeSummary = extractField(lines, 'NARRATIVE_SUMMARY');

  if (!reason || !invalidatedBeatsRaw || !narrativeSummary) {
    // Malformed deviation - treat as no deviation for safety
    console.warn('Malformed deviation response, missing required fields');
    return createNoDeviation();
  }

  const invalidatedBeatIds = parseInvalidatedBeatIds(invalidatedBeatsRaw);

  if (invalidatedBeatIds.length === 0) {
    console.warn('Deviation detected but no valid beat IDs found');
    return createNoDeviation();
  }

  return createBeatDeviation(reason, invalidatedBeatIds, narrativeSummary);
}

/**
 * Extracts a field value from response lines.
 * Handles multi-line values.
 */
function extractField(lines: string[], fieldName: string): string | null {
  const fieldPrefix = `${fieldName}:`;
  const fieldIndex = lines.findIndex(line =>
    line.trim().toUpperCase().startsWith(fieldPrefix.toUpperCase())
  );

  if (fieldIndex === -1) {
    return null;
  }

  const line = lines[fieldIndex];
  const colonIndex = line.indexOf(':');
  const value = line.substring(colonIndex + 1).trim();

  // Check for multi-line value (indented continuation lines)
  let fullValue = value;
  for (let i = fieldIndex + 1; i < lines.length; i++) {
    const nextLine = lines[i];
    // Stop if we hit another field or empty line
    if (nextLine.trim() === '' || /^[A-Z_]+:/.test(nextLine.trim())) {
      break;
    }
    // Continue if indented
    if (nextLine.startsWith('  ') || nextLine.startsWith('\t')) {
      fullValue += ' ' + nextLine.trim();
    } else {
      break;
    }
  }

  return fullValue || null;
}

/**
 * Parses comma-separated beat IDs.
 * Validates format: "1.1, 2.1, 2.2" etc.
 */
function parseInvalidatedBeatIds(raw: string): readonly string[] {
  const beatIdPattern = /^\d+\.\d+$/;

  return raw
    .split(',')
    .map(id => id.trim())
    .filter(id => beatIdPattern.test(id));
}

/**
 * Type guard: checks if result is a BeatDeviation.
 */
export function isBeatDeviation(result: DeviationResult): result is BeatDeviation {
  return result.detected === true;
}
```

### `src/llm/schemas/response-transformer.ts` Updates

Add deviation parsing to continuation response transformation:

```typescript
import { parseDeviationFromResponse } from '../deviation-detector.js';
import type { ContinuationGenerationResult } from '../types.js';

// Update or add function for continuation responses
export function transformContinuationResponse(
  rawResponse: string,
  // ... other params
): ContinuationGenerationResult {
  // Existing parsing logic for narrative, choices, etc.
  const baseResult = transformResponse(rawResponse, /* ... */);

  // Parse deviation
  const deviation = parseDeviationFromResponse(rawResponse);

  return {
    ...baseResult,
    deviation,
  };
}
```

### `src/llm/index.ts` Updates

Add exports:
```typescript
export { parseDeviationFromResponse, isBeatDeviation } from './deviation-detector.js';
export type { ContinuationGenerationResult } from './types.js';
```

### Test File: `test/unit/llm/deviation-detector.test.ts`

```typescript
import { parseDeviationFromResponse, isBeatDeviation } from '../../../src/llm/deviation-detector';

describe('parseDeviationFromResponse', () => {
  describe('when DEVIATION: YES', () => {
    it('should parse complete deviation with all fields');
    it('should parse comma-separated beat IDs');
    it('should handle whitespace in beat IDs');
    it('should handle multi-line DEVIATION_REASON');
  });

  describe('when DEVIATION: NO', () => {
    it('should return NoDeviation');
    it('should handle lowercase "no"');
  });

  describe('when DEVIATION section missing', () => {
    it('should return NoDeviation');
  });

  describe('when malformed', () => {
    it('should return NoDeviation when DEVIATION_REASON missing');
    it('should return NoDeviation when INVALIDATED_BEATS missing');
    it('should return NoDeviation when NARRATIVE_SUMMARY missing');
    it('should return NoDeviation when beat IDs are invalid format');
    it('should filter out invalid beat IDs but keep valid ones');
  });

  describe('edge cases', () => {
    it('should handle empty response');
    it('should handle response with only deviation section');
    it('should be case-insensitive for field names');
  });
});

describe('isBeatDeviation', () => {
  it('should return true for BeatDeviation');
  it('should return false for NoDeviation');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/llm/deviation-detector.test.ts` - all tests pass
- Run with: `npm test -- test/unit/llm/deviation-detector.test.ts`

### Invariants That Must Remain True
1. **Safe fallback** - Any parsing error results in NoDeviation (never crash)
2. **Beat ID format validation** - Only valid "X.Y" format IDs accepted
3. **Case insensitivity** - Field names work regardless of case
4. **Backward compatibility** - Responses without DEVIATION section work fine
5. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Parsing is intentionally lenient - better to miss a deviation than crash
- Console warnings for malformed responses aid debugging
- Beat ID validation is strict to prevent invalid references
- This parser is used by the response transformer, not called directly

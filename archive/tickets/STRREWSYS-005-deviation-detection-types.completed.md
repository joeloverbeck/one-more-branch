# STRREWSYS-005: Create Deviation Detection Types

## Summary
Add types for detecting when the narrative has deviated from planned story beats, enabling the system to know when structure rewriting is needed.

## Dependencies
- None (can be done in parallel with STRREWSYS-001)

## Assumption Check (Reassessed)

- `src/models/story-arc.ts` currently does **not** define deviation result types or helpers.
- `test/unit/models/story-arc.test.ts` currently covers base structure-state utilities only.
- `src/models/index.ts` exports story-arc types via a named export block from `./story-arc`.
- `createBeatDeviation()` requires at least one invalidated beat ID, so tests must **not** expect empty lists to be valid for `BeatDeviation`.

## Files to Touch

### Modified Files
- `src/models/story-arc.ts`
- `src/models/index.ts` (add exports)
- `test/unit/models/story-arc.test.ts`

## Out of Scope
- Do NOT modify LLM types (handled in STRREWSYS-006)
- Do NOT modify prompts (handled in STRREWSYS-007)
- Do NOT implement deviation parsing (handled in STRREWSYS-008)
- Do NOT implement rewriting logic

## Implementation Details

### `src/models/story-arc.ts` Additions

Add to end of file:
```typescript
/**
 * Signal from LLM that remaining beats are invalidated.
 */
export interface BeatDeviation {
  /** Whether a deviation was detected */
  readonly detected: true;

  /** Human-readable explanation of why beats are invalidated */
  readonly reason: string;

  /** Beat IDs that are now invalid (starting from first invalidated) */
  readonly invalidatedBeatIds: readonly string[];

  /** Current narrative state summary for regeneration context */
  readonly narrativeSummary: string;
}

/**
 * Signal from LLM that no deviation occurred.
 */
export interface NoDeviation {
  readonly detected: false;
}

/**
 * Deviation detection result from LLM.
 */
export type DeviationResult = BeatDeviation | NoDeviation;

/**
 * Type guard for deviation detection.
 */
export function isDeviation(result: DeviationResult): result is BeatDeviation {
  return result.detected === true;
}

/**
 * Type guard for no deviation.
 */
export function isNoDeviation(result: DeviationResult): result is NoDeviation {
  return result.detected === false;
}

/**
 * Creates a BeatDeviation object.
 */
export function createBeatDeviation(
  reason: string,
  invalidatedBeatIds: readonly string[],
  narrativeSummary: string
): BeatDeviation {
  if (invalidatedBeatIds.length === 0) {
    throw new Error('BeatDeviation must have at least one invalidated beat ID');
  }
  return {
    detected: true,
    reason,
    invalidatedBeatIds,
    narrativeSummary,
  };
}

/**
 * Creates a NoDeviation object.
 */
export function createNoDeviation(): NoDeviation {
  return { detected: false };
}

/**
 * Validates that invalidated beat IDs are not concluded beats.
 * Returns true if all invalidated beats are pending or active (valid).
 */
export function validateDeviationTargets(
  deviation: BeatDeviation,
  structureState: AccumulatedStructureState
): boolean {
  const concludedIds = new Set(
    structureState.beatProgressions
      .filter(bp => bp.status === 'concluded')
      .map(bp => bp.beatId)
  );

  return deviation.invalidatedBeatIds.every(id => !concludedIds.has(id));
}
```

### `src/models/index.ts` Updates

Add exports:
```typescript
export {
  // ... existing exports ...
  BeatDeviation,
  NoDeviation,
  DeviationResult,
  isDeviation,
  isNoDeviation,
  createBeatDeviation,
  createNoDeviation,
  validateDeviationTargets,
} from './story-arc';
```

### `test/unit/models/story-arc.test.ts` Updates

Add tests:
```typescript
describe('DeviationResult', () => {
  describe('isDeviation', () => {
    it('should return true for BeatDeviation');
    it('should return false for NoDeviation');
  });

  describe('isNoDeviation', () => {
    it('should return true for NoDeviation');
    it('should return false for BeatDeviation');
  });

  describe('createBeatDeviation', () => {
    it('should create BeatDeviation with all fields');
    it('should throw if invalidatedBeatIds is empty');
    it('should preserve readonly arrays');
  });

  describe('createNoDeviation', () => {
    it('should create NoDeviation with detected: false');
  });

  describe('validateDeviationTargets', () => {
    it('should return true when no concluded beats are invalidated');
    it('should return false when a concluded beat is in invalidatedBeatIds');
    it('should handle beats not in progressions'); // pending beats have no entry
  });
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/models/story-arc.test.ts` - all existing and new tests pass
- Run with: `npm test -- test/unit/models/story-arc.test.ts`

### Invariants That Must Remain True
1. **I4: Deviation Only Detected for Pending/Active Beats** - `validateDeviationTargets` enforces this
2. **Type safety** - Union type `DeviationResult` with proper type guards
3. **Immutability** - All arrays are readonly
4. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- These types are used in LLM response parsing (STRREWSYS-008)
- Keep types simple - the complexity is in parsing and handling, not the types themselves
- `validateDeviationTargets` is a validation helper, not enforcement (callers decide what to do)

## Status
- [x] Completed

## Outcome

Implemented the planned model additions with one corrected assumption:
- `createBeatDeviation()` keeps strict non-empty `invalidatedBeatIds` validation.
- Test scope was adjusted accordingly (no "empty invalidatedBeatIds returns true" case for `BeatDeviation`).
- Added/updated only the planned model exports and unit coverage; no broader refactors or API breaks.

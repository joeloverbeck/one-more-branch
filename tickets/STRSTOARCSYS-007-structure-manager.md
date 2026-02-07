# STRSTOARCSYS-007: Structure Manager

## Summary
Create the structure manager in the engine layer to handle structure creation, initial state generation, and structure progression (advancing beats/acts).

## Files to Touch
- `src/engine/structure-manager.ts` (NEW)
- `src/engine/index.ts` (add exports)

## Out of Scope
- DO NOT modify `story-service.ts` (that's STRSTOARCSYS-008)
- DO NOT modify `page-service.ts` (that's STRSTOARCSYS-009)
- DO NOT modify data models (that's STRSTOARCSYS-001/002/003)
- DO NOT modify prompts or schemas
- DO NOT modify persistence layer

## Implementation Details

### Create `src/engine/structure-manager.ts`

```typescript
import {
  AccumulatedStructureState,
  BeatProgression,
  StoryStructure,
  StoryBeat,
  StoryAct,
  createEmptyAccumulatedStructureState,
} from '../models/story-arc';

export interface StructureProgressionResult {
  updatedState: AccumulatedStructureState;
  actAdvanced: boolean;
  beatAdvanced: boolean;
  isComplete: boolean;  // All acts/beats concluded
}

export interface StructureGenerationResult {
  overallTheme: string;
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      description: string;
      objective: string;
    }>;
  }>;
  rawResponse: string;
}
```

### Function: `createStoryStructure`

```typescript
/**
 * Creates StoryStructure from raw generation result.
 * Assigns hierarchical IDs to beats (e.g., "1.1", "1.2", "2.1").
 */
export function createStoryStructure(
  result: StructureGenerationResult,
): StoryStructure {
  const acts: StoryAct[] = result.acts.map((actData, actIndex) => {
    const actId = String(actIndex + 1);
    const beats: StoryBeat[] = actData.beats.map((beatData, beatIndex) => ({
      id: `${actId}.${beatIndex + 1}`,
      description: beatData.description,
      objective: beatData.objective,
    }));

    return {
      id: actId,
      name: actData.name,
      objective: actData.objective,
      stakes: actData.stakes,
      entryCondition: actData.entryCondition,
      beats,
    };
  });

  return {
    acts,
    overallTheme: result.overallTheme,
    generatedAt: new Date(),
  };
}
```

### Function: `createInitialStructureState`

```typescript
/**
 * Creates initial AccumulatedStructureState for first page.
 * Sets first beat of first act as 'active', all others 'pending'.
 */
export function createInitialStructureState(
  structure: StoryStructure,
): AccumulatedStructureState {
  const beatProgressions: BeatProgression[] = [];

  structure.acts.forEach((act, actIdx) => {
    act.beats.forEach((beat, beatIdx) => {
      const isFirst = actIdx === 0 && beatIdx === 0;
      beatProgressions.push({
        beatId: beat.id,
        status: isFirst ? 'active' : 'pending',
      });
    });
  });

  return {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions,
  };
}
```

### Function: `advanceStructureState`

```typescript
/**
 * Advances the structure state when a beat is concluded.
 * Returns immutable updated state.
 */
export function advanceStructureState(
  structure: StoryStructure,
  currentState: AccumulatedStructureState,
  beatResolution: string,
): StructureProgressionResult {
  // 1. Mark current beat as concluded with resolution
  // 2. Determine next beat (same act or next act)
  // 3. Mark next beat as active
  // 4. Return updated state with flags
}
```

Implementation logic:
1. Get current beat ID from indices
2. Update beatProgressions: set current to 'concluded' with resolution
3. Check if last beat of act → advance act
4. Check if last act → mark complete
5. Otherwise, advance beat index and mark new current as 'active'
6. Return new immutable state

### Function: `applyStructureProgression`

```typescript
/**
 * Applies structure state inheritance (parent -> child page).
 * If beatConcluded, advances the state.
 */
export function applyStructureProgression(
  structure: StoryStructure,
  parentState: AccumulatedStructureState,
  beatConcluded: boolean,
  beatResolution: string,
): AccumulatedStructureState {
  if (!beatConcluded) {
    return parentState;  // No change
  }

  const result = advanceStructureState(structure, parentState, beatResolution);
  return result.updatedState;
}
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/structure-manager.test.ts`:

1. `createStoryStructure`
   - Creates structure from generation result
   - Assigns hierarchical IDs to beats ("1.1", "1.2", "2.1", etc.)
   - Preserves all act and beat fields
   - Sets `generatedAt` to current date

2. `createInitialStructureState`
   - Sets `currentActIndex` to 0
   - Sets `currentBeatIndex` to 0
   - Creates `beatProgressions` for ALL beats in structure
   - Sets first beat as 'active'
   - Sets all other beats as 'pending'

3. `advanceStructureState` within same act
   - Advances to next beat within same act
   - Marks concluded beat with resolution in beatProgressions
   - Marks new current beat as 'active'
   - Returns `beatAdvanced: true`, `actAdvanced: false`

4. `advanceStructureState` to next act
   - Advances to next act when last beat of current act concludes
   - Resets beat index to 0 on act transition
   - Marks first beat of new act as 'active'
   - Returns `beatAdvanced: true`, `actAdvanced: true`

5. `advanceStructureState` story completion
   - Marks story complete when last beat of last act concludes
   - Returns `isComplete: true`

6. `advanceStructureState` immutability
   - Does not modify input `currentState`
   - Returns new object

7. `applyStructureProgression`
   - Returns parent state unchanged when `beatConcluded: false`
   - Advances state when `beatConcluded: true`
   - Includes resolution in advanced state

### Invariants That Must Remain True

From spec:
```typescript
// INV-1: Index bounds
state.currentActIndex >= 0 && state.currentActIndex < structure.acts.length

// INV-2: Beat index bounds within current act
state.currentBeatIndex >= 0 &&
state.currentBeatIndex < structure.acts[state.currentActIndex].beats.length

// INV-3: Beat progression status consistency
// Concluded before current, active at current, pending after

// INV-4: Concluded beats must have resolution
progression.status === 'concluded' → progression.resolution.length > 0

// INV-7: Unique beat IDs
new Set(allBeatIds).size === allBeatIds.length
```

Additional:
- All functions are pure (no side effects)
- TypeScript strict mode passes
- Existing tests continue to pass

## Dependencies
- STRSTOARCSYS-001 (needs story-arc types)

## Estimated Scope
~150 lines of code + ~250 lines of tests

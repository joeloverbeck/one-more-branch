# STRSTOARCSYS-001: Story Arc Data Models

## Status
Completed on 2026-02-07.

## Summary
Create the new `src/models/story-arc.ts` file with type definitions for the structured story arc system: `StoryBeat`, `StoryAct`, `StoryStructure`, `BeatProgression`, and `AccumulatedStructureState`.

## Assumptions Reassessed (2026-02-07)
- `src/models/story-arc.ts` does not exist yet in the current codebase.
- `test/unit/models/story-arc.test.ts` does not exist yet in the current codebase.
- `src/models/story.ts` and `src/models/page.ts` are still on the pre-structure model, which matches this ticket being model-foundation only.
- A barrel test already exists at `test/unit/models/index.test.ts`; this ticket should update barrel exports without broad test rewrites.

## Updated Scope
- Implement only the new story-arc model module and utilities.
- Update barrel exports in `src/models/index.ts` for the new model symbols.
- Add focused unit tests for `story-arc` behavior and minimally extend barrel export test coverage if needed.
- Validate with targeted unit tests and `typecheck` for this ticket, not full cross-suite migration work.

## Files to Touch
- `src/models/story-arc.ts` (NEW)
- `src/models/index.ts` (add exports)

## Out of Scope
- DO NOT modify `src/models/story.ts` (that's STRSTOARCSYS-002)
- DO NOT modify `src/models/page.ts` (that's STRSTOARCSYS-003)
- DO NOT create any engine logic (that's STRSTOARCSYS-007)
- DO NOT create any persistence logic
- DO NOT create any prompt/LLM changes

## Implementation Details

### Create `src/models/story-arc.ts`

```typescript
export type BeatStatus = 'pending' | 'active' | 'concluded';

export interface StoryBeat {
  readonly id: string;           // e.g., "1.1", "1.2", "2.1"
  readonly description: string;  // What should happen in this beat
  readonly objective: string;    // Specific goal for the protagonist
}

export interface StoryAct {
  readonly id: string;           // e.g., "1", "2", "3"
  readonly name: string;         // e.g., "The Discovery"
  readonly objective: string;    // Main goal of this act
  readonly stakes: string;       // What's at risk
  readonly entryCondition: string;
  readonly beats: readonly StoryBeat[];
}

// The immutable structure definition - stored on Story
export interface StoryStructure {
  readonly acts: readonly StoryAct[];
  readonly overallTheme: string; // Central conflict/goal
  readonly generatedAt: Date;
}

// Beat progression - what happened to a beat in this branch
export interface BeatProgression {
  readonly beatId: string;       // References StoryBeat.id
  readonly status: BeatStatus;
  readonly resolution?: string;  // How it was resolved (if concluded)
}

// The accumulated structure state - stored per Page
export interface AccumulatedStructureState {
  readonly currentActIndex: number;       // 0-based
  readonly currentBeatIndex: number;      // 0-based within current act
  readonly beatProgressions: readonly BeatProgression[];
}
```

### Utility Functions to Create

```typescript
export function createEmptyAccumulatedStructureState(): AccumulatedStructureState;

export function getCurrentAct(
  structure: StoryStructure,
  state: AccumulatedStructureState
): StoryAct | undefined;

export function getCurrentBeat(
  structure: StoryStructure,
  state: AccumulatedStructureState
): StoryBeat | undefined;

export function getBeatProgression(
  state: AccumulatedStructureState,
  beatId: string
): BeatProgression | undefined;

export function isLastBeatOfAct(
  structure: StoryStructure,
  state: AccumulatedStructureState
): boolean;

export function isLastAct(
  structure: StoryStructure,
  state: AccumulatedStructureState
): boolean;
```

### Update `src/models/index.ts`

Add exports for all new types and functions.

## Acceptance Criteria

### Tests That Must Pass
Create `test/unit/models/story-arc.test.ts` with:

1. `createEmptyAccumulatedStructureState`
   - Creates state with `currentActIndex: 0`
   - Creates state with `currentBeatIndex: 0`
   - Creates state with empty `beatProgressions: []`

2. `getCurrentAct`
   - Returns correct act by index
   - Returns `undefined` when index is out of bounds

3. `getCurrentBeat`
   - Returns correct beat by act/beat indices
   - Returns `undefined` when act index is out of bounds
   - Returns `undefined` when beat index is out of bounds

4. `getBeatProgression`
   - Returns progression for existing beatId
   - Returns `undefined` for unknown beatId

5. `isLastBeatOfAct`
   - Returns `true` on final beat of an act
   - Returns `false` on non-final beat

6. `isLastAct`
   - Returns `true` when `currentActIndex === 2`
   - Returns `false` when `currentActIndex === 0` or `1`

### Invariants That Must Remain True
- All interfaces use `readonly` modifiers for immutability
- `BeatStatus` is a union type with exactly three values: `'pending' | 'active' | 'concluded'`
- All utility functions are pure (no side effects, no mutations)
- TypeScript strict mode passes with no errors
- Relevant unit tests pass:
  - `npm run test:unit -- test/unit/models/story-arc.test.ts`
  - `npm run test:unit -- test/unit/models/index.test.ts`
- TypeScript compile checks pass: `npm run typecheck`

## Dependencies
- None (this is the foundation ticket)

## Estimated Scope
~150 lines of code + ~200 lines of tests

## Outcome
- Implemented exactly the planned new model module at `src/models/story-arc.ts` with all required types and utility functions.
- Updated `src/models/index.ts` to export all story-arc types and utilities.
- Added `test/unit/models/story-arc.test.ts` to cover all required utility behavior plus one extra edge case (`isLastBeatOfAct` on invalid act index).
- Minimally updated existing barrel coverage in `test/unit/models/index.test.ts` to assert the new barrel export.
- Validation result: targeted Jest file runs and `npm run typecheck` passed. A separate full-unit invocation showed one unrelated flaky failure in `test/unit/persistence/story-repository.test.ts`, outside this ticket’s scope.

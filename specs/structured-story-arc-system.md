# Specification: Structured Story Arc System

## Overview

This specification describes the implementation of a hierarchical story structure system that replaces the current simple `storyArc: string | null` with a proper 3-act structure containing acts and beats. The system will guide LLM storytelling through explicit narrative milestones while maintaining flexibility for player-driven branching.

## Current State Analysis

### What Exists Now
- `storyArc` is a nullable string on `Story` (`src/models/story.ts:14`)
- Generated during first page creation via opening prompt (`src/llm/prompts/opening-prompt.ts:28`)
- Passed as context to continuation prompts (`src/llm/prompts/continuation-prompt.ts:16-21`)
- No mechanism to track narrative progression
- No beat/milestone completion detection
- No act transitions

### Problems with Current Approach
1. **No structure**: Single string provides no hierarchical guidance
2. **No progression tracking**: No way to know where we are in the story
3. **No beat evaluation**: LLM cannot determine if milestones are fulfilled
4. **No adaptation hooks**: No mechanism to adjust structure based on deviations

---

## Design Decisions

### 1. Dedicated Structure Generation (Pre-First-Page)

**Decision**: Create a new prompt that runs BEFORE the opening page to generate the full story structure.

**Rationale**:
- Separates structure planning from narrative generation
- Allows the opening prompt to focus purely on storytelling within the structure
- Enables explicit structure review/approval in future
- Matches how DMs plan campaigns before first session

### 2. Three-Act Structure with Flexible Beats

**Decision**: Use a 3-act structure with 2-4 beats per act.

**Rationale**:
- 3 acts is the minimal dramatic structure (setup/confrontation/resolution)
- 2-4 beats per act provides enough granularity without over-constraining
- Beats represent narrative milestones, not rigid checkpoints
- Total of 6-12 beats across the story provides good pacing

### 3. Beat Completion Evaluation in Continuation Prompt

**Decision**: The continuation prompt will ask the LLM to evaluate whether the current beat's objective has been fulfilled.

**Rationale**:
- LLM can assess narrative fulfillment contextually
- Avoids needing a separate evaluation prompt (reduces API calls)
- Natural integration with narrative generation
- Beat resolution is captured when completion is detected

### 4. Page-Level Structure Progression (Branch-Isolated)

**Decision**: Structure progression (current act/beat indices, beat resolutions) is stored per-page, not globally on Story.

**Rationale**:
- Different branches may progress through the structure differently
- Some branches may conclude beats earlier or later than others
- Future structure re-writing will affect only downstream pages in that branch
- Follows the existing pattern of `accumulatedState`, `accumulatedInventory`, etc. on Page
- Maintains branch isolation - core invariant of the system

**Implementation**:
- Story stores the **initial structure definition** (acts, beats, their descriptions)
- Each Page stores its **accumulated structure progression** (which beats concluded, with what resolutions)
- On page generation, parent's progression is inherited and potentially advanced

### 5. No Backward Compatibility

**Decision**: Clean break from legacy string-based `storyArc`. No migration path.

**Rationale**:
- Prioritize clean, robust architecture over migration complexity
- Fix any breaking changes directly
- Simpler codebase without union types and conditional handling
- Faster implementation without backward-compat edge cases

---

## What Needs to Change/Be Implemented

### Phase 1: Data Models

#### 1.1 New File: `src/models/story-arc.ts`

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
  readonly beatProgressions: readonly BeatProgression[];  // All beat statuses for this branch
}

// Utilities
export function createEmptyAccumulatedStructureState(): AccumulatedStructureState;
export function getCurrentAct(structure: StoryStructure, state: AccumulatedStructureState): StoryAct | undefined;
export function getCurrentBeat(structure: StoryStructure, state: AccumulatedStructureState): StoryBeat | undefined;
export function getBeatProgression(state: AccumulatedStructureState, beatId: string): BeatProgression | undefined;
export function isLastBeatOfAct(structure: StoryStructure, state: AccumulatedStructureState): boolean;
export function isLastAct(structure: StoryStructure, state: AccumulatedStructureState): boolean;
```

#### 1.2 Update: `src/models/story.ts`

Replace `storyArc: string | null` with `structure: StoryStructure | null`:

```typescript
export interface Story {
  readonly id: StoryId;
  readonly title: string;
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  globalCanon: GlobalCanon;
  globalCharacterCanon: GlobalCharacterCanon;
  structure: StoryStructure | null;  // CHANGED: was storyArc: string | null
  readonly createdAt: Date;
  updatedAt: Date;
}
```

Update:
- `createStory()` to initialize `structure: null`
- `isStory()` type guard to validate `structure` field
- Remove `updateStoryArc()` function
- Add `updateStoryStructure(story: Story, structure: StoryStructure): Story` function

#### 1.3 Update: `src/models/page.ts`

Add accumulated structure state to Page (follows existing pattern):

```typescript
export interface Page {
  // ... existing fields ...
  readonly accumulatedStructureState: AccumulatedStructureState;  // NEW
}

export interface CreatePageData {
  // ... existing fields ...
  parentAccumulatedStructureState?: AccumulatedStructureState;  // NEW
}
```

Update `createPage()` to:
- Accept `parentAccumulatedStructureState`
- Initialize `accumulatedStructureState` from parent (or empty for page 1)

---

### Phase 2: Structure Generation Prompt

#### 2.1 New File: `src/llm/prompts/structure-prompt.ts`

Create a dedicated prompt for generating the story structure:

```typescript
export interface StructureContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
}

export function buildStructurePrompt(
  context: StructureContext,
  options?: PromptOptions,
): ChatMessage[];
```

The prompt should:
- Request a 3-act structure with 2-4 beats per act
- Define act requirements (setup/confrontation/resolution pattern)
- Request specific fields: name, objective, stakes, entryCondition for acts
- Request description and objective for each beat
- Emphasize flexibility - beats are milestones, not rigid checkpoints
- Consider tone when determining stakes

#### 2.2 New File: `src/llm/schemas/structure-schema.ts`

JSON schema for structure generation output:

```typescript
export const STRUCTURE_GENERATION_SCHEMA: JsonSchema = {
  // Schema requiring:
  // - overallTheme: string
  // - acts: array of 3 acts, each with:
  //   - name, objective, stakes, entryCondition: strings
  //   - beats: array of 2-4 beats, each with description and objective
};
```

#### 2.3 New File: `src/llm/structure-generator.ts`

```typescript
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

export async function generateStoryStructure(
  context: StructureContext,
  apiKey: string,
): Promise<StructureGenerationResult>;
```

---

### Phase 3: Prompt Modifications

#### 3.1 Update: `src/llm/prompts/opening-prompt.ts`

Modify to accept pre-generated structure:

```typescript
export interface OpeningContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  structure?: StoryStructure;  // NEW - replaces nothing, structure wasn't passed before
}
```

When `structure` is present:
- Display current act name, objective, and stakes (Act 1)
- Display current beat description and objective (Beat 1.1)
- Instruct LLM to work toward the beat's objective
- Remove instruction to "determine the story arc" (already done)

Remove from the schema:
- The `storyArc` field (no longer generated during opening)

#### 3.2 Update: `src/llm/prompts/continuation-prompt.ts`

Major changes to display structure and evaluate beat completion:

Update `ContinuationContext`:
```typescript
export interface ContinuationContext {
  // ... existing fields, but REMOVE storyArc ...
  structure?: StoryStructure;                      // NEW
  accumulatedStructureState?: AccumulatedStructureState;  // NEW
}
```

When `structure` and `accumulatedStructureState` are present, build a detailed structure section:
```
STORY STRUCTURE:
Overall Theme: [theme]

=== CURRENT ACT: [act name] ===
Objective: [act objective]
Stakes: [act stakes]

Beats in this act:
  CONCLUDED: [beat 1 description] - Resolution: [how it was resolved]
  -> ACTIVE: [beat 2 description]
  o PENDING: [beat 3 description]

ACTIVE BEAT OBJECTIVE: [current beat objective]

Remaining Acts:
  - [Act 2 name]: [objective]
  - [Act 3 name]: [objective]

BEAT EVALUATION:
Determine if the current beat's objective has been achieved in this scene.
If yes, set beatConcluded: true and provide a beatResolution.
```

#### 3.3 Update: `src/llm/schemas/openrouter-schema.ts`

Remove `storyArc` field entirely.

Add beat progression fields:

```typescript
beatConcluded: {
  type: 'boolean',
  description: 'True if current beat objective was fulfilled in this scene',
},
beatResolution: {
  type: 'string',
  description: 'If beatConcluded is true, briefly describe how the beat was resolved',
},
```

Add `beatConcluded` and `beatResolution` to the `required` array.

#### 3.4 Update: `src/llm/schemas/validation-schema.ts`

Remove `storyArc` validation.

Add Zod validation for new fields:

```typescript
beatConcluded: z.boolean().default(false),
beatResolution: z.string().default(''),
```

#### 3.5 Update: `src/llm/types.ts`

Update `GenerationResult`:

```typescript
export interface GenerationResult {
  // ... existing fields, REMOVE storyArc ...
  beatConcluded: boolean;   // NEW
  beatResolution: string;   // NEW
}
```

Update `ContinuationContext`:

```typescript
export interface ContinuationContext {
  // ... existing fields, REMOVE storyArc ...
  structure?: StoryStructure;                      // NEW
  accumulatedStructureState?: AccumulatedStructureState;  // NEW
}
```

Update `OpeningContext`:

```typescript
export interface OpeningContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  structure?: StoryStructure;  // NEW
}
```

---

### Phase 4: Engine Integration

#### 4.1 New File: `src/engine/structure-manager.ts`

```typescript
export interface StructureProgressionResult {
  updatedState: AccumulatedStructureState;
  actAdvanced: boolean;
  beatAdvanced: boolean;
  isComplete: boolean;  // All acts/beats concluded
}

/**
 * Creates StoryStructure from raw generation result.
 * Assigns hierarchical IDs to beats.
 */
export function createStoryStructure(
  result: StructureGenerationResult,
): StoryStructure;

/**
 * Creates initial AccumulatedStructureState for first page.
 * Sets first beat of first act as 'active', all others 'pending'.
 */
export function createInitialStructureState(
  structure: StoryStructure,
): AccumulatedStructureState;

/**
 * Advances the structure state when a beat is concluded.
 * - Marks current beat as 'concluded' with resolution
 * - Advances to next beat (or next act if last beat)
 * - Marks new current beat as 'active'
 * Returns immutable updated state.
 */
export function advanceStructureState(
  structure: StoryStructure,
  currentState: AccumulatedStructureState,
  beatResolution: string,
): StructureProgressionResult;

/**
 * Applies structure state inheritance (parent -> child page).
 * If beatConcluded, advances the state.
 */
export function applyStructureProgression(
  structure: StoryStructure,
  parentState: AccumulatedStructureState,
  beatConcluded: boolean,
  beatResolution: string,
): AccumulatedStructureState;
```

#### 4.2 Update: `src/engine/story-service.ts`

Modify `startNewStory()` to:
1. Create story with `structure: null`
2. **NEW**: Call `generateStoryStructure()`
3. **NEW**: Call `createStoryStructure()` to transform result
4. **NEW**: Update story with `structure`
5. Generate first page (with structure context)
6. Return story and page

#### 4.3 Update: `src/engine/page-service.ts`

Modify `generateFirstPage()`:
- Pass `story.structure` to `generateOpeningPage()` context
- Create initial `AccumulatedStructureState` using `createInitialStructureState()`
- Pass to `createPage()` as `parentAccumulatedStructureState` equivalent

Modify `generateNextPage()`:
- Get parent's `accumulatedStructureState`
- Pass `story.structure` and parent's state to continuation context
- After generation, apply structure progression based on `result.beatConcluded`
- Use `applyStructureProgression()` to compute new state
- Pass new state to `createPage()`

Remove:
- All `storyArc` handling (reading, updating, passing)
- `updateStoryArc()` calls

---

### Phase 5: Persistence

#### 5.1 Update: `src/persistence/story-repository.ts`

Replace `storyArc: string | null` with `structure`:

```typescript
interface StoryFileData {
  // ... existing fields, REMOVE storyArc ...
  structure: StoryStructureFileData | null;  // NEW
}

interface StoryStructureFileData {
  acts: Array<{
    id: string;
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      id: string;
      description: string;
      objective: string;
    }>;
  }>;
  overallTheme: string;
  generatedAt: string;  // ISO date string
}
```

Add serialization/deserialization functions:
- `structureToFileData(structure: StoryStructure): StoryStructureFileData`
- `fileDataToStructure(data: StoryStructureFileData): StoryStructure`

Update `storyToFileData()` and `fileDataToStory()` to handle `structure`.

#### 5.2 Update: `src/persistence/page-repository.ts`

Add accumulated structure state to page persistence:

```typescript
interface PageFileData {
  // ... existing fields ...
  accumulatedStructureState: AccumulatedStructureStateFileData;  // NEW
}

interface AccumulatedStructureStateFileData {
  currentActIndex: number;
  currentBeatIndex: number;
  beatProgressions: Array<{
    beatId: string;
    status: string;
    resolution?: string;
  }>;
}
```

Add serialization/deserialization for structure state.

---

### Phase 6: Few-Shot Examples

#### 6.1 Update: `src/llm/examples.ts`

Remove all `storyArc` references from existing examples.

Add few-shot examples for:
- Structure generation (new example set)
- Opening with structure context
- Continuation with beat evaluation (including `beatConcluded`, `beatResolution` in output)

---

## Invariants That Must Pass

### Structural Invariants

```typescript
// INV-1: Index bounds (in AccumulatedStructureState relative to StoryStructure)
state.currentActIndex >= 0 && state.currentActIndex < structure.acts.length

// INV-2: Beat index bounds within current act
state.currentBeatIndex >= 0 &&
state.currentBeatIndex < structure.acts[state.currentActIndex].beats.length

// INV-3: Beat progression status consistency
// For each beat in the structure, its progression status must be:
// - 'concluded' if before current position
// - 'active' if at current position
// - 'pending' if after current position
structure.acts.forEach((act, actIdx) => {
  act.beats.forEach((beat, beatIdx) => {
    const progression = state.beatProgressions.find(p => p.beatId === beat.id);
    if (actIdx < state.currentActIndex ||
        (actIdx === state.currentActIndex && beatIdx < state.currentBeatIndex)) {
      assert(progression?.status === 'concluded');
    } else if (actIdx === state.currentActIndex && beatIdx === state.currentBeatIndex) {
      assert(progression?.status === 'active');
    } else {
      assert(progression?.status === 'pending' || progression === undefined);
    }
  });
});

// INV-4: Concluded beats must have resolution
state.beatProgressions.forEach(progression => {
  if (progression.status === 'concluded') {
    assert(progression.resolution !== undefined && progression.resolution.length > 0);
  }
});

// INV-5: Minimum beats per act
structure.acts.forEach(act => {
  assert(act.beats.length >= 2 && act.beats.length <= 4);
});

// INV-6: Exactly 3 acts
assert(structure.acts.length === 3);

// INV-7: Unique beat IDs
const allBeatIds = structure.acts.flatMap(act => act.beats.map(b => b.id));
assert(new Set(allBeatIds).size === allBeatIds.length);

// INV-8: Beat progressions reference valid beat IDs
state.beatProgressions.forEach(progression => {
  assert(allBeatIds.includes(progression.beatId));
});
```

### Transition Rules

```typescript
// TR-1: Beat can only advance when LLM sets beatConcluded = true
// TR-2: Beat can only advance when beatResolution is non-empty
// TR-3: Act advances only when last beat of current act is concluded
// TR-4: Story structure is complete when last beat of last act is concluded
```

### Page Inheritance Rules

```typescript
// PI-1: Page 1's accumulatedStructureState is the initial state from createInitialStructureState()
// PI-2: Subsequent pages inherit parent's accumulatedStructureState
// PI-3: If beatConcluded, the inherited state is advanced before storing
// PI-4: Different branches can have different structure states (branch isolation)
```

---

## Tests That Should Pass

### Unit Tests: `test/unit/models/story-arc.test.ts`

```typescript
describe('StoryArc', () => {
  describe('createEmptyAccumulatedStructureState', () => {
    it('creates state with indices at 0');
    it('creates state with empty beatProgressions');
  });

  describe('getCurrentAct', () => {
    it('returns correct act by index');
    it('returns undefined when index out of bounds');
  });

  describe('getCurrentBeat', () => {
    it('returns correct beat by indices');
    it('returns undefined when indices out of bounds');
  });

  describe('getBeatProgression', () => {
    it('returns progression for existing beatId');
    it('returns undefined for unknown beatId');
  });

  describe('isLastBeatOfAct', () => {
    it('returns true on final beat of act');
    it('returns false on non-final beat');
  });

  describe('isLastAct', () => {
    it('returns true on act index 2');
    it('returns false on act indices 0 and 1');
  });
});
```

### Unit Tests: `test/unit/engine/structure-manager.test.ts`

```typescript
describe('structure-manager', () => {
  describe('createStoryStructure', () => {
    it('creates structure from generation result');
    it('assigns hierarchical IDs to beats (1.1, 1.2, 2.1, etc.)');
    it('preserves all act and beat fields');
    it('sets generatedAt to current date');
  });

  describe('createInitialStructureState', () => {
    it('sets currentActIndex to 0');
    it('sets currentBeatIndex to 0');
    it('creates beatProgressions for all beats');
    it('sets first beat as active');
    it('sets all other beats as pending');
  });

  describe('advanceStructureState', () => {
    it('advances to next beat within same act');
    it('marks concluded beat with resolution in beatProgressions');
    it('marks new current beat as active');
    it('advances to next act when last beat concludes');
    it('resets beat index to 0 on act transition');
    it('marks story complete when last beat of last act concludes');
    it('returns isComplete: true at end of story');
    it('preserves immutability - does not modify input');
  });

  describe('applyStructureProgression', () => {
    it('returns parent state unchanged when beatConcluded is false');
    it('advances state when beatConcluded is true');
    it('includes resolution in advanced state');
  });
});
```

### Unit Tests: `test/unit/llm/prompts.test.ts` (modifications)

```typescript
describe('buildStructurePrompt', () => {
  it('includes character concept');
  it('includes worldbuilding when provided');
  it('includes tone');
  it('requests 3-act structure');
  it('requests 2-4 beats per act');
});

describe('buildOpeningPrompt with structure', () => {
  it('includes structure section when structure provided');
  it('shows current act name and objective');
  it('shows current beat objective');
  it('omits structure section when no structure');
  it('does NOT request storyArc generation');
});

describe('buildContinuationPrompt with structure', () => {
  it('includes detailed structure section when structure provided');
  it('shows beat statuses from accumulatedStructureState');
  it('shows beat resolutions for concluded beats');
  it('includes beat evaluation instructions');
  it('shows remaining acts overview');
  it('does NOT include storyArc section');
});
```

### Unit Tests: `test/unit/llm/schemas.test.ts` (modifications)

```typescript
describe('structure schema validation', () => {
  it('validates correct structure generation output');
  it('rejects structure with fewer than 3 acts');
  it('rejects acts with fewer than 2 beats');
  it('rejects acts with more than 4 beats');
  it('requires all act fields present');
  it('requires all beat fields present');
});

describe('generation schema', () => {
  it('does NOT include storyArc field');
  it('includes beatConcluded in output');
  it('includes beatResolution in output');
  it('defaults beatConcluded to false when missing');
  it('defaults beatResolution to empty string when missing');
});
```

### Unit Tests: `test/unit/models/page.test.ts` (modifications)

```typescript
describe('createPage with structure state', () => {
  it('includes accumulatedStructureState in created page');
  it('uses empty structure state for page 1 when not provided');
  it('inherits parent structure state when provided');
});
```

### Integration Tests: `test/integration/engine/structure-flow.test.ts`

```typescript
describe('Structure Generation Flow', () => {
  it('generates valid 3-act structure from context');
  it('structure has 2-4 beats per act');
  it('all acts have required fields');
  it('all beats have required fields');
});

describe('Story Creation with Structure', () => {
  it('creates story with structure after structure generation');
  it('first page has initial structure state');
  it('structure is persisted to story.json');
});

describe('Beat Progression Flow', () => {
  it('advances beat when LLM reports beatConcluded: true');
  it('stores beat resolution in page structure state');
  it('advances act when last beat of act concludes');
  it('child pages inherit advanced structure state');
});

describe('Branch Isolation', () => {
  it('different branches can have different structure progression');
  it('beat concluded in one branch does not affect other branches');
  it('structure state is independent per branch path');
});
```

### Integration Tests: `test/integration/persistence/story-structure.test.ts`

```typescript
describe('Story Structure Persistence', () => {
  it('saves structure to story.json');
  it('loads structure from story.json');
  it('preserves all structure fields through save/load cycle');
  it('handles stories with structure: null');
});

describe('Page Structure State Persistence', () => {
  it('saves accumulatedStructureState to page JSON');
  it('loads accumulatedStructureState from page JSON');
  it('preserves beat progressions through save/load');
  it('preserves current indices through save/load');
});
```

### E2E Tests: `test/e2e/structured-story-flow.test.ts`

```typescript
describe('Structured Story E2E', () => {
  it('complete flow: create story -> generate structure -> first page -> continuation with beat eval');
  it('beat advancement persists across page generations');
  it('act advancement works correctly');
  it('different choices create different structure progressions');
});
```

---

## Files to Create

1. `src/models/story-arc.ts` - New type definitions
2. `src/llm/prompts/structure-prompt.ts` - Structure generation prompt
3. `src/llm/schemas/structure-schema.ts` - JSON schema for structure output
4. `src/llm/structure-generator.ts` - Structure generation orchestration
5. `src/engine/structure-manager.ts` - Structure progression logic
6. `test/unit/models/story-arc.test.ts` - Unit tests for story arc types
7. `test/unit/engine/structure-manager.test.ts` - Unit tests for structure manager
8. `test/integration/engine/structure-flow.test.ts` - Integration tests
9. `test/integration/persistence/story-structure.test.ts` - Persistence tests
10. `test/e2e/structured-story-flow.test.ts` - E2E tests

## Files to Modify

1. `src/models/story.ts` - Replace storyArc with structure
2. `src/models/page.ts` - Add accumulatedStructureState
3. `src/models/index.ts` - Export new types
4. `src/llm/prompts/opening-prompt.ts` - Accept and display structure
5. `src/llm/prompts/continuation-prompt.ts` - Display structure state, request beat eval
6. `src/llm/schemas/openrouter-schema.ts` - Remove storyArc, add beatConcluded, beatResolution
7. `src/llm/schemas/validation-schema.ts` - Remove storyArc, add new field validation
8. `src/llm/schemas/response-transformer.ts` - Remove storyArc, transform new fields
9. `src/llm/types.ts` - Update GenerationResult, ContinuationContext, OpeningContext
10. `src/llm/examples.ts` - Remove storyArc, add structure examples
11. `src/engine/story-service.ts` - Integrate structure generation
12. `src/engine/page-service.ts` - Handle structure state progression
13. `src/persistence/story-repository.ts` - Serialize/deserialize structure
14. `src/persistence/page-repository.ts` - Serialize/deserialize structure state
15. `test/unit/llm/prompts.test.ts` - Update for structure, remove storyArc tests
16. `test/unit/engine/page-service.test.ts` - Update mocks, remove storyArc handling

---

## Future Extensibility Hooks

This design provides hooks for future enhancements:

### 1. Structure Re-Writing (Future)

When narrative deviates significantly in a branch:
- Detect deviation via dedicated evaluation prompt
- Generate modified remaining acts/beats for that branch only
- Store modified structure on affected pages (could extend Page to hold structure overrides)
- Downstream pages in that branch inherit the rewritten structure

### 2. Dynamic Stakes Adjustment (Future)
- Allow act stakes to be modified based on narrative events
- Track stake escalation/de-escalation per branch

### 3. Milestone Events (Future)
- Trigger special events when specific beats conclude
- Support achievements, unlockables, etc.

### 4. Structure Visualization (Future)
- UI to show current position in structure
- Visual display of which beats are concluded/active/pending

---

## Implementation Order

1. **Data Models** (Phase 1) - Foundation types for structure and state
2. **Structure Manager** (Phase 4.1) - Core logic before prompts
3. **Structure Prompt & Schema** (Phase 2) - Generation capability
4. **Prompt Modifications** (Phase 3) - Display and evaluation
5. **Engine Integration** (Phase 4.2-4.3) - Wire it together
6. **Persistence** (Phase 5) - Save/load
7. **Few-Shot Examples** (Phase 6) - Improve LLM performance
8. **Tests** - Throughout, following TDD where practical

---

## Breaking Changes Summary

These changes will break existing functionality that must be fixed:

1. **Story model**: `storyArc` field removed, replaced with `structure`
2. **Page model**: New required field `accumulatedStructureState`
3. **GenerationResult**: `storyArc` removed, `beatConcluded`/`beatResolution` added
4. **ContinuationContext**: `storyArc` removed, `structure`/`accumulatedStructureState` added
5. **OpeningContext**: `structure` field added
6. **Opening schema**: `storyArc` output removed
7. **All test mocks**: Must be updated to include new fields, remove storyArc
8. **Existing stories**: Will not load (structure field missing) - acceptable, clean break
9. **Existing pages**: Will not load (accumulatedStructureState missing) - acceptable

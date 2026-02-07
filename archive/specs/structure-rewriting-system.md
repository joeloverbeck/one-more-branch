# Structure Rewriting System Specification

## Overview

### Problem Statement

The current story arc system generates a complete 3-act structure upfront with 2-4 beats per act. However, player choices can cause narrative drift that invalidates remaining beats. When the LLM detects that future beats no longer make sense given the current narrative state, the system needs to regenerate the remaining story structure while preserving completed beats.

**Example scenario:**
- Act 2, Beat 2.1: "Protagonist infiltrates the enemy fortress"
- Player choice: "Betray the resistance and join the enemy"
- Act 2, Beat 2.2: "Rescue captured allies from fortress dungeon" ← **Now invalid**
- All remaining beats in Act 2 and Act 3 need regeneration

### Goals

1. **Detect beat deviation** when LLM determines remaining beats are invalidated by narrative state
2. **Preserve completed beats** with their resolutions intact
3. **Regenerate remaining structure** (current act's remaining beats + all subsequent acts)
4. **Maintain narrative coherence** by incorporating current narrative state into regeneration
5. **Keep branch isolation** - structure changes only affect downstream pages in current branch

### Non-Goals

- Backward compatibility with old structure format (clean architecture prioritized)
- Undo/revert structure changes
- Manual user-triggered structure rewrites
- Partial beat regeneration (always regenerate from current point forward)

---

## Design Decisions

### D1: Deviation Detection Location

**Decision:** LLM detects deviation during page generation, not as a separate analysis step.

**Rationale:**
- LLM already evaluates beat progression in continuation prompts
- Adding deviation detection to existing evaluation avoids extra API calls
- LLM has full narrative context when making the determination
- Natural extension of existing `beatConcluded` evaluation

**Alternatives Considered:**
- Separate deviation analysis step → Rejected (extra latency, redundant context)
- Rule-based deviation detection → Rejected (can't capture narrative nuance)

### D2: Regeneration Scope

**Decision:** On deviation, regenerate all remaining beats in current act + all beats in subsequent acts.

**Rationale:**
- Clean break point for narrative coherence
- Preserves all completed work (concluded beats retain resolutions)
- Simpler than surgical beat-by-beat regeneration
- Aligns with three-act structure semantics (acts are major story phases)

**Alternatives Considered:**
- Regenerate only invalidated beats → Rejected (hard to determine cascade effects)
- Regenerate entire structure → Rejected (loses completed narrative beats)

### D3: Structure Storage Model

**Decision:** Store structure rewrite history as separate versions, with pages referencing specific structure version.

**Rationale:**
- Enables deterministic replay (same structure version = same content)
- Maintains branch isolation (different branches can have different structure versions)
- Supports investigation of structure evolution for debugging
- Immutable structure versions align with immutable page design

**Alternatives Considered:**
- Mutate structure in place → Rejected (breaks replay determinism)
- Store only latest structure → Rejected (breaks branch isolation)

### D4: Deviation Signal Format

**Decision:** LLM returns structured deviation signal with reason and invalidated beat IDs.

**Rationale:**
- Explicit signal prevents ambiguity in parsing
- Reason aids debugging and future analysis
- Beat IDs enable precise preservation of completed beats
- Aligns with existing structured output patterns (NARRATIVE/CHOICES/etc.)

---

## Architecture

### New Files

```
src/
├── engine/
│   └── structure-rewriter.ts       # Core rewriting orchestration
├── llm/
│   ├── deviation-detector.ts       # Deviation detection result handling
│   └── prompts/
│       └── structure-rewrite-prompt.ts  # Prompt for structure regeneration
└── models/
    └── structure-version.ts        # Structure versioning types
```

### Modified Files

```
src/
├── models/
│   ├── story.ts                    # Add structureVersions array
│   └── story-arc.ts                # Add deviation-related types
├── llm/
│   ├── types.ts                    # Add deviation result types
│   ├── prompts/
│   │   └── continuation-prompt.ts  # Add deviation detection section
│   └── continuation-generator.ts   # Handle deviation in response
├── engine/
│   ├── page-service.ts             # Integrate rewriting flow
│   └── structure-manager.ts        # Add version management
└── persistence/
    └── story-repository.ts         # Persist structure versions
```

---

## New Interfaces and Types

### Core Types (`src/models/structure-version.ts`)

```typescript
/**
 * Unique identifier for a structure version.
 * Format: "sv-{timestamp}-{random}" (e.g., "sv-1707321600000-a1b2")
 */
export type StructureVersionId = string & { readonly __brand: 'StructureVersionId' };

/**
 * A versioned story structure that tracks its lineage.
 * Structures are immutable once created.
 */
export interface VersionedStoryStructure {
  /** Unique identifier for this structure version */
  readonly id: StructureVersionId;

  /** The actual story structure (acts, beats, theme) */
  readonly structure: StoryStructure;

  /** ID of the previous structure version, null for initial */
  readonly previousVersionId: StructureVersionId | null;

  /** Page ID where this structure was created (null for initial) */
  readonly createdAtPageId: PageId | null;

  /** Reason for structure rewrite, null for initial */
  readonly rewriteReason: string | null;

  /** Beat IDs that were preserved from previous version */
  readonly preservedBeatIds: readonly string[];

  /** Timestamp of version creation */
  readonly createdAt: Date;
}

/**
 * Creates a new structure version ID.
 */
export function createStructureVersionId(): StructureVersionId;

/**
 * Creates the initial versioned structure from a generated structure.
 */
export function createInitialVersionedStructure(
  structure: StoryStructure
): VersionedStoryStructure;

/**
 * Creates a rewritten versioned structure preserving completed beats.
 */
export function createRewrittenVersionedStructure(
  previousVersion: VersionedStoryStructure,
  newStructure: StoryStructure,
  preservedBeatIds: readonly string[],
  rewriteReason: string,
  createdAtPageId: PageId
): VersionedStoryStructure;
```

### Deviation Detection Types (`src/models/story-arc.ts` additions)

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
```

### LLM Types (`src/llm/types.ts` additions)

```typescript
/**
 * Extended generation result including deviation detection.
 */
export interface ContinuationGenerationResult {
  // Existing fields
  readonly narrative: string;
  readonly choices: readonly string[];
  readonly stateChanges: readonly string[];
  readonly canonFacts: readonly string[];
  readonly characterCanonFacts: Readonly<Record<string, readonly string[]>>;
  readonly inventoryChanges: readonly string[];
  readonly healthChanges: readonly string[];
  readonly characterStateChanges: Readonly<Record<string, readonly string[]>>;
  readonly isEnding: boolean;
  readonly beatConcluded: boolean;
  readonly beatResolution: string;
  readonly rawResponse: string;

  // New field for deviation
  readonly deviation: DeviationResult;
}

/**
 * Context for structure regeneration.
 */
export interface StructureRewriteContext {
  /** Original character concept */
  readonly characterConcept: string;

  /** Original worldbuilding */
  readonly worldbuilding: string;

  /** Original tone */
  readonly tone: string;

  /** Completed beats with their resolutions */
  readonly completedBeats: readonly CompletedBeat[];

  /** Current narrative state summary */
  readonly narrativeSummary: string;

  /** Current act index where deviation occurred */
  readonly currentActIndex: number;

  /** Current beat index where deviation occurred */
  readonly currentBeatIndex: number;

  /** Reason for the rewrite */
  readonly deviationReason: string;

  /** Overall theme from original structure (to maintain thematic coherence) */
  readonly originalTheme: string;
}

/**
 * A completed beat with its resolution for context.
 */
export interface CompletedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly description: string;
  readonly objective: string;
  readonly resolution: string;
}

/**
 * Result of structure regeneration.
 */
export interface StructureRewriteResult {
  /** The regenerated structure (includes preserved + new beats) */
  readonly structure: StoryStructure;

  /** Beat IDs that were preserved from original */
  readonly preservedBeatIds: readonly string[];

  /** Raw LLM response for debugging */
  readonly rawResponse: string;
}
```

### Story Model Updates (`src/models/story.ts` modifications)

```typescript
/**
 * Story with versioned structure support.
 */
export interface Story {
  readonly id: StoryId;
  readonly title: string;
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  readonly globalCanon: readonly string[];
  readonly globalCharacterCanon: Readonly<Record<string, readonly string[]>>;

  /**
   * Current structure (convenience accessor).
   * @deprecated Use structureVersions for full version history.
   */
  structure: StoryStructure | null;

  /**
   * All structure versions, ordered by creation time.
   * Index 0 is the initial structure.
   */
  readonly structureVersions: readonly VersionedStoryStructure[];

  readonly createdAt: Date;
  updatedAt: Date;
}

/**
 * Gets the latest structure version.
 */
export function getLatestStructureVersion(
  story: Story
): VersionedStoryStructure | null;

/**
 * Gets a specific structure version by ID.
 */
export function getStructureVersion(
  story: Story,
  versionId: StructureVersionId
): VersionedStoryStructure | null;
```

### Page Model Updates (`src/models/page.ts` modifications)

```typescript
/**
 * Page with structure version reference.
 */
export interface Page {
  readonly id: PageId;
  readonly narrativeText: string;
  readonly choices: Choice[];
  readonly stateChanges: readonly string[];
  readonly inventoryChanges: readonly string[];
  readonly healthChanges: readonly string[];
  readonly characterStateChanges: Readonly<Record<string, readonly string[]>>;
  readonly canonFacts: readonly string[];
  readonly characterCanonFacts: Readonly<Record<string, readonly string[]>>;
  readonly accumulatedState: readonly string[];
  readonly accumulatedInventory: readonly string[];
  readonly accumulatedHealth: readonly string[];
  readonly accumulatedCharacterState: Readonly<Record<string, readonly string[]>>;
  readonly accumulatedStructureState: AccumulatedStructureState;

  /**
   * Structure version ID this page was generated with.
   * Enables deterministic replay with correct structure.
   */
  readonly structureVersionId: StructureVersionId | null;

  readonly isEnding: boolean;
  readonly parentPageId: PageId | null;
  readonly parentChoiceIndex: number | null;
}
```

### Structure Manager Updates (`src/engine/structure-manager.ts` additions)

```typescript
/**
 * Result of applying structure progression, possibly with rewrite.
 */
export interface StructureProgressionResult {
  /** Updated structure state */
  readonly newState: AccumulatedStructureState;

  /** True if structure was completed (story ending) */
  readonly isComplete: boolean;

  /** New structure version if rewritten, null otherwise */
  readonly newStructureVersion: VersionedStoryStructure | null;
}

/**
 * Applies structure progression, handling deviation if detected.
 */
export function applyStructureProgressionWithDeviation(
  currentState: AccumulatedStructureState,
  structureVersion: VersionedStoryStructure,
  beatConcluded: boolean,
  beatResolution: string,
  deviation: DeviationResult,
  pageId: PageId,
  rewriteContext: StructureRewriteContext | null
): Promise<StructureProgressionResult>;
```

### Structure Rewriter (`src/engine/structure-rewriter.ts`)

```typescript
/**
 * Orchestrates structure rewriting when deviation is detected.
 */
export interface StructureRewriter {
  /**
   * Rewrites the story structure from the current point forward.
   *
   * @param context - Context for regeneration including completed beats
   * @param apiKey - OpenRouter API key
   * @returns Regenerated structure with preserved beats
   */
  rewriteStructure(
    context: StructureRewriteContext,
    apiKey: string
  ): Promise<StructureRewriteResult>;
}

/**
 * Creates a structure rewriter instance.
 */
export function createStructureRewriter(
  llmClient: LLMClient
): StructureRewriter;

/**
 * Builds rewrite context from current state.
 */
export function buildRewriteContext(
  story: Story,
  structureVersion: VersionedStoryStructure,
  structureState: AccumulatedStructureState,
  deviation: BeatDeviation
): StructureRewriteContext;

/**
 * Extracts completed beats from structure state for preservation.
 */
export function extractCompletedBeats(
  structure: StoryStructure,
  structureState: AccumulatedStructureState
): readonly CompletedBeat[];

/**
 * Merges preserved beats with regenerated structure.
 */
export function mergePreservedWithRegenerated(
  preservedBeats: readonly CompletedBeat[],
  regeneratedStructure: StoryStructure,
  originalTheme: string
): StoryStructure;
```

---

## Continuation Prompt Updates

### New Section in Continuation Prompt

Add after existing beat evaluation section in `src/llm/prompts/continuation-prompt.ts`:

```typescript
const DEVIATION_DETECTION_SECTION = `
## BEAT DEVIATION EVALUATION

After writing your narrative, evaluate whether the story has deviated from the remaining planned beats.

A deviation occurs when:
- Player choices have fundamentally changed the story direction
- Key assumptions in future beats are now invalid
- The protagonist's goals or circumstances have shifted dramatically
- Story elements required for future beats no longer exist or make sense

Evaluate ONLY the beats that have NOT been concluded. Do not re-evaluate completed beats.

If deviation detected:
DEVIATION: YES
DEVIATION_REASON: [Clear explanation of why remaining beats are invalidated]
INVALIDATED_BEATS: [Comma-separated list of beat IDs that are now invalid, e.g., "2.2, 2.3, 3.1, 3.2, 3.3"]
NARRATIVE_SUMMARY: [Current story state summary for structure regeneration]

If no deviation:
DEVIATION: NO
`;
```

### Updated Response Format

```typescript
const RESPONSE_FORMAT = `
## RESPONSE FORMAT

NARRATIVE:
[Your narrative text here]

CHOICES:
1. [First choice]
2. [Second choice]
[etc.]

STATE_CHANGES:
- [State change 1]
- [State change 2]

CANON_FACTS:
- [Canon fact 1]

CHARACTER_CANON_FACTS:
[Character Name]:
- [Fact about character]

INVENTORY_CHANGES:
+ [Item gained]
- [Item lost]

HEALTH_CHANGES:
[Health change description]

CHARACTER_STATE_CHANGES:
[Character Name]:
- [State change]

BEAT_CONCLUDED: [YES/NO]
BEAT_RESOLUTION: [Resolution text if concluded, empty if not]

DEVIATION: [YES/NO]
DEVIATION_REASON: [Reason if YES, empty if NO]
INVALIDATED_BEATS: [Beat IDs if YES, empty if NO]
NARRATIVE_SUMMARY: [Summary if YES, empty if NO]

IS_ENDING: [YES/NO]
`;
```

---

## Structure Rewrite Prompt

New file: `src/llm/prompts/structure-rewrite-prompt.ts`

```typescript
export function buildStructureRewritePrompt(
  context: StructureRewriteContext
): string {
  const completedBeatsSection = context.completedBeats
    .map(beat => `  - Act ${beat.actIndex + 1}, Beat ${beat.beatIndex + 1}: "${beat.description}"
    Objective: ${beat.objective}
    Resolution: ${beat.resolution}`)
    .join('\n');

  return `
# STORY STRUCTURE REGENERATION

You are regenerating the story structure for an interactive branching narrative. The story has deviated from its original plan and needs new beats to guide future narrative.

## STORY CONTEXT

Character: ${context.characterConcept}
World: ${context.worldbuilding}
Tone: ${context.tone}
Original Theme: ${context.originalTheme}

## WHAT HAS ALREADY HAPPENED

The following beats have been completed and MUST be preserved (their resolutions are canon):

${completedBeatsSection}

## CURRENT SITUATION

Deviation occurred at: Act ${context.currentActIndex + 1}, Beat ${context.currentBeatIndex + 1}
Reason for deviation: ${context.deviationReason}
Current narrative state: ${context.narrativeSummary}

## YOUR TASK

Generate NEW beats to replace the invalidated ones:
1. If currently in Act 1 or 2: Generate remaining beats for current act + ALL beats for subsequent acts
2. If in Act 3: Generate remaining beats for Act 3 only

Requirements:
- Maintain the original theme: "${context.originalTheme}"
- Build naturally from the current narrative state
- Follow three-act structure principles
- Each act should have 2-4 beats
- Beats should be flexible milestones, not rigid gates
- Account for branching narrative possibilities

## OUTPUT FORMAT

Provide your response in this exact format:

REGENERATED_ACTS:

ACT_${context.currentActIndex + 1}:
NAME: [Evocative act name]
OBJECTIVE: [Main goal for protagonists in this act]
STAKES: [What happens if they fail]
ENTRY_CONDITION: [Already met - we're in this act]

BEATS:
- DESCRIPTION: [What should happen]
  OBJECTIVE: [Specific goal for protagonist]
- DESCRIPTION: [What should happen]
  OBJECTIVE: [Specific goal for protagonist]

[Continue with ACT_${context.currentActIndex + 2} and ACT_3 if applicable]

THEME_EVOLUTION: [How the theme evolves given the new direction]
`;
}
```

---

## Invariants

### I1: Completed Beats Are Never Modified

```typescript
// After structure rewrite, all concluded beats retain exact resolutions
function invariant_completedBeatsPreserved(
  originalState: AccumulatedStructureState,
  originalStructure: StoryStructure,
  newStructure: StoryStructure
): boolean {
  const concludedBeats = originalState.beatProgressions.filter(
    bp => bp.status === 'concluded'
  );

  for (const concluded of concludedBeats) {
    const [actIdx, beatIdx] = concluded.beatId.split('.').map(Number);
    const originalBeat = originalStructure.acts[actIdx - 1]?.beats[beatIdx - 1];
    const newBeat = newStructure.acts[actIdx - 1]?.beats[beatIdx - 1];

    // Beat must exist in new structure with same content
    if (!newBeat) return false;
    if (newBeat.description !== originalBeat.description) return false;
    if (newBeat.objective !== originalBeat.objective) return false;
  }

  return true;
}
```

### I2: Structure Versions Form a Linear Chain

```typescript
// Each version (except initial) points to valid previous version
function invariant_versionChainIntegrity(
  story: Story
): boolean {
  const versions = story.structureVersions;

  if (versions.length === 0) return true;

  // First version has no previous
  if (versions[0].previousVersionId !== null) return false;

  // Each subsequent version points to previous
  for (let i = 1; i < versions.length; i++) {
    if (versions[i].previousVersionId !== versions[i - 1].id) return false;
  }

  return true;
}
```

### I3: Page Structure Version Exists

```typescript
// Every page references a valid structure version
function invariant_pageStructureVersionExists(
  story: Story,
  page: Page
): boolean {
  if (page.structureVersionId === null) {
    // Allowed only if story has no structure
    return story.structureVersions.length === 0;
  }

  return story.structureVersions.some(
    v => v.id === page.structureVersionId
  );
}
```

### I4: Deviation Only Detected for Pending/Active Beats

```typescript
// Invalidated beats are never concluded beats
function invariant_deviationTargetsPendingBeats(
  deviation: BeatDeviation,
  structureState: AccumulatedStructureState
): boolean {
  const concludedIds = new Set(
    structureState.beatProgressions
      .filter(bp => bp.status === 'concluded')
      .map(bp => bp.beatId)
  );

  return deviation.invalidatedBeatIds.every(
    id => !concludedIds.has(id)
  );
}
```

### I5: Three-Act Structure Maintained

```typescript
// Rewritten structure always has exactly 3 acts
function invariant_threeActStructure(
  structure: StoryStructure
): boolean {
  return structure.acts.length === 3;
}
```

### I6: Beat Count Per Act

```typescript
// Each act has 2-4 beats
function invariant_beatCountPerAct(
  structure: StoryStructure
): boolean {
  return structure.acts.every(
    act => act.beats.length >= 2 && act.beats.length <= 4
  );
}
```

### I7: Hierarchical Beat IDs

```typescript
// Beat IDs follow "{actNumber}.{beatNumber}" format
function invariant_hierarchicalBeatIds(
  structure: StoryStructure
): boolean {
  return structure.acts.every((act, actIdx) =>
    act.beats.every((beat, beatIdx) =>
      beat.id === `${actIdx + 1}.${beatIdx + 1}`
    )
  );
}
```

### I8: Immutable Structure Versions

```typescript
// Structure version content never changes after creation
// (Enforced by readonly types and no mutation methods)
```

---

## Tests

### Unit Tests (`test/unit/`)

#### Structure Versioning (`test/unit/models/structure-version.test.ts`)

```typescript
describe('StructureVersion', () => {
  describe('createStructureVersionId', () => {
    it('should generate unique IDs');
    it('should follow sv-{timestamp}-{random} format');
  });

  describe('createInitialVersionedStructure', () => {
    it('should set previousVersionId to null');
    it('should set createdAtPageId to null');
    it('should set rewriteReason to null');
    it('should set preservedBeatIds to empty array');
    it('should copy structure immutably');
  });

  describe('createRewrittenVersionedStructure', () => {
    it('should set previousVersionId to previous version');
    it('should set createdAtPageId to triggering page');
    it('should set rewriteReason');
    it('should record preservedBeatIds');
    it('should generate new unique ID');
  });
});
```

#### Deviation Detection (`test/unit/models/story-arc.test.ts`)

```typescript
describe('DeviationResult', () => {
  describe('isDeviation', () => {
    it('should return true for BeatDeviation');
    it('should return false for NoDeviation');
  });
});
```

#### Structure Rewriter (`test/unit/engine/structure-rewriter.test.ts`)

```typescript
describe('StructureRewriter', () => {
  describe('extractCompletedBeats', () => {
    it('should return empty array when no beats concluded');
    it('should return all concluded beats with resolutions');
    it('should preserve beat order');
    it('should include act and beat indices');
  });

  describe('buildRewriteContext', () => {
    it('should include all completed beats');
    it('should include deviation reason');
    it('should include narrative summary');
    it('should include original theme');
  });

  describe('mergePreservedWithRegenerated', () => {
    it('should keep preserved beats unchanged');
    it('should append regenerated beats after preserved');
    it('should maintain hierarchical beat IDs');
    it('should preserve original theme');
  });

  describe('rewriteStructure', () => {
    it('should call LLM with correct prompt');
    it('should parse regenerated structure correctly');
    it('should preserve completed beats');
    it('should maintain three-act structure');
  });
});
```

#### Structure Manager Updates (`test/unit/engine/structure-manager.test.ts`)

```typescript
describe('applyStructureProgressionWithDeviation', () => {
  describe('when no deviation detected', () => {
    it('should behave like existing applyStructureProgression');
    it('should return null newStructureVersion');
  });

  describe('when deviation detected', () => {
    it('should trigger structure rewrite');
    it('should return new structure version');
    it('should preserve concluded beats');
    it('should update structure state for new structure');
  });
});
```

#### Response Parsing (`test/unit/llm/continuation-generator.test.ts`)

```typescript
describe('parseContinuationResponse', () => {
  describe('deviation parsing', () => {
    it('should parse DEVIATION: YES with all fields');
    it('should parse DEVIATION: NO as NoDeviation');
    it('should handle missing DEVIATION section as no deviation');
    it('should parse comma-separated INVALIDATED_BEATS');
    it('should handle malformed deviation section gracefully');
  });
});
```

### Integration Tests (`test/integration/`)

#### Structure Rewriting Flow (`test/integration/structure-rewriting.test.ts`)

```typescript
describe('Structure Rewriting Integration', () => {
  describe('deviation detection during page generation', () => {
    it('should detect deviation when LLM signals it');
    it('should trigger rewrite flow on deviation');
    it('should preserve completed beats through rewrite');
    it('should update story with new structure version');
    it('should reference new structure version in generated page');
  });

  describe('structure version persistence', () => {
    it('should persist all structure versions to story.json');
    it('should load structure versions on story load');
    it('should maintain version chain integrity');
  });

  describe('branch isolation', () => {
    it('should not affect sibling branches on rewrite');
    it('should only affect downstream pages in same branch');
  });
});
```

#### Page Service Integration (`test/integration/page-service.test.ts`)

```typescript
describe('PageService with Structure Rewriting', () => {
  describe('generateNextPage', () => {
    it('should handle deviation during normal generation');
    it('should update story with new structure version');
    it('should continue with new structure for subsequent pages');
  });
});
```

### E2E Tests (`test/e2e/`)

#### Full Rewriting Journey (`test/e2e/structure-rewriting-journey.test.ts`)

```typescript
describe('Structure Rewriting E2E', () => {
  it('should complete story after structure rewrite', async () => {
    // 1. Create story with structure
    // 2. Generate pages until deviation occurs
    // 3. Verify structure is rewritten
    // 4. Continue generating pages with new structure
    // 5. Verify story can reach ending
  });

  it('should maintain narrative coherence through rewrite', async () => {
    // 1. Generate pages building toward specific beats
    // 2. Make choice that causes deviation
    // 3. Verify rewritten structure accounts for current state
    // 4. Verify subsequent pages follow new structure logically
  });

  it('should preserve completed beats through multiple rewrites', async () => {
    // 1. Complete Act 1 beats
    // 2. Trigger deviation in Act 2
    // 3. Trigger another deviation in Act 2
    // 4. Verify Act 1 beats remain unchanged in all versions
  });
});
```

### Performance Tests (`test/performance/`)

#### Rewriting Performance (`test/performance/structure-rewriting.test.ts`)

```typescript
describe('Structure Rewriting Performance', () => {
  it('should complete structure rewrite in < 10 seconds', async () => {
    // Measure time for structure regeneration
  });

  it('should handle stories with many structure versions efficiently', async () => {
    // Create story with 10+ structure versions
    // Verify loading and version resolution remains fast
  });
});
```

---

## Migration Notes

### Data Migration

Existing stories without `structureVersions` field will be migrated on first load:

```typescript
function migrateStoryToVersionedStructure(story: Story): Story {
  if (story.structureVersions && story.structureVersions.length > 0) {
    return story; // Already migrated
  }

  if (!story.structure) {
    return { ...story, structureVersions: [] };
  }

  const initialVersion = createInitialVersionedStructure(story.structure);
  return {
    ...story,
    structureVersions: [initialVersion],
  };
}
```

### Page Migration

Existing pages without `structureVersionId` will be assigned the initial structure version:

```typescript
function migratePageToVersionedStructure(
  page: Page,
  story: Story
): Page {
  if (page.structureVersionId !== undefined) {
    return page; // Already migrated
  }

  const initialVersion = story.structureVersions[0];
  return {
    ...page,
    structureVersionId: initialVersion?.id ?? null,
  };
}
```

---

## Future Considerations

### Not In Scope (Potential Future Work)

1. **User-triggered structure review** - Manual structure editing UI
2. **Structure diff visualization** - Show what changed between versions
3. **Rollback to previous structure** - Undo structure rewrites
4. **Partial beat editing** - Surgical modifications to individual beats
5. **Structure suggestion mode** - LLM suggests but doesn't auto-apply changes
6. **Multi-branch structure divergence** - Different branches with completely independent structures

### Extension Points

The architecture supports future extensions through:

1. **VersionedStoryStructure.metadata** - Can add arbitrary metadata to versions
2. **DeviationResult union** - Can add more deviation types (e.g., partial deviation)
3. **StructureRewriteContext** - Can include more context for better regeneration
4. **Structure version comparison utilities** - Foundation for diff visualization

# STRREWSYS-015: Create Integration Tests for Structure Rewriting

## Summary
Create integration tests that verify the complete structure rewriting flow works correctly across all components.

## Dependencies
- All previous STRREWSYS tickets (001-014) should be completed

## Files to Touch

### New Files
- `test/integration/engine/structure-rewriting.test.ts`

### Modified Files
- `test/integration/engine/story-engine.test.ts` (add rewriting scenarios if appropriate)

## Out of Scope
- Do NOT create E2E tests (handled in STRREWSYS-016)
- Do NOT create performance tests (handled in STRREWSYS-017)
- Do NOT test UI/routes
- Do NOT require actual API calls (use mocks)

## Implementation Details

### New File: `test/integration/engine/structure-rewriting.test.ts`

```typescript
import {
  Story,
  Page,
  createStory,
  StoryStructure,
  AccumulatedStructureState,
} from '../../../src/models';
import {
  VersionedStoryStructure,
  createInitialVersionedStructure,
} from '../../../src/models/structure-version';
import {
  createBeatDeviation,
  isDeviation,
} from '../../../src/models/story-arc';
import {
  extractCompletedBeats,
  buildRewriteContext,
  validatePreservedBeats,
} from '../../../src/engine/structure-manager';
import {
  createStructureRewriter,
  mergePreservedWithRegenerated,
} from '../../../src/engine/structure-rewriter';
import { addStructureVersion, getLatestStructureVersion } from '../../../src/models/story';

// Mock LLM client
jest.mock('../../../src/llm/client');

describe('Structure Rewriting Integration', () => {
  // Test fixtures
  let story: Story;
  let structure: StoryStructure;
  let structureVersion: VersionedStoryStructure;
  let structureState: AccumulatedStructureState;

  beforeEach(() => {
    // Set up complete test scenario
    structure = createTestStructure();
    story = createTestStory(structure);
    structureVersion = createInitialVersionedStructure(structure);
    story = addStructureVersion(story, structureVersion);
    structureState = createTestStructureState();
  });

  describe('deviation detection during page generation', () => {
    it('should detect deviation when LLM signals it', () => {
      const deviation = createBeatDeviation(
        'Player joined the enemy faction',
        ['2.2', '2.3', '3.1', '3.2', '3.3'],
        'Protagonist is now allied with antagonist'
      );

      expect(isDeviation(deviation)).toBe(true);
      expect(deviation.invalidatedBeatIds).toHaveLength(5);
    });

    it('should build correct rewrite context from deviation', () => {
      const deviation = createBeatDeviation(
        'Player joined the enemy faction',
        ['2.2', '2.3', '3.1', '3.2', '3.3'],
        'Protagonist is now allied with antagonist'
      );

      const context = buildRewriteContext(
        story,
        structureVersion,
        structureState,
        deviation
      );

      expect(context.characterConcept).toBe(story.characterConcept);
      expect(context.deviationReason).toBe(deviation.reason);
      expect(context.narrativeSummary).toBe(deviation.narrativeSummary);
      expect(context.originalTheme).toBe(structure.overallTheme);
    });

    it('should preserve completed beats through rewrite', () => {
      // Complete first beat
      const stateWithCompleted: AccumulatedStructureState = {
        currentActIndex: 0,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Beat 1 resolved' },
          { beatId: '1.2', status: 'active' },
        ],
      };

      const completedBeats = extractCompletedBeats(structure, stateWithCompleted);

      expect(completedBeats).toHaveLength(1);
      expect(completedBeats[0].beatId).toBe('1.1');
      expect(completedBeats[0].resolution).toBe('Beat 1 resolved');
    });
  });

  describe('structure version persistence', () => {
    it('should maintain version chain integrity after rewrite', () => {
      const deviation = createBeatDeviation(
        'Story changed direction',
        ['2.1', '2.2'],
        'New story state'
      );

      // Simulate rewrite (mock LLM response)
      const newStructure = createRewrittenTestStructure();
      const newVersion = createRewrittenVersionedStructure(
        structureVersion,
        newStructure,
        ['1.1', '1.2'],
        deviation.reason,
        2 // pageId where deviation occurred
      );

      const updatedStory = addStructureVersion(story, newVersion);

      // Verify chain
      expect(updatedStory.structureVersions).toHaveLength(2);
      expect(updatedStory.structureVersions[0].previousVersionId).toBeNull();
      expect(updatedStory.structureVersions[1].previousVersionId).toBe(
        structureVersion.id
      );
      expect(getLatestStructureVersion(updatedStory)).toBe(newVersion);
    });

    it('should update story structure to latest version', () => {
      const newStructure = createRewrittenTestStructure();
      const newVersion = createRewrittenVersionedStructure(
        structureVersion,
        newStructure,
        [],
        'Test rewrite',
        2
      );

      const updatedStory = addStructureVersion(story, newVersion);

      expect(updatedStory.structure).toBe(newStructure);
    });
  });

  describe('beat preservation validation', () => {
    it('should validate that completed beats exist in new structure', () => {
      const stateWithCompleted: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Resolved 1.1' },
          { beatId: '1.2', status: 'concluded', resolution: 'Resolved 1.2' },
          { beatId: '2.1', status: 'active' },
        ],
      };

      // Valid new structure (preserves beats 1.1 and 1.2)
      const validNewStructure = createStructureWithPreservedBeats();

      const isValid = validatePreservedBeats(
        structure,
        validNewStructure,
        stateWithCompleted
      );

      expect(isValid).toBe(true);
    });

    it('should reject structure with modified completed beats', () => {
      const stateWithCompleted: AccumulatedStructureState = {
        currentActIndex: 1,
        currentBeatIndex: 0,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Resolved' },
        ],
      };

      // Invalid structure (changed beat 1.1 description)
      const invalidStructure = createStructureWithChangedBeat();

      const isValid = validatePreservedBeats(
        structure,
        invalidStructure,
        stateWithCompleted
      );

      expect(isValid).toBe(false);
    });
  });

  describe('merge preserved with regenerated', () => {
    it('should correctly merge preserved and new beats', () => {
      const preserved = [
        {
          actIndex: 0,
          beatIndex: 0,
          beatId: '1.1',
          description: 'Original beat 1',
          objective: 'Objective 1',
          resolution: 'Resolved',
        },
      ];

      const regenerated = createMinimalRegeneratedStructure();

      const merged = mergePreservedWithRegenerated(
        preserved,
        regenerated,
        'Test theme'
      );

      // First beat should be preserved
      expect(merged.acts[0].beats[0].description).toBe('Original beat 1');
      // Subsequent beats should be from regenerated
      expect(merged.acts[0].beats.length).toBeGreaterThanOrEqual(2);
      // Should have 3 acts
      expect(merged.acts).toHaveLength(3);
    });
  });
});

// Helper functions to create test fixtures
function createTestStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act One',
        objective: 'Establish story',
        stakes: 'Introduction stakes',
        entryCondition: 'Story begins',
        beats: [
          { id: '1.1', description: 'Beat 1.1', objective: 'Obj 1.1' },
          { id: '1.2', description: 'Beat 1.2', objective: 'Obj 1.2' },
        ],
      },
      {
        id: '2',
        name: 'Act Two',
        objective: 'Develop conflict',
        stakes: 'Rising stakes',
        entryCondition: 'Conflict emerges',
        beats: [
          { id: '2.1', description: 'Beat 2.1', objective: 'Obj 2.1' },
          { id: '2.2', description: 'Beat 2.2', objective: 'Obj 2.2' },
        ],
      },
      {
        id: '3',
        name: 'Act Three',
        objective: 'Resolve story',
        stakes: 'Final stakes',
        entryCondition: 'Climax begins',
        beats: [
          { id: '3.1', description: 'Beat 3.1', objective: 'Obj 3.1' },
          { id: '3.2', description: 'Beat 3.2', objective: 'Obj 3.2' },
        ],
      },
    ],
    overallTheme: 'Test theme',
    generatedAt: new Date(),
  };
}

function createTestStory(structure: StoryStructure): Story {
  const story = createStory({
    title: 'Test Story',
    characterConcept: 'Test character',
    worldbuilding: 'Test world',
    tone: 'Test tone',
  });
  return { ...story, structure };
}

function createTestStructureState(): AccumulatedStructureState {
  return {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions: [
      { beatId: '1.1', status: 'active' },
    ],
  };
}

// Additional helper stubs (implement as needed)
function createRewrittenTestStructure(): StoryStructure { /* ... */ }
function createStructureWithPreservedBeats(): StoryStructure { /* ... */ }
function createStructureWithChangedBeat(): StoryStructure { /* ... */ }
function createMinimalRegeneratedStructure(): StoryStructure { /* ... */ }
```

## Acceptance Criteria

### Tests That Must Pass
- `test/integration/engine/structure-rewriting.test.ts`
- All existing integration tests
- Run with: `npm run test:integration`

### Invariants That Must Remain True
1. **I1: Completed Beats Never Modified**
2. **I2: Structure Versions Form Linear Chain**
3. **I4: Deviation Only Detected for Pending/Active Beats**
4. **I5: Three-Act Structure Maintained**
5. **Component integration** - All parts work together
6. **Existing tests pass** - `npm run test:integration`

## Technical Notes
- Use mocked LLM client for deterministic tests
- Create comprehensive test fixtures that cover edge cases
- Test both happy path and error scenarios
- Verify invariants explicitly in tests
- Keep tests independent and isolated

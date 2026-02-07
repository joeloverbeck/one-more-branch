# STRREWSYS-017: Create Performance Tests for Structure Rewriting

## Summary
Create performance tests to ensure structure rewriting operations complete within acceptable time limits and handle multiple versions efficiently.

## Dependencies
- All previous STRREWSYS tickets (001-016) should be completed

## Files to Touch

### New Files
- `test/performance/engine/structure-rewriting.test.ts`

## Out of Scope
- Do NOT test actual LLM API performance (use mocks)
- Do NOT create load tests for concurrent users
- Do NOT test network latency scenarios

## Implementation Details

### New File: `test/performance/engine/structure-rewriting.test.ts`

```typescript
/**
 * Performance tests for structure rewriting operations.
 *
 * These tests verify that structure operations complete within
 * acceptable time limits and scale properly.
 */

import { storage } from '../../../src/persistence';
import {
  Story,
  StoryStructure,
  createStory,
  getLatestStructureVersion,
  getStructureVersion,
  addStructureVersion,
} from '../../../src/models';
import {
  VersionedStoryStructure,
  createInitialVersionedStructure,
  createRewrittenVersionedStructure,
  createStructureVersionId,
} from '../../../src/models/structure-version';
import { mergePreservedWithRegenerated } from '../../../src/engine/structure-rewriter';
import { extractCompletedBeats, buildRewriteContext } from '../../../src/engine/structure-manager';
import { createBeatDeviation } from '../../../src/models/story-arc';

describe('Structure Rewriting Performance', () => {
  describe('structure version operations', () => {
    it('should create structure version ID in < 1ms', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        createStructureVersionId();
      }

      const elapsed = performance.now() - start;
      const perOperation = elapsed / iterations;

      expect(perOperation).toBeLessThan(1);
      console.log(`createStructureVersionId: ${perOperation.toFixed(4)}ms per operation`);
    });

    it('should create initial versioned structure in < 5ms', () => {
      const structure = createLargeStructure();
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        createInitialVersionedStructure(structure);
      }

      const elapsed = performance.now() - start;
      const perOperation = elapsed / iterations;

      expect(perOperation).toBeLessThan(5);
      console.log(`createInitialVersionedStructure: ${perOperation.toFixed(4)}ms per operation`);
    });

    it('should create rewritten versioned structure in < 5ms', () => {
      const structure = createLargeStructure();
      const previousVersion = createInitialVersionedStructure(structure);
      const newStructure = createLargeStructure();
      const iterations = 100;

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        createRewrittenVersionedStructure(
          previousVersion,
          newStructure,
          ['1.1', '1.2', '1.3', '2.1'],
          'Test rewrite reason',
          i + 1
        );
      }

      const elapsed = performance.now() - start;
      const perOperation = elapsed / iterations;

      expect(perOperation).toBeLessThan(5);
      console.log(`createRewrittenVersionedStructure: ${perOperation.toFixed(4)}ms per operation`);
    });
  });

  describe('story with many structure versions', () => {
    it('should handle stories with 10+ structure versions efficiently', async () => {
      const story = createStory({
        title: 'Performance Test Story',
        characterConcept: 'Test character',
      });

      const structure = createLargeStructure();
      let currentStory: Story = {
        ...story,
        structure,
        structureVersions: [],
      };

      // Add initial version
      const initialVersion = createInitialVersionedStructure(structure);
      currentStory = addStructureVersion(currentStory, initialVersion);

      // Add 14 more versions (total 15)
      const versionCount = 15;
      for (let i = 1; i < versionCount; i++) {
        const newStructure = createLargeStructure();
        const previousVersion = getLatestStructureVersion(currentStory)!;
        const newVersion = createRewrittenVersionedStructure(
          previousVersion,
          newStructure,
          ['1.1'],
          `Rewrite ${i}`,
          i + 1
        );
        currentStory = addStructureVersion(currentStory, newVersion);
      }

      expect(currentStory.structureVersions).toHaveLength(versionCount);

      // Test version lookup performance
      const lookupIterations = 1000;
      const targetVersionId = currentStory.structureVersions[7].id;

      const lookupStart = performance.now();
      for (let i = 0; i < lookupIterations; i++) {
        getStructureVersion(currentStory, targetVersionId);
      }
      const lookupElapsed = performance.now() - lookupStart;
      const perLookup = lookupElapsed / lookupIterations;

      expect(perLookup).toBeLessThan(0.1); // < 0.1ms per lookup
      console.log(`getStructureVersion with ${versionCount} versions: ${perLookup.toFixed(4)}ms per lookup`);

      // Test getLatestStructureVersion performance
      const latestStart = performance.now();
      for (let i = 0; i < lookupIterations; i++) {
        getLatestStructureVersion(currentStory);
      }
      const latestElapsed = performance.now() - latestStart;
      const perLatest = latestElapsed / lookupIterations;

      expect(perLatest).toBeLessThan(0.05); // < 0.05ms
      console.log(`getLatestStructureVersion with ${versionCount} versions: ${perLatest.toFixed(4)}ms per lookup`);
    });

    it('should save and load story with many versions efficiently', async () => {
      const story = createStoryWithManyVersions(10);

      // Save performance
      const saveStart = performance.now();
      await storage.saveStory(story);
      const saveElapsed = performance.now() - saveStart;

      expect(saveElapsed).toBeLessThan(100); // < 100ms
      console.log(`Save story with 10 versions: ${saveElapsed.toFixed(2)}ms`);

      // Load performance
      const loadStart = performance.now();
      const loadedStory = await storage.loadStory(story.id);
      const loadElapsed = performance.now() - loadStart;

      expect(loadElapsed).toBeLessThan(100); // < 100ms
      expect(loadedStory?.structureVersions).toHaveLength(10);
      console.log(`Load story with 10 versions: ${loadElapsed.toFixed(2)}ms`);

      // Cleanup
      await storage.deleteStory(story.id);
    });
  });

  describe('merge operations', () => {
    it('should merge preserved beats with regenerated structure in < 10ms', () => {
      const preservedBeats = createManyCompletedBeats(6); // 2 per act
      const regeneratedStructure = createLargeStructure();
      const iterations = 100;

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        mergePreservedWithRegenerated(
          preservedBeats,
          regeneratedStructure,
          'Test theme'
        );
      }

      const elapsed = performance.now() - start;
      const perOperation = elapsed / iterations;

      expect(perOperation).toBeLessThan(10);
      console.log(`mergePreservedWithRegenerated: ${perOperation.toFixed(4)}ms per operation`);
    });
  });

  describe('context building', () => {
    it('should build rewrite context in < 5ms', () => {
      const story = createTestStory();
      const structure = createLargeStructure();
      const structureVersion = createInitialVersionedStructure(structure);
      const structureState = createStructureStateWithProgress();
      const deviation = createBeatDeviation(
        'Test deviation',
        ['2.1', '2.2', '3.1', '3.2'],
        'Test narrative summary'
      );

      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        buildRewriteContext(story, structureVersion, structureState, deviation);
      }

      const elapsed = performance.now() - start;
      const perOperation = elapsed / iterations;

      expect(perOperation).toBeLessThan(5);
      console.log(`buildRewriteContext: ${perOperation.toFixed(4)}ms per operation`);
    });
  });

  describe('completed beat extraction', () => {
    it('should extract completed beats in < 2ms', () => {
      const structure = createLargeStructure();
      const structureState = createStructureStateWithManyCompleted();

      const iterations = 500;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        extractCompletedBeats(structure, structureState);
      }

      const elapsed = performance.now() - start;
      const perOperation = elapsed / iterations;

      expect(perOperation).toBeLessThan(2);
      console.log(`extractCompletedBeats: ${perOperation.toFixed(4)}ms per operation`);
    });
  });
});

// Helper functions

function createLargeStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act One - Extended Setup',
        objective: 'Establish the complex world and characters',
        stakes: 'The entire kingdom is at stake',
        entryCondition: 'Story begins',
        beats: [
          { id: '1.1', description: 'Introduce protagonist in their ordinary world', objective: 'Show daily life' },
          { id: '1.2', description: 'Present the inciting incident', objective: 'Disrupt status quo' },
          { id: '1.3', description: 'Refuse the call to adventure', objective: 'Show hesitation' },
          { id: '1.4', description: 'Meet the mentor figure', objective: 'Gain guidance' },
        ],
      },
      {
        id: '2',
        name: 'Act Two - Rising Conflict',
        objective: 'Develop the central conflict',
        stakes: 'Lives of companions at risk',
        entryCondition: 'Cross the threshold',
        beats: [
          { id: '2.1', description: 'Enter the special world', objective: 'Adapt to new environment' },
          { id: '2.2', description: 'Face tests and make allies', objective: 'Build team' },
          { id: '2.3', description: 'Approach the innermost cave', objective: 'Prepare for ordeal' },
          { id: '2.4', description: 'Survive the ordeal', objective: 'Transform through crisis' },
        ],
      },
      {
        id: '3',
        name: 'Act Three - Resolution',
        objective: 'Resolve the story',
        stakes: 'Final confrontation',
        entryCondition: 'Begin the return',
        beats: [
          { id: '3.1', description: 'Seize the reward', objective: 'Gain the prize' },
          { id: '3.2', description: 'The road back', objective: 'Begin return journey' },
          { id: '3.3', description: 'Resurrection', objective: 'Final transformation' },
          { id: '3.4', description: 'Return with elixir', objective: 'Complete the journey' },
        ],
      },
    ],
    overallTheme: 'The hero journey of self-discovery',
    generatedAt: new Date(),
  };
}

function createStoryWithManyVersions(versionCount: number): Story {
  const story = createStory({
    title: 'Multi-version Story',
    characterConcept: 'Test character',
  });

  const structure = createLargeStructure();
  let currentStory: Story = { ...story, structure, structureVersions: [] };

  const initialVersion = createInitialVersionedStructure(structure);
  currentStory = addStructureVersion(currentStory, initialVersion);

  for (let i = 1; i < versionCount; i++) {
    const newStructure = createLargeStructure();
    const previousVersion = getLatestStructureVersion(currentStory)!;
    const newVersion = createRewrittenVersionedStructure(
      previousVersion,
      newStructure,
      ['1.1'],
      `Rewrite ${i}`,
      i + 1
    );
    currentStory = addStructureVersion(currentStory, newVersion);
  }

  return currentStory;
}

function createManyCompletedBeats(count: number) {
  const beats = [];
  for (let i = 0; i < count; i++) {
    const actIdx = Math.floor(i / 2);
    const beatIdx = i % 2;
    beats.push({
      actIndex: actIdx,
      beatIndex: beatIdx,
      beatId: `${actIdx + 1}.${beatIdx + 1}`,
      description: `Beat ${actIdx + 1}.${beatIdx + 1} description`,
      objective: `Beat ${actIdx + 1}.${beatIdx + 1} objective`,
      resolution: `Beat ${actIdx + 1}.${beatIdx + 1} resolved successfully`,
    });
  }
  return beats;
}

function createTestStory(): Story {
  return createStory({
    title: 'Test Story',
    characterConcept: 'A brave adventurer',
    worldbuilding: 'A vast fantasy realm',
    tone: 'Epic adventure',
  });
}

function createStructureStateWithProgress() {
  return {
    currentActIndex: 1,
    currentBeatIndex: 1,
    beatProgressions: [
      { beatId: '1.1', status: 'concluded' as const, resolution: 'Resolved 1.1' },
      { beatId: '1.2', status: 'concluded' as const, resolution: 'Resolved 1.2' },
      { beatId: '2.1', status: 'concluded' as const, resolution: 'Resolved 2.1' },
      { beatId: '2.2', status: 'active' as const },
    ],
  };
}

function createStructureStateWithManyCompleted() {
  return {
    currentActIndex: 2,
    currentBeatIndex: 1,
    beatProgressions: [
      { beatId: '1.1', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '1.2', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '1.3', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '1.4', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '2.1', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '2.2', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '2.3', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '2.4', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '3.1', status: 'concluded' as const, resolution: 'Resolved' },
      { beatId: '3.2', status: 'active' as const },
    ],
  };
}
```

## Acceptance Criteria

### Tests That Must Pass
- `test/performance/engine/structure-rewriting.test.ts`
- All performance tests complete within specified limits
- Run with: `npm run test:performance`

### Performance Thresholds
| Operation | Max Time |
|-----------|----------|
| createStructureVersionId | < 1ms |
| createInitialVersionedStructure | < 5ms |
| createRewrittenVersionedStructure | < 5ms |
| getStructureVersion (15 versions) | < 0.1ms |
| getLatestStructureVersion | < 0.05ms |
| Save story (10 versions) | < 100ms |
| Load story (10 versions) | < 100ms |
| mergePreservedWithRegenerated | < 10ms |
| buildRewriteContext | < 5ms |
| extractCompletedBeats | < 2ms |

### Invariants That Must Remain True
1. **Performance stability** - Operations don't degrade with more versions
2. **Memory efficiency** - No memory leaks in repeated operations
3. **Existing tests pass** - `npm run test:performance`

## Technical Notes
- Use `performance.now()` for accurate timing
- Log performance metrics for monitoring
- Clean up test data after each test
- Don't include LLM API time in these tests (mock it)
- Focus on in-process operations and I/O

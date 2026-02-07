import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  addStructureVersion,
  createBeatDeviation,
  createInitialVersionedStructure,
  createRewrittenVersionedStructure,
  createStory,
  createStructureVersionId,
  getLatestStructureVersion,
  getStructureVersion,
  parsePageId,
  Story,
  StoryStructure,
} from '@/models';
import { buildRewriteContext, extractCompletedBeats } from '@/engine/structure-manager';
import { mergePreservedWithRegenerated } from '@/engine/structure-rewriter';

function createLargeStructure(): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act 1',
        objective: 'Set up conflict',
        stakes: 'Home is at risk',
        entryCondition: 'Story start',
        beats: [
          { id: '1.1', description: 'Ordinary world', objective: 'Ground character' },
          { id: '1.2', description: 'Inciting incident', objective: 'Force decision' },
          { id: '1.3', description: 'Debate', objective: 'Show hesitation' },
          { id: '1.4', description: 'Cross threshold', objective: 'Commit to quest' },
        ],
      },
      {
        id: '2',
        name: 'Act 2',
        objective: 'Escalate conflict',
        stakes: 'Allies can be lost',
        entryCondition: 'New world entered',
        beats: [
          { id: '2.1', description: 'Tests and allies', objective: 'Build coalition' },
          { id: '2.2', description: 'Midpoint shift', objective: 'Reveal new truth' },
          { id: '2.3', description: 'Crisis', objective: 'Push to brink' },
          { id: '2.4', description: 'Decision', objective: 'Choose final approach' },
        ],
      },
      {
        id: '3',
        name: 'Act 3',
        objective: 'Resolve conflict',
        stakes: 'Future of the realm',
        entryCondition: 'Final approach',
        beats: [
          { id: '3.1', description: 'Final confrontation', objective: 'Face antagonist' },
          { id: '3.2', description: 'Sacrifice', objective: 'Pay cost' },
          { id: '3.3', description: 'Victory', objective: 'Resolve central conflict' },
          { id: '3.4', description: 'Aftermath', objective: 'Show new equilibrium' },
        ],
      },
    ],
    overallTheme: 'Change through responsibility',
    generatedAt: new Date(),
  };
}

function createStateWithProgress() {
  return {
    currentActIndex: 1,
    currentBeatIndex: 1,
    beatProgressions: [
      { beatId: '1.1', status: 'concluded' as const, resolution: 'Hero accepted the call' },
      { beatId: '1.2', status: 'concluded' as const, resolution: 'Hero left home' },
      { beatId: '2.1', status: 'concluded' as const, resolution: 'Alliance formed' },
      { beatId: '2.2', status: 'active' as const },
    ],
  };
}

function createStoryWithVersions(versionCount: number): Story {
  const story = createStory({
    title: 'Performance Story',
    characterConcept: 'A determined tactician',
    worldbuilding: 'A fractured kingdom',
    tone: 'epic',
  });

  const baseStructure = createLargeStructure();
  let current = addStructureVersion(story, createInitialVersionedStructure(baseStructure));

  for (let i = 1; i < versionCount; i += 1) {
    const previous = getLatestStructureVersion(current);
    if (!previous) {
      throw new Error('Expected previous structure version');
    }

    const next = createRewrittenVersionedStructure(
      previous,
      createLargeStructure(),
      ['1.1', '1.2'],
      `Rewrite ${i}`,
      parsePageId(i + 1),
    );

    current = addStructureVersion(current, next);
  }

  return current;
}

function measureAverageMs(iterations: number, fn: () => void): number {
  for (let i = 0; i < 200; i += 1) {
    fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    fn();
  }

  return (performance.now() - start) / iterations;
}

describe('Structure Rewriting Performance', () => {
  describe('structure version operations', () => {
    it('creates structure version identifiers with low average latency', () => {
      const avgMs = measureAverageMs(4000, () => {
        createStructureVersionId();
      });

      expect(avgMs).toBeLessThan(0.5);
    });

    it('creates initial and rewritten versions with low average latency', () => {
      const structure = createLargeStructure();
      const initialAvgMs = measureAverageMs(1500, () => {
        createInitialVersionedStructure(structure);
      });

      const previous = createInitialVersionedStructure(structure);
      const rewrittenAvgMs = measureAverageMs(1500, () => {
        createRewrittenVersionedStructure(
          previous,
          structure,
          ['1.1', '1.2', '2.1'],
          'Synthetic rewrite',
          parsePageId(99),
        );
      });

      expect(initialAvgMs).toBeLessThan(0.5);
      expect(rewrittenAvgMs).toBeLessThan(0.5);
    });
  });

  describe('version lookup scaling', () => {
    it('keeps lookups efficient as version count increases', () => {
      const oneVersionStory = createStoryWithVersions(1);
      const manyVersionStory = createStoryWithVersions(20);
      const targetId = manyVersionStory.structureVersions?.[10]?.id;

      if (!targetId) {
        throw new Error('Expected target version in many-version story');
      }

      const singleLookupAvgMs = measureAverageMs(6000, () => {
        getStructureVersion(oneVersionStory, oneVersionStory.structureVersions?.[0]?.id ?? targetId);
      });
      const manyLookupAvgMs = measureAverageMs(6000, () => {
        getStructureVersion(manyVersionStory, targetId);
      });
      const latestLookupAvgMs = measureAverageMs(6000, () => {
        getLatestStructureVersion(manyVersionStory);
      });

      expect(manyLookupAvgMs).toBeLessThan(0.5);
      expect(latestLookupAvgMs).toBeLessThan(0.2);
      expect(manyLookupAvgMs).toBeLessThan(singleLookupAvgMs * 25 + 0.05);
    });
  });

  describe('rewrite helper operations', () => {
    it('extracts completed beats, builds context, and merges with low latency', () => {
      const story = createStory({
        title: 'Helper Performance Story',
        characterConcept: 'An archivist-hero',
        worldbuilding: 'Ancient ruins',
        tone: 'mystery',
      });
      const structure = createLargeStructure();
      const version = createInitialVersionedStructure(structure);
      const state = createStateWithProgress();
      const deviation = createBeatDeviation(
        'The hero allied with the former enemy',
        ['2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '3.4'],
        'Alliance politics now drive the conflict',
      );

      const extractAvgMs = measureAverageMs(2500, () => {
        extractCompletedBeats(structure, state);
      });

      const contextAvgMs = measureAverageMs(2500, () => {
        buildRewriteContext(story, version, state, deviation);
      });

      const preserved = extractCompletedBeats(structure, state);
      const mergeAvgMs = measureAverageMs(2000, () => {
        mergePreservedWithRegenerated(preserved, createLargeStructure(), structure.overallTheme);
      });

      const merged = mergePreservedWithRegenerated(
        preserved,
        createLargeStructure(),
        structure.overallTheme,
      );

      expect(extractAvgMs).toBeLessThan(0.5);
      expect(contextAvgMs).toBeLessThan(0.5);
      expect(mergeAvgMs).toBeLessThan(0.75);
      expect(merged.acts).toHaveLength(3);
      expect(merged.acts.every((act) => act.beats.length > 0)).toBe(true);
    });
  });

  describe('persistence with many versions', () => {
    let originalCwd = process.cwd();
    let tempRootDir = '';
    let storage: import('@/persistence/storage').Storage;

    beforeAll(async () => {
      originalCwd = process.cwd();
      tempRootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'one-more-branch-structure-perf-'));
      process.chdir(tempRootDir);

      jest.resetModules();
      let persistence!: typeof import('@/persistence');
      let configModule!: typeof import('@/config/index');
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        configModule = require('@/config/index') as typeof import('@/config/index');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        persistence = require('@/persistence') as typeof import('@/persistence');
      });

      configModule.loadConfig();
      storage = new persistence.Storage();
      storage.init();
    });

    afterAll(async () => {
      process.chdir(originalCwd);
      if (tempRootDir.length > 0) {
        await fs.rm(tempRootDir, { recursive: true, force: true });
      }
    });

    it('saves and loads a story with many structure versions within reasonable local bounds', async () => {
      const story = createStoryWithVersions(10);

      const saveStart = performance.now();
      await storage.saveStory(story);
      const saveElapsedMs = performance.now() - saveStart;

      const loadStart = performance.now();
      const loaded = await storage.loadStory(story.id);
      const loadElapsedMs = performance.now() - loadStart;

      expect(saveElapsedMs).toBeLessThan(1500);
      expect(loadElapsedMs).toBeLessThan(1500);
      expect(loaded).not.toBeNull();
      expect(loaded?.structureVersions).toHaveLength(10);

      await storage.deleteStory(story.id);
    });
  });
});

import {
  createBeatDeviation,
  createEmptyAccumulatedStructureState,
  createNoDeviation,
  createStory,
  parsePageId,
  Story,
  updateStoryStructure,
} from '@/models';
import type { StoryStructure } from '@/models/story-arc';
import type { ContinuationGenerationResult } from '@/llm/types';
import {
  isActualDeviation,
  handleDeviation,
  DeviationContext,
} from '@/engine/deviation-handler';
import { createStructureRewriter } from '@/engine/structure-rewriter';

// Mock the structure rewriter
jest.mock('@/engine/structure-rewriter', () => ({
  createStructureRewriter: jest.fn(),
}));

const mockedCreateStructureRewriter = createStructureRewriter as jest.MockedFunction<
  typeof createStructureRewriter
>;

function createTestStructure(): StoryStructure {
  return {
    theme: 'Test Theme',
    acts: [
      {
        title: 'Act 1',
        beats: [{ id: '1.1', description: 'Opening', objective: 'Start' }],
      },
      {
        title: 'Act 2',
        beats: [{ id: '2.1', description: 'Rising', objective: 'Build' }],
      },
      {
        title: 'Act 3',
        beats: [{ id: '3.1', description: 'Resolution', objective: 'End' }],
      },
    ],
  };
}

function createTestStoryWithStructure(): Story {
  const baseStory = createStory({
    title: 'Test Story',
    characterConcept: 'Test character',
    worldbuilding: 'Test world',
    tone: 'Test tone',
  });
  return updateStoryStructure(baseStory, createTestStructure());
}

function createMockResult(hasDeviation: boolean): ContinuationGenerationResult {
  return {
    narrative: 'Test narrative',
    choices: [
      { text: 'Choice A', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Choice B', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    stateChangesAdded: [],
    stateChangesRemoved: [],
    newCanonFacts: [],
    newCharacterCanonFacts: {},
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'curiosity',
      primaryIntensity: 'moderate' as const,
      primaryCause: 'test',
      secondaryEmotions: [],
      dominantMotivation: 'test',
    },
    isEnding: false,
    beatConcluded: false,
    beatResolution: '',
    rawResponse: 'raw',
    deviation: hasDeviation
      ? createBeatDeviation('Player chose unexpected path', ['1.1'], 'Summary')
      : createNoDeviation(),
  };
}

describe('deviation-handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isActualDeviation', () => {
    it('returns false when story has no structure', () => {
      const story = createStory({
        title: 'No Structure',
        characterConcept: 'Test',
        worldbuilding: 'Test',
        tone: 'Test',
      });
      const result = createMockResult(true);

      const isDeviation = isActualDeviation(result, story, null);

      expect(isDeviation).toBe(false);
    });

    it('returns false when currentVersion is null', () => {
      const story = createTestStoryWithStructure();
      const result = createMockResult(true);

      const isDeviation = isActualDeviation(result, story, null);

      expect(isDeviation).toBe(false);
    });

    it('returns false when result has no deviation', () => {
      const story = createTestStoryWithStructure();
      const currentVersion = story.structureVersions[0];
      const result = createMockResult(false);

      const isDeviation = isActualDeviation(result, story, currentVersion);

      expect(isDeviation).toBe(false);
    });

    it('returns true when all conditions are met', () => {
      const story = createTestStoryWithStructure();
      const currentVersion = story.structureVersions[0];
      const result = createMockResult(true);

      const isDeviation = isActualDeviation(result, story, currentVersion);

      expect(isDeviation).toBe(true);
    });
  });

  describe('handleDeviation', () => {
    it('calls structure rewriter with correct context', async () => {
      const story = createTestStoryWithStructure();
      const currentVersion = story.structureVersions[0];
      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: createTestStructure(),
          preservedBeatIds: ['1.1'],
          rawResponse: 'raw',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      const context: DeviationContext = {
        story,
        currentVersion,
        parentStructureState: createEmptyAccumulatedStructureState(),
        deviation: createBeatDeviation('Test deviation', ['1.1'], 'Summary'),
        newPageId: parsePageId(5),
      };

      await handleDeviation(context, 'test-api-key');

      expect(mockRewriter.rewriteStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          deviationReason: 'Test deviation',
        }),
        'test-api-key',
      );
    });

    it('creates new structure version with correct metadata', async () => {
      const story = createTestStoryWithStructure();
      const currentVersion = story.structureVersions[0];
      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: createTestStructure(),
          preservedBeatIds: ['1.1', '2.1'],
          rawResponse: 'raw',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      const context: DeviationContext = {
        story,
        currentVersion,
        parentStructureState: createEmptyAccumulatedStructureState(),
        deviation: createBeatDeviation('Unexpected choice', ['3.1'], 'Summary'),
        newPageId: parsePageId(10),
      };

      const result = await handleDeviation(context, 'test-api-key');

      expect(result.activeVersion.previousVersionId).toBe(currentVersion.id);
      expect(result.activeVersion.rewriteReason).toBe('Unexpected choice');
      expect(result.activeVersion.createdAtPageId).toBe(10);
      expect(result.activeVersion.preservedBeatIds).toEqual(['1.1', '2.1']);
    });

    it('adds new version to story', async () => {
      const story = createTestStoryWithStructure();
      const currentVersion = story.structureVersions[0];
      const originalVersionCount = story.structureVersions.length;
      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: createTestStructure(),
          preservedBeatIds: [],
          rawResponse: 'raw',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      const context: DeviationContext = {
        story,
        currentVersion,
        parentStructureState: createEmptyAccumulatedStructureState(),
        deviation: createBeatDeviation('Test', ['1.1'], 'Summary'),
        newPageId: parsePageId(3),
      };

      const result = await handleDeviation(context, 'test-api-key');

      expect(result.updatedStory.structureVersions.length).toBe(originalVersionCount + 1);
    });

    it('returns correct deviation info', async () => {
      const story = createTestStoryWithStructure();
      const currentVersion = story.structureVersions[0];
      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: createTestStructure(),
          preservedBeatIds: [],
          rawResponse: 'raw',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      const context: DeviationContext = {
        story,
        currentVersion,
        parentStructureState: createEmptyAccumulatedStructureState(),
        deviation: createBeatDeviation('Major deviation', ['1.1', '2.1', '3.1'], 'Summary'),
        newPageId: parsePageId(7),
      };

      const result = await handleDeviation(context, 'test-api-key');

      expect(result.deviationInfo.detected).toBe(true);
      expect(result.deviationInfo.reason).toBe('Major deviation');
      expect(result.deviationInfo.beatsInvalidated).toBe(3);
    });
  });
});

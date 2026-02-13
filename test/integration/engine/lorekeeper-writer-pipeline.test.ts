import { generateLorekeeperBible, generatePageWriterOutput } from '@/llm';
import { createContinuationWriterWithLorekeeper } from '@/engine/lorekeeper-writer-pipeline';
import type { LorekeeperWriterContext } from '@/engine/lorekeeper-writer-pipeline';
import type { ContinuationContext, LorekeeperResult, WriterResult } from '@/llm/types';
import type { PagePlanGenerationResult } from '@/llm/types';
import type { GenerationStageCallback } from '@/engine/types';
import { ChoiceType, PrimaryDelta } from '@/models/choice-enums';

jest.mock('@/llm', () => ({
  generateLorekeeperBible: jest.fn(),
  generatePageWriterOutput: jest.fn(),
}));

jest.mock('@/logging/index', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logPrompt: jest.fn(),
}));

const mockedGenerateLorekeeperBible = generateLorekeeperBible as jest.MockedFunction<
  typeof generateLorekeeperBible
>;
const mockedGeneratePageWriterOutput = generatePageWriterOutput as jest.MockedFunction<
  typeof generatePageWriterOutput
>;

const mockContinuationContext: ContinuationContext = {
  characterConcept: 'A brave knight',
  worldbuilding: 'Medieval fantasy',
  tone: 'Epic',
  globalCanon: [],
  globalCharacterCanon: {},
  previousNarrative: 'The knight entered the castle.',
  selectedChoice: 'Enter the throne room',
  accumulatedInventory: [],
  accumulatedHealth: [],
  accumulatedCharacterState: {},
  activeState: {
    currentLocation: 'castle',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  },
  grandparentNarrative: null,
  ancestorSummaries: [],
};

const mockPagePlan: PagePlanGenerationResult = {
  sceneIntent: 'Enter throne room',
  writerBrief: 'Write the throne room scene',
  continuityAnchors: [],
  stateIntents: { threatsToAdd: [], threatsToRemove: [], constraintsToAdd: [], constraintsToRemove: [], threadsToAdd: [], threadsToResolve: [], inventoryToAdd: [], inventoryToRemove: [], healthToAdd: [], healthToRemove: [], characterStateChanges: [], locationChange: null },
  dramaticQuestion: 'Will the knight survive?',
  choiceIntents: [],
  rawResponse: '{}',
};

const mockLorekeeperResult: LorekeeperResult = {
  sceneWorldContext: 'A grand throne room',
  relevantCharacters: [
    { name: 'King', role: 'ruler', relevantProfile: 'The king', speechPatterns: 'formal', protagonistRelationship: 'sovereign', currentState: 'seated' },
  ],
  relevantCanonFacts: ['The castle was built 500 years ago'],
  relevantHistory: 'The knight has served the king for years',
  rawResponse: '{}',
};

const mockWriterResult: WriterResult = {
  narrative: 'The knight knelt before the throne.',
  choices: [{ text: 'Speak', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.GOAL_SHIFT }],
  sceneSummary: 'Knight meets king',
  protagonistAffect: {
    primaryEmotion: 'awe',
    primaryIntensity: 'moderate',
    primaryCause: 'seeing the throne',
    secondaryEmotions: [],
    dominantMotivation: 'duty',
  },
  isEnding: false,
  rawResponse: '{}',
  currentLocation: 'throne room',
  threatsAdded: [],
  threatsRemoved: [],
  constraintsAdded: [],
  constraintsRemoved: [],
  threadsAdded: [],
  threadsResolved: [],
  newCanonFacts: [],
  newCharacterCanonFacts: {},
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
};

function createBaseContext(overrides: Partial<LorekeeperWriterContext> = {}): LorekeeperWriterContext {
  return {
    continuationContext: mockContinuationContext,
    storyId: 'test-story',
    parentPageId: 1,
    requestId: 'test-request',
    apiKey: 'test-key',
    removableIds: {
      threats: [],
      constraints: [],
      threads: [],
      inventory: [],
      health: [],
      characterState: [],
    },
    ...overrides,
  };
}

describe('createContinuationWriterWithLorekeeper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates bible then calls writer with it', async () => {
    mockedGenerateLorekeeperBible.mockResolvedValue(mockLorekeeperResult);
    mockedGeneratePageWriterOutput.mockResolvedValue(mockWriterResult);

    const { generateWriter } = createContinuationWriterWithLorekeeper(createBaseContext());
    const result = await generateWriter(mockPagePlan);

    expect(mockedGenerateLorekeeperBible).toHaveBeenCalledTimes(1);
    expect(mockedGeneratePageWriterOutput).toHaveBeenCalledTimes(1);
    expect(mockedGeneratePageWriterOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        storyBible: {
          sceneWorldContext: 'A grand throne room',
          relevantCharacters: mockLorekeeperResult.relevantCharacters,
          relevantCanonFacts: mockLorekeeperResult.relevantCanonFacts,
          relevantHistory: mockLorekeeperResult.relevantHistory,
        },
      }),
      mockPagePlan,
      expect.any(Object),
    );
    expect(result).toEqual(mockWriterResult);
  });

  it('proceeds without bible when lorekeeper fails', async () => {
    mockedGenerateLorekeeperBible.mockRejectedValue(new Error('LLM timeout'));
    mockedGeneratePageWriterOutput.mockResolvedValue(mockWriterResult);

    const { generateWriter } = createContinuationWriterWithLorekeeper(createBaseContext());
    const result = await generateWriter(mockPagePlan);

    expect(mockedGeneratePageWriterOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        storyBible: undefined,
      }),
      mockPagePlan,
      expect.any(Object),
    );
    expect(result).toEqual(mockWriterResult);
  });

  it('getLastStoryBible returns bible after generation', async () => {
    mockedGenerateLorekeeperBible.mockResolvedValue(mockLorekeeperResult);
    mockedGeneratePageWriterOutput.mockResolvedValue(mockWriterResult);

    const { generateWriter, getLastStoryBible } = createContinuationWriterWithLorekeeper(createBaseContext());

    expect(getLastStoryBible()).toBeNull();

    await generateWriter(mockPagePlan);

    const bible = getLastStoryBible();
    expect(bible).not.toBeNull();
    expect(bible!.sceneWorldContext).toBe('A grand throne room');
    expect(bible!.relevantCharacters).toHaveLength(1);
  });

  it('getLastStoryBible returns null when lorekeeper fails', async () => {
    mockedGenerateLorekeeperBible.mockRejectedValue(new Error('LLM timeout'));
    mockedGeneratePageWriterOutput.mockResolvedValue(mockWriterResult);

    const { generateWriter, getLastStoryBible } = createContinuationWriterWithLorekeeper(createBaseContext());
    await generateWriter(mockPagePlan);

    expect(getLastStoryBible()).toBeNull();
  });

  it('emits CURATING_CONTEXT and WRITING_CONTINUING_PAGE stages in order', async () => {
    mockedGenerateLorekeeperBible.mockResolvedValue(mockLorekeeperResult);
    mockedGeneratePageWriterOutput.mockResolvedValue(mockWriterResult);
    const stageCallback: GenerationStageCallback = jest.fn();

    const { generateWriter } = createContinuationWriterWithLorekeeper(
      createBaseContext({ onGenerationStage: stageCallback }),
    );
    await generateWriter(mockPagePlan);

    expect(stageCallback).toHaveBeenCalledTimes(3);
    expect(stageCallback).toHaveBeenNthCalledWith(1, {
      stage: 'CURATING_CONTEXT',
      status: 'started',
      attempt: 1,
    });
    expect(stageCallback).toHaveBeenNthCalledWith(2, {
      stage: 'CURATING_CONTEXT',
      status: 'completed',
      attempt: 1,
    });
    expect(stageCallback).toHaveBeenNthCalledWith(3, {
      stage: 'WRITING_CONTINUING_PAGE',
      status: 'started',
      attempt: 1,
    });
  });
});

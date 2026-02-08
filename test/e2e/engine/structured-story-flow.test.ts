import { storyEngine } from '@/engine';
import { generateWriterPage, generateAnalystEvaluation, generateOpeningPage, generateStoryStructure } from '@/llm';
import { StoryId } from '@/models';
import type { AnalystResult, WriterResult } from '@/llm/types';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generateWriterPage: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergeWriterAndAnalystResults: jest.requireActual('@/llm').mergeWriterAndAnalystResults,
  generateStoryStructure: jest.fn(),
}));

jest.mock('@/logging/index', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logPrompt: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateWriterPage = generateWriterPage as jest.MockedFunction<typeof generateWriterPage>;
const mockedGenerateAnalystEvaluation = generateAnalystEvaluation as jest.MockedFunction<typeof generateAnalystEvaluation>;
const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
  typeof generateStoryStructure
>;

const TEST_PREFIX = 'E2E TEST STRSTOARCSYS-016';

const mockedStructureResult = {
  overallTheme: 'Expose the hidden regime while keeping innocent allies safe.',
  acts: [
    {
      name: 'Act I - Discovery',
      objective: 'Prove the threat is real.',
      stakes: 'If you fail, nobody believes the danger.',
      entryCondition: 'A public anomaly forces immediate action.',
      beats: [
        {
          description: 'Witness a manipulated event in public.',
          objective: 'Collect undeniable first evidence.',
        },
        {
          description: 'Find a trustworthy contact.',
          objective: 'Avoid facing the threat alone.',
        },
      ],
    },
    {
      name: 'Act II - Escalation',
      objective: 'Break into the regime network.',
      stakes: 'If you fail, the enemy controls all information.',
      entryCondition: 'Initial evidence points to coordinated control.',
      beats: [
        {
          description: 'Infiltrate an archive node.',
          objective: 'Extract operational records.',
        },
        {
          description: 'Survive retaliation and regroup.',
          objective: 'Preserve momentum into the final phase.',
        },
      ],
    },
    {
      name: 'Act III - Resolution',
      objective: 'Force a decisive public outcome.',
      stakes: 'If you fail, the regime narrative becomes permanent.',
      entryCondition: 'Enough proof exists to challenge the system publicly.',
      beats: [
        {
          description: 'Coordinate allies for a public reveal.',
          objective: 'Synchronize final action.',
        },
        {
          description: 'Execute the final confrontation.',
          objective: 'Resolve the central conflict.',
        },
      ],
    },
  ],
  rawResponse: 'mock-structure',
};

const openingResult = {
  narrative:
    'You arrive in the rain-soaked capital square as the city clocks skip thirteen seconds in unison and every guard looks toward the archives.',
  choices: [
    'Pursue the masked courier through the archive tunnels',
    'Hide in the crowd and decode the clock anomaly first',
  ],
  currentLocation: 'Rain-soaked capital square',
  threatsAdded: ['Guards alerted by clock anomaly'],
  threatsRemoved: [],
  constraintsAdded: [],
  constraintsRemoved: [],
  threadsAdded: ['Clock anomaly synchronization mystery'],
  threadsResolved: [],
  protagonistAffect: {
    primaryEmotion: 'intrigue',
    primaryIntensity: 6,
    primaryCause: 'Witnessing impossible clock synchronization',
    secondaryEmotions: ['alertness', 'curiosity'],
    dominantMotivation: 'Uncover the source of the archive signal',
  },
  newCanonFacts: ['City clocks can be synchronized by a hidden archive signal'],
  newCharacterCanonFacts: {},
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  isEnding: false,
  beatConcluded: false,
  beatResolution: '',
  rawResponse: 'opening',
};

function buildWriterResult(selectedChoice: string, pageNumber: number): WriterResult {
  if (selectedChoice.includes('Pursue')) {
    return {
      narrative:
        'You catch the courier in a submerged tunnel and recover encoded route slips linking the archive signal to regime patrol schedules.',
      choices: ['Press deeper toward the signal source', 'Retreat and brief your contact'],
      currentLocation: 'Submerged archive tunnel',
      threatsAdded: [],
      threatsRemoved: ['Masked courier'],
      constraintsAdded: [`Courier evidence secured on page ${pageNumber}`],
      constraintsRemoved: [],
      threadsAdded: ['Archive signal linked to patrol schedules'],
      threadsResolved: [],
      protagonistAffect: {
        primaryEmotion: 'determination',
        primaryIntensity: 7,
        primaryCause: 'Successfully intercepting courier evidence',
        secondaryEmotions: ['urgency', 'focus'],
        dominantMotivation: 'Trace signal to its source',
      },
      newCanonFacts: ['Courier routes mirror archive broadcast timing'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      rawResponse: `continuation-pursue-${pageNumber}`,
    };
  }

  if (selectedChoice.includes('Press deeper')) {
    return {
      narrative:
        'At the signal chamber you copy command logs that prove the archive clocks are weaponized for mass disinformation.',
      choices: ['Exfiltrate with the logs', 'Trigger a distraction in the chamber'],
      currentLocation: 'Signal chamber deep in archive',
      threatsAdded: ['Chamber security systems'],
      threatsRemoved: [],
      constraintsAdded: [`Signal chamber logs copied on page ${pageNumber}`],
      constraintsRemoved: [],
      threadsAdded: ['Clock weaponization for disinformation confirmed'],
      threadsResolved: [],
      protagonistAffect: {
        primaryEmotion: 'triumph',
        primaryIntensity: 8,
        primaryCause: 'Obtaining proof of mass disinformation system',
        secondaryEmotions: ['vindication', 'caution'],
        dominantMotivation: 'Escape with the evidence intact',
      },
      newCanonFacts: ['Signal chambers distribute timing scripts to patrol sectors'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      rawResponse: `continuation-press-${pageNumber}`,
    };
  }

  return {
    narrative:
      'You stay hidden and map guard rotations from the crowd, gaining context but no decisive breakthrough yet.',
    choices: ['Follow a rotation change to the east gate', 'Wait for a second anomaly cycle'],
    currentLocation: 'Hidden in capital square crowd',
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [`Guard pattern mapped on page ${pageNumber}`],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
    protagonistAffect: {
      primaryEmotion: 'patience',
      primaryIntensity: 5,
      primaryCause: 'Gathering intelligence without taking risks',
      secondaryEmotions: ['caution', 'observation'],
      dominantMotivation: 'Wait for the right moment to act',
    },
    newCanonFacts: ['Guard rotations change immediately after clock anomalies'],
    newCharacterCanonFacts: {},
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    isEnding: false,
    rawResponse: `continuation-cautious-${pageNumber}`,
  };
}

function buildAnalystResult(narrative: string, pageNumber: number): AnalystResult {
  if (narrative.includes('catch the courier')) {
    return {
      beatConcluded: true,
      beatResolution: `Recovered decisive courier evidence on page ${pageNumber}.`,
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [] as string[],
      narrativeSummary: '',
      rawResponse: 'analyst-raw',
    };
  }

  if (narrative.includes('signal chamber')) {
    return {
      beatConcluded: true,
      beatResolution: `Copied chamber logs on page ${pageNumber}.`,
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [] as string[],
      narrativeSummary: '',
      rawResponse: 'analyst-raw',
    };
  }

  return {
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [] as string[],
    narrativeSummary: '',
    rawResponse: 'analyst-raw',
  };
}

describe('Structured Story E2E', () => {
  const createdStoryIds = new Set<StoryId>();
  let continuationCount = 0;

  beforeAll(() => {
    storyEngine.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    continuationCount = 0;

    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
    mockedGenerateOpeningPage.mockResolvedValue(openingResult);
    mockedGenerateWriterPage.mockImplementation((context) => {
      continuationCount += 1;
      return Promise.resolve(buildWriterResult(context.selectedChoice, continuationCount + 1));
    });
    mockedGenerateAnalystEvaluation.mockImplementation((context) => {
      return Promise.resolve(buildAnalystResult(context.narrative, continuationCount + 1));
    });
  });

  afterAll(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Keep cleanup failures from masking test assertions.
      }
    }
  });

  it('creates a story with valid structure and initial active beat', async () => {
    const { story, page } = await storyEngine.startStory({
      title: `${TEST_PREFIX} Initial Structure`,
      characterConcept: `${TEST_PREFIX}: A skeptical archivist trying to expose a regime signal hidden in civic clocks.`,
      worldbuilding: 'A capital where public timekeeping controls policing and access rights.',
      tone: 'political thriller',
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(story.id);

    expect(story.structure).not.toBeNull();
    expect(story.structure?.acts).toHaveLength(3);
    for (const act of story.structure?.acts ?? []) {
      expect(act.beats.length).toBeGreaterThanOrEqual(2);
      expect(act.beats.length).toBeLessThanOrEqual(4);
    }

    expect(page.accumulatedStructureState.currentActIndex).toBe(0);
    expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);

    const firstBeatId = story.structure?.acts[0]?.beats[0]?.id;
    expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
      beatId: firstBeatId,
      status: 'active',
    });
  });

  it('does not advance structure state when continuation does not conclude a beat', async () => {
    const { story, page: firstPage } = await storyEngine.startStory({
      title: `${TEST_PREFIX} Non-Advancing Continuation`,
      characterConcept: `${TEST_PREFIX}: A civic observer trying to decode manipulated time signals without direct confrontation.`,
      worldbuilding: 'Watchtowers trigger behavior shifts in entire districts.',
      tone: 'slow-burn mystery',
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(story.id);

    const { page: cautiousBranch } = await storyEngine.makeChoice({
      storyId: story.id,
      pageId: firstPage.id,
      choiceIndex: 1,
      apiKey: 'mock-api-key',
    });

    expect(cautiousBranch.accumulatedStructureState).toEqual(firstPage.accumulatedStructureState);
  });

  it('persists beat advancement across multiple generated pages', async () => {
    const { story, page: page1 } = await storyEngine.startStory({
      title: `${TEST_PREFIX} Beat Advancement`,
      characterConcept: `${TEST_PREFIX}: An investigator pursuing regime couriers through restricted infrastructure.`,
      worldbuilding: 'Flooded archives connect every district through hidden tunnels.',
      tone: 'urgent conspiracy',
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(story.id);

    const { page: page2 } = await storyEngine.makeChoice({
      storyId: story.id,
      pageId: page1.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    expect(page2.accumulatedStructureState.currentActIndex).toBe(0);
    expect(page2.accumulatedStructureState.currentBeatIndex).toBe(1);
    const concludedBeatOne = page2.accumulatedStructureState.beatProgressions.find(
      progression => progression.beatId === '1.1',
    );
    expect(concludedBeatOne).toMatchObject({
      beatId: '1.1',
      status: 'concluded',
    });
    expect(concludedBeatOne?.resolution).toContain('Recovered decisive courier evidence');

    const { page: page3 } = await storyEngine.makeChoice({
      storyId: story.id,
      pageId: page2.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    expect(page3.accumulatedStructureState.currentActIndex).toBe(1);
    expect(page3.accumulatedStructureState.currentBeatIndex).toBe(0);
    const concludedBeatTwo = page3.accumulatedStructureState.beatProgressions.find(
      progression => progression.beatId === '1.2',
    );
    expect(concludedBeatTwo).toMatchObject({
      beatId: '1.2',
      status: 'concluded',
    });
    expect(concludedBeatTwo?.resolution).toContain('Copied chamber logs');
    const activeBeat = page3.accumulatedStructureState.beatProgressions.find(
      progression => progression.beatId === '2.1',
    );
    expect(activeBeat).toMatchObject({
      beatId: '2.1',
      status: 'active',
    });
  });

  it('keeps structure progression isolated between sibling branches and survives reload', async () => {
    const { story, page: page1 } = await storyEngine.startStory({
      title: `${TEST_PREFIX} Branch Isolation`,
      characterConcept: `${TEST_PREFIX}: A field analyst balancing rapid action against cautious surveillance.`,
      worldbuilding: 'Every district contains mirrored patrol routes tied to archive clocks.',
      tone: 'strategic suspense',
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(story.id);

    const { page: branchFast } = await storyEngine.makeChoice({
      storyId: story.id,
      pageId: page1.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const { page: branchSlow } = await storyEngine.makeChoice({
      storyId: story.id,
      pageId: page1.id,
      choiceIndex: 1,
      apiKey: 'mock-api-key',
    });

    expect(branchFast.accumulatedStructureState.currentBeatIndex).toBe(1);
    expect(branchSlow.accumulatedStructureState.currentBeatIndex).toBe(0);

    const fastConcluded = branchFast.accumulatedStructureState.beatProgressions.find(
      (progression) => progression.beatId === '1.1',
    );
    const slowConcluded = branchSlow.accumulatedStructureState.beatProgressions.find(
      (progression) => progression.beatId === '1.1',
    );

    expect(fastConcluded?.status).toBe('concluded');
    expect(fastConcluded?.resolution).toBeTruthy();
    expect(slowConcluded?.status).toBe('active');

    const loadedStory = await storyEngine.loadStory(story.id);
    const loadedFastPage = await storyEngine.getPage(story.id, branchFast.id);
    const loadedSlowPage = await storyEngine.getPage(story.id, branchSlow.id);

    expect(loadedStory?.structure?.acts).toHaveLength(3);
    expect(loadedFastPage?.accumulatedStructureState).toEqual(branchFast.accumulatedStructureState);
    expect(loadedSlowPage?.accumulatedStructureState).toEqual(branchSlow.accumulatedStructureState);
  });
});

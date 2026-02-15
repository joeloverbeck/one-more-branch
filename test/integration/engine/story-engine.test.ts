import { storyEngine } from '@/engine';
import {
  generatePageWriterOutput,
  generateAnalystEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStateAccountant,
  generateStoryStructure,
  generateLorekeeperBible,
} from '@/llm';
import { parsePageId, StoryId } from '@/models';
import type { AnalystResult } from '@/llm/analyst-types';
import type { PageWriterResult } from '@/llm/writer-types';
import {
  createMockAnalystResult,
  createMockPageWriterResult,
  createMockProtagonistAffect,
} from '../../fixtures/llm-results';
import type { StorySpine } from '@/models';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
  generateStateAccountant: jest.fn(),
  generateLorekeeperBible: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergePageWriterAndReconciledStateWithAnalystResults:
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    jest.requireActual('@/llm').mergePageWriterAndReconciledStateWithAnalystResults,
  generateStoryStructure: jest.fn(),
  decomposeEntities: jest.fn().mockResolvedValue({
    decomposedCharacters: [],
    decomposedWorld: { facts: [], rawWorldbuilding: '' },
    rawResponse: '{}',
  }),
}));

jest.mock('@/logging/index', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logPrompt: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<
  typeof generateOpeningPage
>;
const mockedGenerateWriterPage = generatePageWriterOutput as jest.MockedFunction<
  typeof generatePageWriterOutput
>;
const mockedGenerateAnalystEvaluation = generateAnalystEvaluation as jest.MockedFunction<
  typeof generateAnalystEvaluation
>;
const mockedGeneratePagePlan = generatePagePlan as jest.MockedFunction<typeof generatePagePlan>;
const mockedGenerateStateAccountant = generateStateAccountant as jest.MockedFunction<
  typeof generateStateAccountant
>;
const mockedGenerateLorekeeperBible = generateLorekeeperBible as jest.MockedFunction<
  typeof generateLorekeeperBible
>;
const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
  typeof generateStoryStructure
>;

const TEST_PREFIX = 'TEST STOENG-008 engine integration';
const mockSpine: StorySpine = {
  centralDramaticQuestion: 'Can justice survive in a corrupt system?',
  protagonistNeedVsWant: { need: 'truth', want: 'safety', dynamic: 'DIVERGENT' },
  primaryAntagonisticForce: {
    description: 'The corrupt tribunal',
    pressureMechanism: 'Controls all records and courts',
  },
  storySpineType: 'MYSTERY',
  conflictType: 'PERSON_VS_SOCIETY',
  characterArcType: 'POSITIVE_CHANGE',
  toneKeywords: ['grim', 'tense', 'political'],
  toneAntiKeywords: ['whimsical', 'comedic'],
};
const mockedStructureResult = {
  overallTheme: 'Uncover the harbor conspiracy before dawn.',
  premise: 'A disgraced guard must infiltrate the tribunal that framed her.',
  pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
  acts: [
    {
      name: 'Act I',
      objective: 'Establish the threat.',
      stakes: 'Failure leaves the hero blind to danger.',
      entryCondition: 'A disturbing event forces involvement.',
      beats: [
        { description: 'Find first clue', objective: 'Confirm the mystery is real.' },
        { description: 'Secure local help', objective: 'Gain support to continue.' },
      ],
    },
    {
      name: 'Act II',
      objective: 'Escalate conflict.',
      stakes: 'Failure strengthens the antagonist.',
      entryCondition: 'The first clues reveal a wider network.',
      beats: [
        { description: 'Infiltrate hostile zone', objective: 'Collect decisive evidence.' },
        { description: 'Survive counterattack', objective: 'Keep momentum.' },
      ],
    },
    {
      name: 'Act III',
      objective: 'Resolve final confrontation.',
      stakes: 'Failure causes irreversible loss.',
      entryCondition: 'Evidence is strong enough to act publicly.',
      beats: [
        { description: 'Commit final plan', objective: 'Coordinate allies.' },
        { description: 'Execute resolution', objective: 'End central threat.' },
      ],
    },
  ],
  rawResponse: 'structure',
};

const openingResult = createMockPageWriterResult({
  narrative:
    'You step into Lanternport as the harbor lights ignite in impossible colors and every captain in the bay turns to watch your arrival in uneasy silence.',
  choices: [
    {
      text: 'Investigate the ember trail',
      choiceType: 'TACTICAL_APPROACH',
      primaryDelta: 'GOAL_SHIFT',
    },
    {
      text: 'Question the ferryman',
      choiceType: 'INVESTIGATION',
      primaryDelta: 'INFORMATION_REVEALED',
    },
  ],
  protagonistAffect: createMockProtagonistAffect({
    primaryEmotion: 'curiosity',
    primaryIntensity: 'moderate',
    primaryCause: 'The unnatural crimson fog and strange lights',
    secondaryEmotions: [{ emotion: 'unease', cause: 'The captains watching in silence' }],
    dominantMotivation: 'Understand the source of the strange phenomena',
  }),
  sceneSummary: 'Test summary of the scene events and consequences.',
  isEnding: false,
  rawResponse: 'opening',
});

function buildWriterResult(selectedChoice: string): PageWriterResult {
  if (selectedChoice === 'Investigate the ember trail') {
    return createMockPageWriterResult({
      narrative:
        'You follow embers down alleys of wet stone, where shuttered windows open just enough for whispered warnings and the ash forms a map beneath your boots.',
      choices: [
        {
          text: 'Enter the ash-marked chapel',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Return to the docks with proof',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      protagonistAffect: createMockProtagonistAffect({
        primaryEmotion: 'determination',
        primaryIntensity: 'strong',
        primaryCause: 'Following a clear trail of evidence',
        secondaryEmotions: [{ emotion: 'wariness', cause: 'The whispered warnings' }],
        dominantMotivation: 'Reach the source of the ember trail',
      }),
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: 'continuation-ember',
    });
  }

  return createMockPageWriterResult({
    narrative:
      'The ferryman speaks in a voice like scraped iron and admits he has rowed passengers to a pier that does not exist on any map, then offers you passage.',
    choices: [
      {
        text: 'Accept passage to the hidden pier',
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'GOAL_SHIFT',
      },
      {
        text: 'Detain the ferryman for answers',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'INFORMATION_REVEALED',
      },
    ],
    protagonistAffect: createMockProtagonistAffect({
      primaryEmotion: 'intrigue',
      primaryIntensity: 'moderate',
      primaryCause: 'The ferryman knows secrets about an unmapped pier',
      secondaryEmotions: [
        { emotion: 'suspicion', cause: 'The ferryman seems too willing to share' },
      ],
      dominantMotivation: 'Learn what the ferryman knows',
    }),
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
    rawResponse: 'continuation-ferryman',
  });
}

function buildAnalystResult(narrative: string): AnalystResult {
  if (narrative.includes('embers down alleys')) {
    return createMockAnalystResult({
      beatConcluded: true,
      beatResolution: 'The first clue clearly ties the fires to the harbor cartel.',
      sceneMomentum: 'MAJOR_PROGRESS',
      objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
      commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
    });
  }

  return createMockAnalystResult({
    beatConcluded: false,
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
  });
}

function createRewriteFetchResponse(): Response {
  const rewrittenStructure = {
    overallTheme: 'Adapt without losing your moral center.',
    acts: [
      {
        name: 'Act I Reframed',
        objective: 'Recover footing after a public betrayal.',
        stakes: 'Failure leaves the hero isolated.',
        entryCondition: 'The old alliances are broken.',
        beats: [
          {
            name: 'Trust rebuild',
            description: 'Rebuild trust with one key ally',
            objective: 'Secure a credible witness.',
          },
          {
            name: 'First lie exposed',
            description: 'Expose the first lie in the new regime',
            objective: 'Open a path to a counter-move.',
          },
        ],
      },
      {
        name: 'Act II Reframed',
        objective: 'Pressure the regime through targeted wins.',
        stakes: 'Failure cements authoritarian control.',
        entryCondition: 'New network is operational.',
        beats: [
          {
            name: 'Supply disruption',
            description: 'Disrupt supply chains feeding the regime',
            objective: 'Force visible concessions.',
          },
          {
            name: 'Retaliation survival',
            description: 'Survive coordinated retaliation',
            objective: 'Keep allies united under pressure.',
          },
        ],
      },
      {
        name: 'Act III Reframed',
        objective: 'Resolve the conflict and define the new order.',
        stakes: 'Failure normalizes permanent repression.',
        entryCondition: 'Public sentiment has shifted.',
        beats: [
          {
            name: 'Public reckoning',
            description: 'Force a public reckoning',
            objective: 'Reveal proof to the city.',
          },
          {
            name: 'Accountable power',
            description: 'Conclude with accountable power',
            objective: 'Prevent a return to old corruption.',
          },
        ],
      },
    ],
  };

  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(rewrittenStructure),
            },
          },
        ],
      }),
  } as Response;
}

describe('story-engine integration', () => {
  const createdStoryIds = new Set<StoryId>();

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();

    global.fetch = jest.fn().mockResolvedValue(createRewriteFetchResponse()) as typeof fetch;

    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
    mockedGeneratePagePlan.mockResolvedValue({
      sceneIntent: 'Drive the scene with direct consequences.',
      continuityAnchors: [],
      writerBrief: {
        openingLineDirective: 'Begin in motion.',
        mustIncludeBeats: [],
        forbiddenRecaps: [],
      },
      dramaticQuestion: 'Will you confront the danger or seek another path?',
      choiceIntents: [
        {
          hook: 'Face the threat directly',
          choiceType: 'CONFRONTATION',
          primaryDelta: 'THREAT_SHIFT',
        },
        {
          hook: 'Find an alternative route',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'LOCATION_CHANGE',
        },
      ],
      rawResponse: 'page-plan',
    });
    mockedGenerateStateAccountant.mockResolvedValue({
      stateIntents: {
        currentLocation: '',
        threats: { add: [], removeIds: [] },
        constraints: { add: [], removeIds: [] },
        threads: { add: [], resolveIds: [] },
        inventory: { add: [], removeIds: [] },
        health: { add: [], removeIds: [] },
        characterState: { add: [], removeIds: [] },
        canon: { worldAdd: [], characterAdd: [] },
      },
      rawResponse: 'accountant',
    });
    mockedGenerateLorekeeperBible.mockResolvedValue({
      sceneWorldContext: 'Test world context',
      relevantCharacters: [],
      relevantCanonFacts: [],
      relevantHistory: 'Test history',
      rawResponse: 'raw-lorekeeper',
    });
    mockedGenerateOpeningPage.mockResolvedValue(openingResult);
    mockedGenerateWriterPage.mockImplementation((context) =>
      Promise.resolve(buildWriterResult(context.selectedChoice))
    );
    mockedGenerateAnalystEvaluation.mockImplementation((context) =>
      Promise.resolve(buildAnalystResult(context.narrative))
    );
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Ignore cleanup failures to avoid hiding test errors.
      }
    }

    createdStoryIds.clear();

    jest.restoreAllMocks();

    const stories = await storyEngine.listStories();
    for (const story of stories) {
      if (story.characterConcept.startsWith(TEST_PREFIX)) {
        try {
          await storyEngine.deleteStory(story.id);
        } catch {
          // Ignore cleanup failures from stale fixtures.
        }
      }
    }
  });

  it('should create new story with first page', async () => {
    const result = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} create-first-page`,
      worldbuilding: 'A city where harbor lights can remember names.',
      tone: 'mystery adventure',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });

    createdStoryIds.add(result.story.id);

    expect(result.story.characterConcept).toContain('create-first-page');
    expect(result.story.structure?.acts).toHaveLength(3);
    expect(result.story.structure?.acts[0]?.beats[0]?.id).toBe('1.1');
    expect(result.page.id).toBe(1);
    expect(result.page.narrativeText.length).toBeGreaterThan(50);
    expect(result.page.choices.length).toBeGreaterThanOrEqual(2);
    expect(result.page.isEnding).toBe(false);
    expect(result.page.accumulatedStructureState.currentActIndex).toBe(0);
    expect(result.page.accumulatedStructureState.currentBeatIndex).toBe(0);
    expect(result.page.accumulatedStructureState.beatProgressions).toContainEqual({
      beatId: '1.1',
      status: 'active',
    });
    expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(1);
  });

  it('should make choice and generate new page', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} make-choice`,
      worldbuilding: 'A coast where fog preserves memories as sparks.',
      tone: 'tense mystery',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });
    createdStoryIds.add(start.story.id);

    const result = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    expect(result.page.id).toBe(2);
    expect(result.wasGenerated).toBe(true);
    expect(result.page.parentPageId).toBe(1);
    expect(result.page.parentChoiceIndex).toBe(0);
    expect(result.page.accumulatedStructureState.currentActIndex).toBe(0);
    expect(result.page.accumulatedStructureState.currentBeatIndex).toBe(1);
    expect(result.page.accumulatedStructureState.beatProgressions).toContainEqual({
      beatId: '1.1',
      status: 'concluded',
      resolution: 'The first clue clearly ties the fires to the harbor cartel.',
    });
    expect(result.page.accumulatedStructureState.beatProgressions).toContainEqual({
      beatId: '1.2',
      status: 'active',
    });
    expect(mockedGenerateWriterPage).toHaveBeenCalledTimes(1);
  });

  it('should advance to the next act when the final beat in the current act is concluded', async () => {
    mockedGenerateWriterPage
      .mockResolvedValueOnce({
        ...buildWriterResult('Investigate the ember trail'),
      })
      .mockResolvedValueOnce({
        ...buildWriterResult('Enter the ash-marked chapel'),
      });
    mockedGenerateAnalystEvaluation
      .mockResolvedValueOnce({
        beatConcluded: true,
        beatResolution: 'The first clue clearly ties the fires to the harbor cartel.',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none' as const,
        sceneMomentum: 'STASIS' as const,
        objectiveEvidenceStrength: 'NONE' as const,
        commitmentStrength: 'NONE' as const,
        structuralPositionSignal: 'WITHIN_ACTIVE_BEAT' as const,
        entryConditionReadiness: 'NOT_READY' as const,
        objectiveAnchors: [],
        anchorEvidence: [],
        completionGateSatisfied: false,
        completionGateFailureReason: '',
        toneAdherent: true,
        toneDriftDescription: '',
        npcCoherenceAdherent: true,
        npcCoherenceIssues: '',
        promisesDetected: [],
        promisesResolved: [],
        promisePayoffAssessments: [],
        threadPayoffAssessments: [],
        relationshipShiftsDetected: [],
        spineDeviationDetected: false,
        spineDeviationReason: '',
        spineInvalidatedElement: null,
        rawResponse: 'analyst-raw',
      })
      .mockResolvedValueOnce({
        beatConcluded: true,
        beatResolution: 'Local allies joined and the setup arc closed.',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none' as const,
        sceneMomentum: 'STASIS' as const,
        objectiveEvidenceStrength: 'NONE' as const,
        commitmentStrength: 'NONE' as const,
        structuralPositionSignal: 'WITHIN_ACTIVE_BEAT' as const,
        entryConditionReadiness: 'NOT_READY' as const,
        objectiveAnchors: [],
        anchorEvidence: [],
        completionGateSatisfied: false,
        completionGateFailureReason: '',
        toneAdherent: true,
        toneDriftDescription: '',
        npcCoherenceAdherent: true,
        npcCoherenceIssues: '',
        promisesDetected: [],
        promisesResolved: [],
        promisePayoffAssessments: [],
        threadPayoffAssessments: [],
        relationshipShiftsDetected: [],
        spineDeviationDetected: false,
        spineDeviationReason: '',
        spineInvalidatedElement: null,
        rawResponse: 'analyst-raw',
      });

    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} act-advance`,
      worldbuilding: 'A harbor where each district hides a different faction ledger.',
      tone: 'investigative suspense',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });
    createdStoryIds.add(start.story.id);

    const page2 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const page3 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page2.page.id,
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    expect(page3.page.accumulatedStructureState.currentActIndex).toBe(1);
    expect(page3.page.accumulatedStructureState.currentBeatIndex).toBe(0);
    expect(page3.page.accumulatedStructureState.beatProgressions).toContainEqual({
      beatId: '1.2',
      status: 'concluded',
      resolution: 'Local allies joined and the setup arc closed.',
    });
    expect(page3.page.accumulatedStructureState.beatProgressions).toContainEqual({
      beatId: '2.1',
      status: 'active',
    });
  });

  it('should load existing page without regeneration', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} replay-choice`,
      worldbuilding: 'A harbor where fire leaves written clues in the air.',
      tone: 'investigative fantasy',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });
    createdStoryIds.add(start.story.id);

    const first = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const second = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    expect(first.wasGenerated).toBe(true);
    expect(second.wasGenerated).toBe(false);
    expect(second.page.id).toBe(first.page.id);
    expect(second.page.narrativeText).toBe(first.page.narrativeText);
    expect(mockedGenerateWriterPage).toHaveBeenCalledTimes(1);
  });

  it('should maintain branch isolation', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} branch-isolation`,
      worldbuilding: 'An old port where every alley leads to a different rumor.',
      tone: 'suspenseful',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });
    createdStoryIds.add(start.story.id);

    const branchA = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const branchB = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 1,
      apiKey: 'test-api-key',
    });

    expect(branchA.page.id).not.toBe(branchB.page.id);
    expect(branchA.page.narrativeText).not.toBe(branchB.page.narrativeText);
    expect(branchA.page.parentPageId).toBe(1);
    expect(branchB.page.parentPageId).toBe(1);
    expect(branchA.page.parentChoiceIndex).toBe(0);
    expect(branchB.page.parentChoiceIndex).toBe(1);
    expect(branchA.page.accumulatedStructureState.currentBeatIndex).toBe(1);
    expect(branchB.page.accumulatedStructureState.currentBeatIndex).toBe(0);
    expect(branchA.page.accumulatedStructureState.beatProgressions).toContainEqual({
      beatId: '1.1',
      status: 'concluded',
      resolution: 'The first clue clearly ties the fires to the harbor cartel.',
    });
    expect(branchB.page.accumulatedStructureState.beatProgressions).toContainEqual({
      beatId: '1.1',
      status: 'active',
    });
    expect(mockedGenerateWriterPage).toHaveBeenCalledTimes(2);
  });

  it('should create a rewritten structure version and attach it to generated page when deviation is detected', async () => {
    mockedGenerateWriterPage
      .mockResolvedValueOnce({
        ...buildWriterResult('Investigate the ember trail'),
      })
      .mockResolvedValueOnce({
        ...buildWriterResult('Enter the ash-marked chapel'),
      });
    mockedGenerateAnalystEvaluation
      .mockResolvedValueOnce({
        // Opening page analyst - no beat conclusion, no deviation
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist arrives on the scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none' as const,
        sceneMomentum: 'STASIS' as const,
        objectiveEvidenceStrength: 'NONE' as const,
        commitmentStrength: 'NONE' as const,
        structuralPositionSignal: 'WITHIN_ACTIVE_BEAT' as const,
        entryConditionReadiness: 'NOT_READY' as const,
        objectiveAnchors: [],
        anchorEvidence: [],
        completionGateSatisfied: false,
        completionGateFailureReason: '',
        toneAdherent: true,
        toneDriftDescription: '',
        npcCoherenceAdherent: true,
        npcCoherenceIssues: '',
        promisesDetected: [],
        promisesResolved: [],
        promisePayoffAssessments: [],
        threadPayoffAssessments: [],
        relationshipShiftsDetected: [],
        spineDeviationDetected: false,
        spineDeviationReason: '',
        spineInvalidatedElement: null,
        rawResponse: 'analyst-raw',
      })
      .mockResolvedValueOnce({
        beatConcluded: true,
        beatResolution: 'The harbor cartel link is proven beyond doubt.',
        deviationDetected: false,
        deviationReason: '',
        invalidatedBeatIds: [],
        narrativeSummary: 'The protagonist continues the current scene.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none' as const,
        sceneMomentum: 'STASIS' as const,
        objectiveEvidenceStrength: 'NONE' as const,
        commitmentStrength: 'NONE' as const,
        structuralPositionSignal: 'WITHIN_ACTIVE_BEAT' as const,
        entryConditionReadiness: 'NOT_READY' as const,
        objectiveAnchors: [],
        anchorEvidence: [],
        completionGateSatisfied: false,
        completionGateFailureReason: '',
        toneAdherent: true,
        toneDriftDescription: '',
        npcCoherenceAdherent: true,
        npcCoherenceIssues: '',
        promisesDetected: [],
        promisesResolved: [],
        promisePayoffAssessments: [],
        threadPayoffAssessments: [],
        relationshipShiftsDetected: [],
        spineDeviationDetected: false,
        spineDeviationReason: '',
        spineInvalidatedElement: null,
        rawResponse: 'analyst-raw',
      })
      .mockResolvedValueOnce({
        beatConcluded: false,
        beatResolution: '',
        deviationDetected: true,
        deviationReason: 'The protagonist publicly defects, invalidating infiltration beats.',
        invalidatedBeatIds: ['2.1', '2.2', '3.1', '3.2'],
        narrativeSummary: 'The city now sees the protagonist as aligned with the regime on paper.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none' as const,
        sceneMomentum: 'STASIS' as const,
        objectiveEvidenceStrength: 'NONE' as const,
        commitmentStrength: 'NONE' as const,
        structuralPositionSignal: 'WITHIN_ACTIVE_BEAT' as const,
        entryConditionReadiness: 'NOT_READY' as const,
        objectiveAnchors: [],
        anchorEvidence: [],
        completionGateSatisfied: false,
        completionGateFailureReason: '',
        toneAdherent: true,
        toneDriftDescription: '',
        npcCoherenceAdherent: true,
        npcCoherenceIssues: '',
        promisesDetected: [],
        promisesResolved: [],
        promisePayoffAssessments: [],
        threadPayoffAssessments: [],
        relationshipShiftsDetected: [],
        spineDeviationDetected: false,
        spineDeviationReason: '',
        spineInvalidatedElement: null,
        rawResponse: 'analyst-raw',
      });

    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Title`,
      characterConcept: `${TEST_PREFIX} rewrite-flow`,
      worldbuilding: 'A storm-lit port where alliances flip overnight.',
      tone: 'political mystery',
      apiKey: 'test-api-key',
      spine: mockSpine,
    });
    createdStoryIds.add(start.story.id);

    const page2 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: parsePageId(1),
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const page3 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page2.page.id,
      choiceIndex: 0,
      apiKey: 'test-api-key',
    });

    const reloadedStory = await storyEngine.loadStory(start.story.id);

    expect(reloadedStory).not.toBeNull();
    expect(reloadedStory?.structureVersions).toHaveLength(2);

    const initialVersion = reloadedStory?.structureVersions?.[0];
    const rewrittenVersion = reloadedStory?.structureVersions?.[1];

    expect(initialVersion).toBeDefined();
    expect(rewrittenVersion).toBeDefined();
    expect(rewrittenVersion?.previousVersionId).toBe(initialVersion?.id);
    expect(rewrittenVersion?.createdAtPageId).toBe(page3.page.id);
    expect(rewrittenVersion?.rewriteReason).toBe(
      'The protagonist publicly defects, invalidating infiltration beats.'
    );

    expect(page2.page.structureVersionId).toBe(initialVersion?.id ?? null);
    expect(page3.page.structureVersionId).toBe(rewrittenVersion?.id ?? null);
    expect(page3.page.structureVersionId).not.toBe(page2.page.structureVersionId);
  });
});

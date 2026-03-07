import { storyEngine } from '@/engine';
import {
  generatePageWriterOutput,
  generateStructureEvaluation,
  generatePromiseTracking,
  generateProseQualityEvaluation,
  generateNpcIntelligenceEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStateAccountant,
  generateStoryStructure,
  generateLorekeeperBible,
  generateChoices,
} from '@/llm';
import { parsePageId, StoryId } from '@/models';
import type { AnalystResult } from '@/llm/analyst-types';
import type { StructureEvaluatorResult } from '@/llm/structure-evaluator-types';
import type { PromiseTrackerResult } from '@/llm/promise-tracker-types';
import type { ProseQualityResult } from '@/llm/prose-quality-types';
import type { NpcIntelligenceResult } from '@/llm/npc-intelligence-types';
import type { PageWriterResult } from '@/llm/writer-types';
import {
  createMockAnalystResult,
  createMockPageWriterResult,
  createMockProtagonistAffect,
} from '../../fixtures/llm-results';
import type { StorySpine } from '@/models';

jest.mock('@/llm/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...jest.requireActual('@/llm/client'),
    generateStructureEvaluation: jest.fn(),
    generatePromiseTracking: jest.fn(),
    generateProseQualityEvaluation: jest.fn(),
    generateNpcIntelligenceEvaluation: jest.fn(),
  };
});

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateStructureEvaluation: jest.fn(),
  generatePromiseTracking: jest.fn(),
  generateProseQualityEvaluation: jest.fn(),
  generateNpcIntelligenceEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
  generateStateAccountant: jest.fn(),
  generateLorekeeperBible: jest.fn(),
  generateChoices: jest.fn().mockResolvedValue({
    choices: [
      { text: 'Option A', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Option B', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    rawResponse: '{}',
  }),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
// Import from the mocked @/llm/client to get the actual mock instances
// that analyst-evaluation.ts will use
// eslint-disable-next-line @typescript-eslint/no-require-imports
const llmClient = require('@/llm/client') as {
  generateStructureEvaluation: jest.MockedFunction<typeof generateStructureEvaluation>;
  generatePromiseTracking: jest.MockedFunction<typeof generatePromiseTracking>;
  generateProseQualityEvaluation: jest.MockedFunction<typeof generateProseQualityEvaluation>;
  generateNpcIntelligenceEvaluation: jest.MockedFunction<typeof generateNpcIntelligenceEvaluation>;
};
const mockedGenerateStructureEvaluation = llmClient.generateStructureEvaluation;
const mockedGeneratePromiseTracking = llmClient.generatePromiseTracking;
const mockedGenerateProseQualityEvaluation = llmClient.generateProseQualityEvaluation;
const mockedGenerateNpcIntelligenceEvaluation = llmClient.generateNpcIntelligenceEvaluation;
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
const mockedGenerateChoices = generateChoices as jest.MockedFunction<typeof generateChoices>;

function extractStructureResult(
  ar: AnalystResult
): StructureEvaluatorResult & { rawResponse: string } {
  return {
    beatConcluded: ar.beatConcluded,
    beatResolution: ar.beatResolution,
    sceneMomentum: ar.sceneMomentum,
    objectiveEvidenceStrength: ar.objectiveEvidenceStrength,
    commitmentStrength: ar.commitmentStrength,
    structuralPositionSignal: ar.structuralPositionSignal,
    entryConditionReadiness: ar.entryConditionReadiness,
    objectiveAnchors: ar.objectiveAnchors,
    anchorEvidence: ar.anchorEvidence,
    completionGateSatisfied: ar.completionGateSatisfied,
    completionGateFailureReason: ar.completionGateFailureReason,
    deviationDetected: ar.deviationDetected,
    deviationReason: ar.deviationReason,
    invalidatedBeatIds: ar.invalidatedBeatIds,
    spineDeviationDetected: ar.spineDeviationDetected,
    spineDeviationReason: ar.spineDeviationReason,
    spineInvalidatedElement: ar.spineInvalidatedElement,
    alignedBeatId: ar.alignedBeatId,
    beatAlignmentConfidence: ar.beatAlignmentConfidence,
    beatAlignmentReason: ar.beatAlignmentReason,
    pacingIssueDetected: ar.pacingIssueDetected,
    pacingIssueReason: ar.pacingIssueReason,
    recommendedAction: ar.recommendedAction,
    pacingDirective: ar.pacingDirective ?? '',
    narrativeSummary: ar.narrativeSummary,
    rawResponse: ar.rawResponse,
  };
}

function extractPromiseResult(
  ar: AnalystResult
): PromiseTrackerResult & { rawResponse: string } {
  return {
    promisesDetected: ar.promisesDetected,
    promisesResolved: ar.promisesResolved,
    promisePayoffAssessments: ar.promisePayoffAssessments,
    threadPayoffAssessments: ar.threadPayoffAssessments,
    premisePromiseFulfilled: ar.premisePromiseFulfilled ?? null,
    obligatorySceneFulfilled: ar.obligatorySceneFulfilled ?? null,
    delayedConsequencesTriggered: ar.delayedConsequencesTriggered ?? [],
    delayedConsequencesCreated: ar.delayedConsequencesCreated ?? [],
    rawResponse: ar.rawResponse,
  };
}

function extractProseQualityResult(
  ar: AnalystResult
): ProseQualityResult & { rawResponse: string } {
  return {
    toneAdherent: ar.toneAdherent,
    toneDriftDescription: ar.toneDriftDescription,
    thematicCharge: ar.thematicCharge,
    thematicChargeDescription: ar.thematicChargeDescription,
    narrativeFocus: ar.narrativeFocus,
    rawResponse: ar.rawResponse,
  };
}

function extractNpcIntelligenceResult(
  ar: AnalystResult
): NpcIntelligenceResult & { rawResponse: string } {
  return {
    npcCoherenceAdherent: ar.npcCoherenceAdherent,
    npcCoherenceIssues: ar.npcCoherenceIssues,
    relationshipShiftsDetected: ar.relationshipShiftsDetected,
    knowledgeAsymmetryDetected: ar.knowledgeAsymmetryDetected ?? [],
    dramaticIronyOpportunities: ar.dramaticIronyOpportunities ?? [],
    rawResponse: ar.rawResponse,
  };
}

const TEST_PREFIX = 'TEST STOENG-008 engine integration';
const mockSpine: StorySpine = {
  centralDramaticQuestion: 'Can justice survive in a corrupt system?',
  protagonistNeedVsWant: { need: 'truth', want: 'safety', dynamic: 'DIVERGENT' },
  primaryAntagonisticForce: {
    description: 'The corrupt tribunal',
    pressureMechanism: 'Controls all records and courts',
  },
  storySpineType: 'MYSTERY',
  conflictAxis: 'INDIVIDUAL_VS_SYSTEM',
  conflictType: 'PERSON_VS_SOCIETY',
  characterArcType: 'POSITIVE_CHANGE',
  toneFeel: ['grim', 'tense', 'political'],
  toneAvoid: ['whimsical', 'comedic'],
};
const mockedStructureResult = {
  overallTheme: 'Uncover the harbor conspiracy before dawn.',
  premise: 'A disgraced guard must infiltrate the tribunal that framed her.',
  openingImage: 'An opening image placeholder.',
  closingImage: 'A closing image placeholder.',
  pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
  acts: [
    {
      name: 'Act I',
      objective: 'Establish the threat.',
      stakes: 'Failure leaves the hero blind to danger.',
      entryCondition: 'A disturbing event forces involvement.',
      beats: [
        {
          description: 'Find first clue',
          objective: 'Confirm the mystery is real.',
          causalLink: 'Because the opening incident exposes an immediate anomaly.',
        },
        {
          description: 'Secure local help',
          objective: 'Gain support to continue.',
          causalLink: 'Because the first clue reveals the need for local access.',
        },
      ],
    },
    {
      name: 'Act II',
      objective: 'Escalate conflict.',
      stakes: 'Failure strengthens the antagonist.',
      entryCondition: 'The first clues reveal a wider network.',
      beats: [
        {
          description: 'Infiltrate hostile zone',
          objective: 'Collect decisive evidence.',
          causalLink: 'Because local support identifies a vulnerable entry point.',
        },
        {
          description: 'Survive counterattack',
          objective: 'Keep momentum.',
          causalLink: 'Because hostile-zone infiltration alerts regime defenders.',
        },
      ],
    },
    {
      name: 'Act III',
      objective: 'Resolve final confrontation.',
      stakes: 'Failure causes irreversible loss.',
      entryCondition: 'Evidence is strong enough to act publicly.',
      beats: [
        {
          description: 'Commit final plan',
          objective: 'Coordinate allies.',
          causalLink: 'Because surviving counterattack reveals regime deployment gaps.',
        },
        {
          description: 'Execute resolution',
          objective: 'End central threat.',
          causalLink: 'Because the final plan aligns allied pressure at once.',
        },
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
    openingImage: 'A lone operative in a rain-soaked alley beneath a tribunal banner.',
    closingImage: 'That operative on courthouse steps at sunrise as banners are torn down.',
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
            causalLink: 'Because the public betrayal isolates the protagonist.',
            isMidpoint: false,
            midpointType: null,
          },
          {
            name: 'First lie exposed',
            description: 'Expose the first lie in the new regime',
            objective: 'Open a path to a counter-move.',
            causalLink: 'Because trust rebuild provides a reliable witness trail.',
            isMidpoint: false,
            midpointType: null,
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
            causalLink: 'Because exposing the first lie identifies vulnerable supply nodes.',
            isMidpoint: true,
            midpointType: 'FALSE_VICTORY',
          },
          {
            name: 'Retaliation survival',
            description: 'Survive coordinated retaliation',
            objective: 'Keep allies united under pressure.',
            causalLink: 'Because supply disruption provokes regime retaliation.',
            isMidpoint: false,
            midpointType: null,
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
            causalLink: 'Because retaliation creates undeniable public evidence.',
            isMidpoint: false,
            midpointType: null,
          },
          {
            name: 'Accountable power',
            description: 'Conclude with accountable power',
            objective: 'Prevent a return to old corruption.',
            causalLink: 'Because public reckoning collapses the old command legitimacy.',
            isMidpoint: false,
            midpointType: null,
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
    mockedGenerateChoices.mockImplementation((context: { narrative: string }) => {
      if (context.narrative.includes('harbor lights')) {
        return Promise.resolve({
          choices: [
            { text: 'Investigate the ember trail', choiceType: 'TACTICAL_APPROACH' as const, primaryDelta: 'GOAL_SHIFT' as const },
            { text: 'Question the ferryman', choiceType: 'INVESTIGATION' as const, primaryDelta: 'INFORMATION_REVEALED' as const },
          ],
          rawResponse: '{}',
        });
      }
      if (context.narrative.includes('embers down alleys')) {
        return Promise.resolve({
          choices: [
            { text: 'Enter the ash-marked chapel', choiceType: 'TACTICAL_APPROACH' as const, primaryDelta: 'GOAL_SHIFT' as const },
            { text: 'Return to the docks with proof', choiceType: 'INVESTIGATION' as const, primaryDelta: 'INFORMATION_REVEALED' as const },
          ],
          rawResponse: '{}',
        });
      }
      return Promise.resolve({
        choices: [
          { text: 'Accept passage to the hidden pier', choiceType: 'TACTICAL_APPROACH' as const, primaryDelta: 'GOAL_SHIFT' as const },
          { text: 'Detain the ferryman for answers', choiceType: 'INVESTIGATION' as const, primaryDelta: 'INFORMATION_REVEALED' as const },
        ],
        rawResponse: '{}',
      });
    });
    mockedGenerateStructureEvaluation.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative);
      return Promise.resolve(extractStructureResult(ar));
    });
    mockedGeneratePromiseTracking.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative);
      return Promise.resolve(extractPromiseResult(ar));
    });
    mockedGenerateProseQualityEvaluation.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative);
      return Promise.resolve(extractProseQualityResult(ar));
    });
    mockedGenerateNpcIntelligenceEvaluation.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative);
      return Promise.resolve(extractNpcIntelligenceResult(ar));
    });
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
    // Opening page analyst result (no beat conclusion)
    const openingAnalyst = createMockAnalystResult({ rawResponse: 'analyst-raw' });
    const analystResult1 = createMockAnalystResult({
      beatConcluded: true,
      beatResolution: 'The first clue clearly ties the fires to the harbor cartel.',
      narrativeSummary: 'The protagonist continues the current scene.',
      sceneMomentum: 'STASIS',
      objectiveEvidenceStrength: 'NONE',
      commitmentStrength: 'NONE',
      rawResponse: 'analyst-raw',
    });
    const analystResult2 = createMockAnalystResult({
      beatConcluded: true,
      beatResolution: 'Local allies joined and the setup arc closed.',
      narrativeSummary: 'The protagonist continues the current scene.',
      sceneMomentum: 'STASIS',
      objectiveEvidenceStrength: 'NONE',
      commitmentStrength: 'NONE',
      rawResponse: 'analyst-raw',
    });
    mockedGenerateStructureEvaluation
      .mockResolvedValueOnce(extractStructureResult(openingAnalyst))
      .mockResolvedValueOnce(extractStructureResult(analystResult1))
      .mockResolvedValueOnce(extractStructureResult(analystResult2));
    mockedGeneratePromiseTracking
      .mockResolvedValueOnce(extractPromiseResult(openingAnalyst))
      .mockResolvedValueOnce(extractPromiseResult(analystResult1))
      .mockResolvedValueOnce(extractPromiseResult(analystResult2));
    mockedGenerateProseQualityEvaluation
      .mockResolvedValueOnce(extractProseQualityResult(openingAnalyst))
      .mockResolvedValueOnce(extractProseQualityResult(analystResult1))
      .mockResolvedValueOnce(extractProseQualityResult(analystResult2));
    mockedGenerateNpcIntelligenceEvaluation
      .mockResolvedValueOnce(extractNpcIntelligenceResult(openingAnalyst))
      .mockResolvedValueOnce(extractNpcIntelligenceResult(analystResult1))
      .mockResolvedValueOnce(extractNpcIntelligenceResult(analystResult2));

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
    const rewriteAnalyst1 = createMockAnalystResult({
      // Opening page analyst - no beat conclusion, no deviation
      narrativeSummary: 'The protagonist arrives on the scene.',
      sceneMomentum: 'STASIS',
      objectiveEvidenceStrength: 'NONE',
      commitmentStrength: 'NONE',
      rawResponse: 'analyst-raw',
    });
    const rewriteAnalyst2 = createMockAnalystResult({
      beatConcluded: true,
      beatResolution: 'The harbor cartel link is proven beyond doubt.',
      narrativeSummary: 'The protagonist continues the current scene.',
      sceneMomentum: 'STASIS',
      objectiveEvidenceStrength: 'NONE',
      commitmentStrength: 'NONE',
      rawResponse: 'analyst-raw',
    });
    const rewriteAnalyst3 = createMockAnalystResult({
      deviationDetected: true,
      deviationReason: 'The protagonist publicly defects, invalidating infiltration beats.',
      invalidatedBeatIds: ['2.1', '2.2', '3.1', '3.2'],
      narrativeSummary: 'The city now sees the protagonist as aligned with the regime on paper.',
      sceneMomentum: 'STASIS',
      objectiveEvidenceStrength: 'NONE',
      commitmentStrength: 'NONE',
      rawResponse: 'analyst-raw',
    });
    mockedGenerateStructureEvaluation
      .mockResolvedValueOnce(extractStructureResult(rewriteAnalyst1))
      .mockResolvedValueOnce(extractStructureResult(rewriteAnalyst2))
      .mockResolvedValueOnce(extractStructureResult(rewriteAnalyst3));
    mockedGeneratePromiseTracking
      .mockResolvedValueOnce(extractPromiseResult(rewriteAnalyst1))
      .mockResolvedValueOnce(extractPromiseResult(rewriteAnalyst2))
      .mockResolvedValueOnce(extractPromiseResult(rewriteAnalyst3));
    mockedGenerateProseQualityEvaluation
      .mockResolvedValueOnce(extractProseQualityResult(rewriteAnalyst1))
      .mockResolvedValueOnce(extractProseQualityResult(rewriteAnalyst2))
      .mockResolvedValueOnce(extractProseQualityResult(rewriteAnalyst3));
    mockedGenerateNpcIntelligenceEvaluation
      .mockResolvedValueOnce(extractNpcIntelligenceResult(rewriteAnalyst1))
      .mockResolvedValueOnce(extractNpcIntelligenceResult(rewriteAnalyst2))
      .mockResolvedValueOnce(extractNpcIntelligenceResult(rewriteAnalyst3));

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

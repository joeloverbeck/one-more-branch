import { StoryEngine, storyEngine } from '@/engine';
import {
  generatePageWriterOutput,
  generateStructureEvaluation,
  generatePromiseTracking,
  generateSceneQualityEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStateAccountant,
  generateStoryStructure,
} from '@/llm';
import { StoryId } from '@/models';
import type { AnalystResult } from '@/llm/analyst-types';
import type { StructureEvaluatorResult } from '@/llm/structure-evaluator-types';
import type { PromiseTrackerResult } from '@/llm/promise-tracker-types';
import type { SceneQualityResult } from '@/llm/scene-quality-types';
import type { PageWriterResult } from '@/llm/writer-types';
import type { StorySpine } from '@/models';
import {
  createMockAnalystResult,
  createMockFinalResult,
  createMockStoryStructure,
} from '../../fixtures/llm-results';

jest.mock('@/llm/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...jest.requireActual('@/llm/client'),
    generateStructureEvaluation: jest.fn(),
    generatePromiseTracking: jest.fn(),
    generateSceneQualityEvaluation: jest.fn(),
  };
});

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateStructureEvaluation: jest.fn(),
  generatePromiseTracking: jest.fn(),
  generateSceneQualityEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
  generateStateAccountant: jest.fn(),
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const llmClient = require('@/llm/client') as {
  generateStructureEvaluation: jest.MockedFunction<typeof generateStructureEvaluation>;
  generatePromiseTracking: jest.MockedFunction<typeof generatePromiseTracking>;
  generateSceneQualityEvaluation: jest.MockedFunction<typeof generateSceneQualityEvaluation>;
};
const mockedGenerateStructureEvaluation = llmClient.generateStructureEvaluation;
const mockedGeneratePromiseTracking = llmClient.generatePromiseTracking;
const mockedGenerateSceneQualityEvaluation = llmClient.generateSceneQualityEvaluation;
const mockedGeneratePagePlan = generatePagePlan as jest.MockedFunction<typeof generatePagePlan>;
const mockedGenerateStateAccountant = generateStateAccountant as jest.MockedFunction<
  typeof generateStateAccountant
>;
const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
  typeof generateStoryStructure
>;

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

function extractQualityResult(
  ar: AnalystResult
): SceneQualityResult & { rawResponse: string } {
  return {
    toneAdherent: ar.toneAdherent,
    toneDriftDescription: ar.toneDriftDescription,
    thematicCharge: ar.thematicCharge,
    thematicChargeDescription: ar.thematicChargeDescription,
    narrativeFocus: ar.narrativeFocus,
    npcCoherenceAdherent: ar.npcCoherenceAdherent,
    npcCoherenceIssues: ar.npcCoherenceIssues,
    relationshipShiftsDetected: ar.relationshipShiftsDetected,
    knowledgeAsymmetryDetected: ar.knowledgeAsymmetryDetected ?? [],
    dramaticIronyOpportunities: ar.dramaticIronyOpportunities ?? [],
    rawResponse: ar.rawResponse,
  };
}

const TEST_PREFIX = 'E2E TEST STRREWSYS-016';

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

const mockedStructureResult = createMockStoryStructure({
  overallTheme: 'Protect the city while exposing institutional betrayal.',
  acts: [
    {
      id: '1',
      name: 'Act I - Fracture',
      objective: 'Discover how the alliance is manipulated.',
      stakes: 'Failure locks the city into authoritarian control.',
      entryCondition: 'A public emergency forces immediate action.',
      beats: [
        {
          id: '1.1',
          name: 'Alliance commitment',
          description: 'Publicly commit to a risky alliance.',
          objective: 'Gain temporary access to restricted circles.',
          causalLink: 'Because of prior events.',
          role: 'setup',
        },
        {
          id: '1.2',
          name: 'Alliance control map',
          description: 'Privately map who controls the alliance.',
          objective: 'Find leverage before exposure.',
          causalLink: 'Because of prior events.',
          role: 'escalation',
        },
      ],
    },
    {
      id: '2',
      name: 'Act II - Countermove',
      objective: 'Break the alliance command network.',
      stakes: 'Failure gives the regime permanent narrative control.',
      entryCondition: 'The first command links are identified.',
      beats: [
        {
          id: '2.1',
          name: 'Command relay infiltration',
          description: 'Infiltrate the command relay.',
          objective: 'Extract plans before they are burned.',
          causalLink: 'Because of prior events.',
          role: 'escalation',
        },
        {
          id: '2.2',
          name: 'Informant protection',
          description: 'Protect informants from retaliation.',
          objective: 'Keep evidence channels alive.',
          causalLink: 'Because of prior events.',
          role: 'turning_point',
        },
      ],
    },
    {
      id: '3',
      name: 'Act III - Reckoning',
      objective: 'Force a public reckoning.',
      stakes: 'Failure normalizes the coup.',
      entryCondition: 'Enough evidence exists for direct challenge.',
      beats: [
        {
          id: '3.1',
          name: 'Witness assembly',
          description: 'Assemble witnesses for public testimony.',
          objective: 'Make suppression impossible.',
          causalLink: 'Because of prior events.',
          role: 'escalation',
        },
        {
          id: '3.2',
          name: 'Civic forum confrontation',
          description: 'Confront leadership in the civic forum.',
          objective: 'Resolve the conflict with public accountability.',
          causalLink: 'Because of prior events.',
          role: 'resolution',
        },
      ],
    },
  ],
  rawResponse: 'initial-structure',
});

const openingResult = createMockFinalResult({
  narrative:
    'You step onto the flooded parliament steps and swear temporary loyalty so you can track who is rewriting emergency laws overnight.',
  choices: [
    {
      text: 'Commit to the alliance publicly',
      choiceType: 'TACTICAL_APPROACH',
      primaryDelta: 'GOAL_SHIFT',
    },
    {
      text: 'Refuse and go underground',
      choiceType: 'INVESTIGATION',
      primaryDelta: 'INFORMATION_REVEALED',
    },
  ],
  currentLocation: 'Flooded parliament steps',
  threatsAdded: ['Regime surveillance on parliament grounds'],
  constraintsAdded: ['Sworn temporary loyalty to alliance'],
  threadsAdded: [
    { text: 'Tracking emergency law rewrites', threadType: 'INFORMATION', urgency: 'MEDIUM' },
  ],
  protagonistAffect: {
    primaryEmotion: 'determination',
    primaryIntensity: 'overwhelming',
    primaryCause: 'Infiltrating alliance to expose law manipulation',
    secondaryEmotions: ['caution', 'resolve'],
    dominantMotivation: 'Discover who controls emergency law changes',
  },
  newCanonFacts: [{ text: 'Emergency laws can be changed between bell strikes', factType: 'LAW' }],
  sceneSummary: 'Test summary of the scene events and consequences.',
  rawResponse: 'opening',
});

function createRewriteFetchResponse(): Response {
  const rewrittenStructure = {
    overallTheme: 'Protect the city while exposing institutional betrayal.',
    openingImage: 'Flooded parliament steps under emergency sirens.',
    closingImage: 'A daylight civic forum after emergency powers are revoked.',
    acts: [
      {
        name: 'Act I Reframed',
        objective: 'Stabilize trust after public compromise.',
        stakes: 'Failure leaves the hero isolated.',
        entryCondition: 'The alliance now sees the hero as compromised.',
        beats: [
          {
            name: 'Risky alliance commitment',
            description: 'Publicly commit to a risky alliance.',
            objective: 'Gain temporary access to restricted circles.',
            causalLink: 'Because the protagonist is publicly reframed by alliance propaganda.',
            isMidpoint: false,
            midpointType: null,
          },
          {
            name: 'Hidden ally trust repair',
            description: 'Rebuild trust with one hidden ally.',
            objective: 'Create a resilient evidence channel.',
            causalLink: 'Because risky commitment grants proximity but destroys private trust.',
            isMidpoint: false,
            midpointType: null,
          },
        ],
      },
      {
        name: 'Act II Reframed',
        objective: 'Attack the regime through legitimacy cracks.',
        stakes: 'Failure legitimizes emergency rule.',
        entryCondition: 'Hidden channels expose legal manipulation.',
        beats: [
          {
            name: 'Forged decree exposure',
            description: 'Expose forged emergency decrees.',
            objective: 'Disrupt command authority.',
            causalLink: 'Because hidden ally channels reveal decree forgery patterns.',
            isMidpoint: true,
            midpointType: 'FALSE_VICTORY',
          },
          {
            name: 'Witness shield',
            description: 'Shield witnesses from reprisals.',
            objective: 'Preserve evidence continuity.',
            causalLink: 'Because decree exposure triggers immediate witness retaliation.',
            isMidpoint: false,
            midpointType: null,
          },
        ],
      },
      {
        name: 'Act III Reframed',
        objective: 'Resolve the conflict in public view.',
        stakes: 'Failure rewrites history in favor of the regime.',
        entryCondition: 'Public doubt reaches critical mass.',
        beats: [
          {
            name: 'Public witness chain',
            description: 'Coordinate a public witness chain.',
            objective: 'Prevent information suppression.',
            causalLink: 'Because witness shield operations keep key testimony alive.',
            isMidpoint: false,
            midpointType: null,
          },
          {
            name: 'Binding civic vote',
            description: 'Force a binding civic vote.',
            objective: 'End emergency rule through accountability.',
            causalLink: 'Because the public witness chain shifts civic legitimacy.',
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

function buildWriterResult(selectedChoice: string): PageWriterResult {
  if (selectedChoice === 'Commit to the alliance publicly') {
    return createMockFinalResult({
      narrative:
        'Inside the alliance chamber you copy sealed dispatches proving law edits are synchronized to private signal towers.',
      choices: [
        {
          text: 'Leak your true intent to a dockworker ally',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Double down publicly to gain rank',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Alliance chamber interior',
      constraintsAdded: ['Copied dispatches as evidence'],
      threadsAdded: [
        { text: 'Signal tower coordination exposed', threadType: 'INFORMATION', urgency: 'MEDIUM' },
      ],
      protagonistAffect: {
        primaryEmotion: 'triumph',
        primaryIntensity: 'overwhelming',
        primaryCause: 'Successfully obtaining proof of law manipulation',
        secondaryEmotions: ['anticipation', 'tension'],
        dominantMotivation: 'Expose signal tower coordination to the public',
      },
      newCanonFacts: [{ text: 'Signal towers coordinate legal edits by district', factType: 'LAW' }],
      sceneSummary: 'Test summary of the scene events and consequences.',
      rawResponse: 'continuation-initial',
    });
  }

  if (selectedChoice === 'Leak your true intent to a dockworker ally') {
    return createMockFinalResult({
      narrative:
        'Your covert leak is exposed, and the alliance recasts you as a loyal enforcer, invalidating the original infiltration route.',
      choices: [
        {
          text: 'Rebuild trust with dockworkers',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Attempt immediate forum confrontation',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Alliance controlled territory',
      threatsAdded: ['Alliance propaganda targeting protagonist'],
      constraintsAdded: ['Cover identity compromised'],
      constraintsRemoved: ['Infiltration route access'],
      threadsAdded: [
        {
          text: 'Public perception inverted by propaganda',
          threadType: 'INFORMATION',
          urgency: 'MEDIUM',
        },
      ],
      protagonistAffect: {
        primaryEmotion: 'dismay',
        primaryIntensity: 'overwhelming',
        primaryCause: 'Cover blown and publicly reframed as regime loyalist',
        secondaryEmotions: ['frustration', 'desperation'],
        dominantMotivation: 'Rebuild credibility and salvage mission',
      },
      newCanonFacts: [{ text: 'Alliance propaganda can invert public loyalties in a single night', factType: 'LAW' }],
      sceneSummary: 'Test summary of the scene events and consequences.',
      rawResponse: 'continuation-deviation',
    });
  }

  return createMockFinalResult({
    narrative:
      'You and the dockworkers publish authenticated dispatches, forcing an emergency vote that dismantles the alliance command structure before dawn.',
    choices: [],
    currentLocation: 'Civic forum',
    threatsRemoved: ['Alliance command structure'],
    constraintsRemoved: ['Alliance emergency powers'],
    threadsResolved: ['Emergency law manipulation', 'Alliance control over city'],
    protagonistAffect: {
      primaryEmotion: 'vindication',
      primaryIntensity: 'overwhelming',
      primaryCause: 'Successfully dismantling alliance emergency authority',
      secondaryEmotions: ['relief', 'pride'],
      dominantMotivation: 'Ensure lasting accountability for the regime',
    },
    newCanonFacts: [{ text: 'Civic votes can immediately revoke emergency command chains', factType: 'LAW' }],
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: true,
    rawResponse: 'continuation-ending',
  });
}

function buildAnalystResult(narrative: string): AnalystResult {
  if (narrative.includes('copy sealed dispatches')) {
    return createMockAnalystResult({
      beatConcluded: true,
      beatResolution: 'Secured proof that alliance command controls emergency law edits.',
      sceneMomentum: 'MAJOR_PROGRESS',
      objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
      commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
      rawResponse: 'analyst-raw',
    });
  }

  if (narrative.includes('covert leak is exposed')) {
    return createMockAnalystResult({
      deviationDetected: true,
      deviationReason:
        'The protagonist is publicly framed as regime-aligned, invalidating infiltration beats.',
      invalidatedBeatIds: ['2.1', '2.2', '3.1', '3.2'],
      narrativeSummary: 'Public perception now places the protagonist inside alliance leadership.',
      sceneMomentum: 'REVERSAL_OR_SETBACK',
      objectiveEvidenceStrength: 'NONE',
      commitmentStrength: 'NONE',
      rawResponse: 'analyst-raw',
    });
  }

  return createMockAnalystResult({
    beatConcluded: true,
    beatResolution: 'Alliance emergency authority ended through public accountability.',
    sceneMomentum: 'MAJOR_PROGRESS',
    objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
    commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
    rawResponse: 'analyst-raw',
  });
}

describe('Structure Rewriting Journey E2E', () => {
  const createdStoryIds = new Set<StoryId>();
  let originalFetch: typeof fetch;

  beforeAll(() => {
    storyEngine.init();
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGeneratePagePlan.mockResolvedValue({
      sceneIntent: 'Advance the rewritten branch with concrete outcomes.',
      continuityAnchors: [],
      writerBrief: {
        openingLineDirective: 'Start with decisive action.',
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

    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
    mockedGenerateOpeningPage.mockResolvedValue(openingResult);
    mockedGenerateWriterPage.mockImplementation((context) =>
      Promise.resolve(buildWriterResult(context.selectedChoice))
    );
    mockedGenerateStructureEvaluation.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative);
      return Promise.resolve(extractStructureResult(ar));
    });
    mockedGeneratePromiseTracking.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative);
      return Promise.resolve(extractPromiseResult(ar));
    });
    mockedGenerateSceneQualityEvaluation.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative);
      return Promise.resolve(extractQualityResult(ar));
    });

    global.fetch = jest.fn().mockResolvedValue(createRewriteFetchResponse()) as typeof fetch;
  });

  afterEach(async () => {
    global.fetch = originalFetch;

    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Keep cleanup failures from masking test assertions.
      }
    }

    createdStoryIds.clear();
  });

  it('completes a rewrite-aware playthrough with a valid structure version chain', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Rewrite Chain`,
      characterConcept: `${TEST_PREFIX}: A civic mediator navigating a staged alliance to expose legal manipulation.`,
      worldbuilding: 'A floodlit capital where emergency law changes follow hidden signal towers.',
      tone: 'political thriller',
      spine: mockSpine,
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(start.story.id);
    for (const act of start.story.structure?.acts ?? []) {
      for (const beat of act.beats) {
        expect(beat.name).toBeTruthy();
      }
    }

    const page2 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: start.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const page3 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page2.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const reloadedAfterRewrite = await storyEngine.loadStory(start.story.id);
    expect(reloadedAfterRewrite).not.toBeNull();
    expect(reloadedAfterRewrite?.structureVersions).toHaveLength(2);

    const initialVersion = reloadedAfterRewrite?.structureVersions?.[0];
    const rewrittenVersion = reloadedAfterRewrite?.structureVersions?.[1];

    expect(rewrittenVersion?.previousVersionId).toBe(initialVersion?.id);
    expect(rewrittenVersion?.createdAtPageId).toBe(page3.page.id);
    expect(rewrittenVersion?.rewriteReason).toBe(
      'The protagonist is publicly framed as regime-aligned, invalidating infiltration beats.'
    );
    expect(rewrittenVersion?.preservedBeatIds).toContain('1.1');
    expect(page2.page.structureVersionId).toBe(initialVersion?.id ?? null);
    expect(page3.page.structureVersionId).toBe(rewrittenVersion?.id ?? null);

    const page4 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page3.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    expect(page4.page.isEnding).toBe(true);
    expect(page4.page.choices).toHaveLength(0);
    expect(page4.page.structureVersionId).toBe(rewrittenVersion?.id ?? null);
  });

  it('replays generated rewritten pages and persists them across engine instances', async () => {
    const start = await storyEngine.startStory({
      title: `${TEST_PREFIX} Replay Rewrite`,
      characterConcept: `${TEST_PREFIX}: An alliance insider leaking proof while avoiding total exposure.`,
      worldbuilding: 'A harbor parliament where sirens authorize instant policy rewrites.',
      tone: 'suspense',
      spine: mockSpine,
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(start.story.id);

    const page2 = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: start.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const firstRewritePath = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page2.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    const replayRewritePath = await storyEngine.makeChoice({
      storyId: start.story.id,
      pageId: page2.page.id,
      choiceIndex: 0,
      apiKey: 'mock-api-key',
    });

    expect(firstRewritePath.wasGenerated).toBe(true);
    expect(replayRewritePath.wasGenerated).toBe(false);
    expect(replayRewritePath.page.id).toBe(firstRewritePath.page.id);
    expect(replayRewritePath.page.structureVersionId).toBe(
      firstRewritePath.page.structureVersionId
    );

    const secondEngine = new StoryEngine();
    secondEngine.init();

    const reloadedStory = await secondEngine.loadStory(start.story.id);
    const reloadedPage = await secondEngine.getPage(start.story.id, firstRewritePath.page.id);

    expect(reloadedStory?.structureVersions).toHaveLength(2);
    expect(reloadedPage?.structureVersionId).toBe(firstRewritePath.page.structureVersionId);
  });
});

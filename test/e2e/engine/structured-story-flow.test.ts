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
  generateChoices,
} from '@/llm';
import { StoryId } from '@/models';
import type { AnalystResult } from '@/llm/analyst-types';
import type { StructureEvaluatorResult } from '@/llm/structure-evaluator-types';
import type { PromiseTrackerResult } from '@/llm/promise-tracker-types';
import type { ProseQualityResult } from '@/llm/prose-quality-types';
import type { NpcIntelligenceResult } from '@/llm/npc-intelligence-types';
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

const TEST_PREFIX = 'E2E TEST STRSTOARCSYS-016';

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
  overallTheme: 'Expose the hidden regime while keeping innocent allies safe.',
  acts: [
    {
      id: '1',
      name: 'Act I - Discovery',
      objective: 'Prove the threat is real.',
      stakes: 'If you fail, nobody believes the danger.',
      entryCondition: 'A public anomaly forces immediate action.',
      beats: [
        {
          id: '1.1',
          name: 'Public anomaly witness',
          description: 'Witness a manipulated event in public.',
          objective: 'Collect undeniable first evidence.',
          causalLink: 'Because of prior events.',
          role: 'setup',
        },
        {
          id: '1.2',
          name: 'Trusted contact secured',
          description: 'Find a trustworthy contact.',
          objective: 'Avoid facing the threat alone.',
          causalLink: 'Because of prior events.',
          role: 'escalation',
        },
      ],
    },
    {
      id: '2',
      name: 'Act II - Escalation',
      objective: 'Break into the regime network.',
      stakes: 'If you fail, the enemy controls all information.',
      entryCondition: 'Initial evidence points to coordinated control.',
      beats: [
        {
          id: '2.1',
          name: 'Archive node infiltration',
          description: 'Infiltrate an archive node.',
          objective: 'Extract operational records.',
          causalLink: 'Because of prior events.',
          role: 'escalation',
        },
        {
          id: '2.2',
          name: 'Retaliation survival',
          description: 'Survive retaliation and regroup.',
          objective: 'Preserve momentum into the final phase.',
          causalLink: 'Because of prior events.',
          role: 'turning_point',
        },
      ],
    },
    {
      id: '3',
      name: 'Act III - Resolution',
      objective: 'Force a decisive public outcome.',
      stakes: 'If you fail, the regime narrative becomes permanent.',
      entryCondition: 'Enough proof exists to challenge the system publicly.',
      beats: [
        {
          id: '3.1',
          name: 'Public reveal coordination',
          description: 'Coordinate allies for a public reveal.',
          objective: 'Synchronize final action.',
          causalLink: 'Because of prior events.',
          role: 'escalation',
        },
        {
          id: '3.2',
          name: 'Final confrontation',
          description: 'Execute the final confrontation.',
          objective: 'Resolve the central conflict.',
          causalLink: 'Because of prior events.',
          role: 'resolution',
        },
      ],
    },
  ],
  rawResponse: 'mock-structure',
});

const openingResult = createMockFinalResult({
  narrative:
    'You arrive in the rain-soaked capital square as the city clocks skip thirteen seconds in unison and every guard looks toward the archives.',
  choices: [
    {
      text: 'Pursue the masked courier through the archive tunnels',
      choiceType: 'TACTICAL_APPROACH',
      primaryDelta: 'GOAL_SHIFT',
    },
    {
      text: 'Hide in the crowd and decode the clock anomaly first',
      choiceType: 'INVESTIGATION',
      primaryDelta: 'INFORMATION_REVEALED',
    },
  ],
  currentLocation: 'Rain-soaked capital square',
  threatsAdded: ['Guards alerted by clock anomaly'],
  threadsAdded: [
    { text: 'Clock anomaly synchronization mystery', threadType: 'INFORMATION', urgency: 'MEDIUM' },
  ],
  protagonistAffect: {
    primaryEmotion: 'intrigue',
    primaryIntensity: 'strong',
    primaryCause: 'Witnessing impossible clock synchronization',
    secondaryEmotions: ['alertness', 'curiosity'],
    dominantMotivation: 'Uncover the source of the archive signal',
  },
  newCanonFacts: [{ text: 'City clocks can be synchronized by a hidden archive signal', factType: 'LAW' }],
  sceneSummary: 'Test summary of the scene events and consequences.',
  rawResponse: 'opening',
});

function buildWriterResult(selectedChoice: string, pageNumber: number): PageWriterResult {
  if (selectedChoice.includes('Pursue')) {
    return createMockFinalResult({
      narrative:
        'You catch the courier in a submerged tunnel and recover encoded route slips linking the archive signal to regime patrol schedules.',
      choices: [
        {
          text: 'Press deeper toward the signal source',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Retreat and brief your contact',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Submerged archive tunnel',
      threatsRemoved: ['Masked courier'],
      constraintsAdded: [`Courier evidence secured on page ${pageNumber}`],
      threadsAdded: [
        {
          text: 'Archive signal linked to patrol schedules',
          threadType: 'INFORMATION',
          urgency: 'MEDIUM',
        },
      ],
      protagonistAffect: {
        primaryEmotion: 'determination',
        primaryIntensity: 'overwhelming',
        primaryCause: 'Successfully intercepting courier evidence',
        secondaryEmotions: ['urgency', 'focus'],
        dominantMotivation: 'Trace signal to its source',
      },
      newCanonFacts: [{ text: 'Courier routes mirror archive broadcast timing', factType: 'LAW' }],
      sceneSummary: 'Test summary of the scene events and consequences.',
      rawResponse: `continuation-pursue-${pageNumber}`,
    });
  }

  if (selectedChoice.includes('Press deeper')) {
    return createMockFinalResult({
      narrative:
        'At the signal chamber you copy command logs that prove the archive clocks are weaponized for mass disinformation.',
      choices: [
        {
          text: 'Exfiltrate with the logs',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Trigger a distraction in the chamber',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'Signal chamber deep in archive',
      threatsAdded: ['Chamber security systems'],
      constraintsAdded: [`Signal chamber logs copied on page ${pageNumber}`],
      threadsAdded: [
        {
          text: 'Clock weaponization for disinformation confirmed',
          threadType: 'INFORMATION',
          urgency: 'MEDIUM',
        },
      ],
      protagonistAffect: {
        primaryEmotion: 'triumph',
        primaryIntensity: 'overwhelming',
        primaryCause: 'Obtaining proof of mass disinformation system',
        secondaryEmotions: ['vindication', 'caution'],
        dominantMotivation: 'Escape with the evidence intact',
      },
      newCanonFacts: [{ text: 'Signal chambers distribute timing scripts to patrol sectors', factType: 'LAW' }],
      sceneSummary: 'Test summary of the scene events and consequences.',
      rawResponse: `continuation-press-${pageNumber}`,
    });
  }

  return createMockFinalResult({
    narrative:
      'You stay hidden and map guard rotations from the crowd, gaining context but no decisive breakthrough yet.',
    choices: [
      {
        text: 'Follow a rotation change to the east gate',
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'GOAL_SHIFT',
      },
      {
        text: 'Wait for a second anomaly cycle',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'INFORMATION_REVEALED',
      },
    ],
    currentLocation: 'Hidden in capital square crowd',
    constraintsAdded: [`Guard pattern mapped on page ${pageNumber}`],
    protagonistAffect: {
      primaryEmotion: 'patience',
      primaryIntensity: 'moderate',
      primaryCause: 'Gathering intelligence without taking risks',
      secondaryEmotions: ['caution', 'observation'],
      dominantMotivation: 'Wait for the right moment to act',
    },
    newCanonFacts: [{ text: 'Guard rotations change immediately after clock anomalies', factType: 'LAW' }],
    sceneSummary: 'Test summary of the scene events and consequences.',
    rawResponse: `continuation-cautious-${pageNumber}`,
  });
}

function buildAnalystResult(narrative: string, pageNumber: number): AnalystResult {
  if (narrative.includes('catch the courier')) {
    return createMockAnalystResult({
      beatConcluded: true,
      beatResolution: `Recovered decisive courier evidence on page ${pageNumber}.`,
      sceneMomentum: 'MAJOR_PROGRESS',
      objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
      commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
      rawResponse: 'analyst-raw',
    });
  }

  if (narrative.includes('signal chamber')) {
    return createMockAnalystResult({
      beatConcluded: true,
      beatResolution: `Copied chamber logs on page ${pageNumber}.`,
      sceneMomentum: 'MAJOR_PROGRESS',
      objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
      commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
      rawResponse: 'analyst-raw',
    });
  }

  return createMockAnalystResult({
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
    rawResponse: 'analyst-raw',
  });
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
    mockedGeneratePagePlan.mockResolvedValue({
      sceneIntent: 'Drive the current branch with immediate outcomes.',
      continuityAnchors: [],
      writerBrief: {
        openingLineDirective: 'Begin with direct consequence.',
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
    mockedGenerateWriterPage.mockImplementation((context) => {
      continuationCount += 1;
      return Promise.resolve(buildWriterResult(context.selectedChoice, continuationCount + 1));
    });
    mockedGenerateChoices.mockImplementation((context: { narrative: string }) => {
      if (context.narrative.includes('rain-soaked capital')) {
        return Promise.resolve({
          choices: [
            { text: 'Pursue the masked courier through the archive tunnels', choiceType: 'TACTICAL_APPROACH' as const, primaryDelta: 'GOAL_SHIFT' as const },
            { text: 'Hide in the crowd and decode the clock anomaly first', choiceType: 'INVESTIGATION' as const, primaryDelta: 'INFORMATION_REVEALED' as const },
          ],
          rawResponse: '{}',
        });
      }
      if (context.narrative.includes('catch the courier')) {
        return Promise.resolve({
          choices: [
            { text: 'Press deeper toward the signal source', choiceType: 'TACTICAL_APPROACH' as const, primaryDelta: 'GOAL_SHIFT' as const },
            { text: 'Retreat and brief your contact', choiceType: 'INVESTIGATION' as const, primaryDelta: 'INFORMATION_REVEALED' as const },
          ],
          rawResponse: '{}',
        });
      }
      if (context.narrative.includes('signal chamber')) {
        return Promise.resolve({
          choices: [
            { text: 'Exfiltrate with the logs', choiceType: 'TACTICAL_APPROACH' as const, primaryDelta: 'GOAL_SHIFT' as const },
            { text: 'Trigger a distraction in the chamber', choiceType: 'INVESTIGATION' as const, primaryDelta: 'INFORMATION_REVEALED' as const },
          ],
          rawResponse: '{}',
        });
      }
      return Promise.resolve({
        choices: [
          { text: 'Continue forward', choiceType: 'TACTICAL_APPROACH' as const, primaryDelta: 'GOAL_SHIFT' as const },
          { text: 'Investigate surroundings', choiceType: 'INVESTIGATION' as const, primaryDelta: 'INFORMATION_REVEALED' as const },
        ],
        rawResponse: '{}',
      });
    });
    mockedGenerateStructureEvaluation.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative, continuationCount + 1);
      return Promise.resolve(extractStructureResult(ar));
    });
    mockedGeneratePromiseTracking.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative, continuationCount + 1);
      return Promise.resolve(extractPromiseResult(ar));
    });
    mockedGenerateProseQualityEvaluation.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative, continuationCount + 1);
      return Promise.resolve(extractProseQualityResult(ar));
    });
    mockedGenerateNpcIntelligenceEvaluation.mockImplementation((context) => {
      const ar = buildAnalystResult(context.narrative, continuationCount + 1);
      return Promise.resolve(extractNpcIntelligenceResult(ar));
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
      spine: mockSpine,
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(story.id);

    expect(story.structure).not.toBeNull();
    expect(story.structure?.acts).toHaveLength(3);
    for (const act of story.structure?.acts ?? []) {
      expect(act.beats.length).toBeGreaterThanOrEqual(2);
      expect(act.beats.length).toBeLessThanOrEqual(4);
      for (const beat of act.beats) {
        expect(beat.name).toBeTruthy();
      }
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
      spine: mockSpine,
      apiKey: 'mock-api-key',
    });
    createdStoryIds.add(story.id);

    const { page: cautiousBranch } = await storyEngine.makeChoice({
      storyId: story.id,
      pageId: firstPage.id,
      choiceIndex: 1,
      apiKey: 'mock-api-key',
    });

    expect(cautiousBranch.accumulatedStructureState).toEqual({
      ...firstPage.accumulatedStructureState,
      pagesInCurrentBeat: firstPage.accumulatedStructureState.pagesInCurrentBeat + 1,
    });
  });

  it('persists beat advancement across multiple generated pages', async () => {
    const { story, page: page1 } = await storyEngine.startStory({
      title: `${TEST_PREFIX} Beat Advancement`,
      characterConcept: `${TEST_PREFIX}: An investigator pursuing regime couriers through restricted infrastructure.`,
      worldbuilding: 'Flooded archives connect every district through hidden tunnels.',
      tone: 'urgent conspiracy',
      spine: mockSpine,
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
      (progression) => progression.beatId === '1.1'
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
      (progression) => progression.beatId === '1.2'
    );
    expect(concludedBeatTwo).toMatchObject({
      beatId: '1.2',
      status: 'concluded',
    });
    expect(concludedBeatTwo?.resolution).toContain('Copied chamber logs');
    const activeBeat = page3.accumulatedStructureState.beatProgressions.find(
      (progression) => progression.beatId === '2.1'
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
      spine: mockSpine,
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
      (progression) => progression.beatId === '1.1'
    );
    const slowConcluded = branchSlow.accumulatedStructureState.beatProgressions.find(
      (progression) => progression.beatId === '1.1'
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

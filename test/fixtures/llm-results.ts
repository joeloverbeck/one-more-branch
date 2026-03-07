/**
 * Shared Test Factories for LLM Result Types
 *
 * Provides mock factories for AnalystResult, PageWriterResult,
 * StateReconciliationResult, ProtagonistAffect, and StoryStructure.
 *
 * Using these factories instead of inline object literals means that
 * when a field is added to an interface, only the factory needs updating
 * — not every test file that constructs that type.
 */

import type { AnalystResult } from '../../src/llm/analyst-types.js';
import type { PageWriterResult, FinalPageGenerationResult } from '../../src/llm/writer-types.js';
import type { StateReconciliationResult } from '../../src/engine/state-reconciler-types.js';
import type { ProtagonistAffect } from '../../src/models/protagonist-affect.js';
import type { StoryStructure } from '../../src/models/story-arc.js';
import { ChoiceType, PrimaryDelta } from '../../src/models/choice-enums.js';

/**
 * Creates a mock ProtagonistAffect with sensible defaults.
 */
export function createMockProtagonistAffect(
  overrides: Partial<ProtagonistAffect> = {}
): ProtagonistAffect {
  return {
    primaryEmotion: 'curiosity',
    primaryIntensity: 'moderate',
    primaryCause: 'Exploring the unknown',
    secondaryEmotions: [],
    dominantMotivation: 'Discover what lies ahead',
    ...overrides,
  };
}

/**
 * Creates a mock AnalystResult with all required fields.
 */
export function createMockAnalystResult(overrides: Partial<AnalystResult> = {}): AnalystResult {
  return {
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'INCREMENTAL_PROGRESS',
    objectiveEvidenceStrength: 'WEAK_IMPLICIT',
    commitmentStrength: 'TENTATIVE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
    pacingDirective: '',
    objectiveAnchors: [],
    anchorEvidence: [],
    completionGateSatisfied: false,
    completionGateFailureReason: '',
    toneAdherent: true,
    toneDriftDescription: '',
    promisesDetected: [],
    promisesResolved: [],
    promisePayoffAssessments: [],
    threadPayoffAssessments: [],
    npcCoherenceAdherent: true,
    npcCoherenceIssues: '',
    relationshipShiftsDetected: [],
    spineDeviationDetected: false,
    spineDeviationReason: '',
    spineInvalidatedElement: null,
    alignedBeatId: null,
    beatAlignmentConfidence: 'LOW',
    beatAlignmentReason: '',
    thematicCharge: 'AMBIGUOUS',
    narrativeFocus: 'BALANCED',
    thematicChargeDescription: '',
    obligatorySceneFulfilled: null,
    premisePromiseFulfilled: null,
    delayedConsequencesTriggered: [],
    delayedConsequencesCreated: [],
    knowledgeAsymmetryDetected: [],
    dramaticIronyOpportunities: [],
    rawResponse: '{}',
    ...overrides,
  };
}

/**
 * Creates a mock StateReconciliationResult with all required fields.
 */
export function createMockReconciliationResult(
  overrides: Partial<StateReconciliationResult> = {}
): StateReconciliationResult {
  return {
    currentLocation: 'Test location',
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    newCanonFacts: [],
    newCharacterCanonFacts: {},
    reconciliationDiagnostics: [],
    ...overrides,
  };
}

/**
 * Creates a mock PageWriterResult with all required fields.
 */
export function createMockPageWriterResult(
  overrides: Partial<PageWriterResult> = {}
): PageWriterResult {
  return {
    narrative: 'You step into the corridor.',
    sceneSummary: 'Explored the corridor.',
    protagonistAffect: createMockProtagonistAffect(),
    rawResponse: '{}',
    ...overrides,
  };
}

/**
 * Default mock choices for use in test factories.
 */
export const DEFAULT_MOCK_CHOICES = [
  { text: 'Go left', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.GOAL_SHIFT },
  { text: 'Go right', choiceType: ChoiceType.INVESTIGATION, primaryDelta: PrimaryDelta.INFORMATION_REVEALED },
] as const;

/**
 * Creates a mock FinalPageGenerationResult (PageWriterResult & StateReconciliationResult + choices).
 */
export function createMockFinalResult(
  overrides: Partial<FinalPageGenerationResult> = {}
): FinalPageGenerationResult {
  return {
    ...createMockPageWriterResult(),
    ...createMockReconciliationResult(),
    isEnding: false,
    choices: [...DEFAULT_MOCK_CHOICES],
    ...overrides,
  };
}

/**
 * Creates a mock StoryStructure with a single act and two beats.
 */
export function createMockStoryStructure(
  overrides: Partial<StoryStructure> = {}
): StoryStructure {
  return {
    acts: [
      {
        id: '1',
        name: 'Act I',
        objective: 'Begin the journey',
        stakes: 'Lose the opportunity forever',
        entryCondition: 'The call to action arrives',
        beats: [
          {
            id: '1.1',
            name: 'The call',
            description: 'The protagonist receives a call to action',
            objective: 'Accept the quest',
            causalLink: 'Because of prior events.',
            role: 'setup',
            escalationType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
          },
          {
            id: '1.2',
            name: 'Crossing the threshold',
            description: 'The protagonist crosses into the unknown',
            objective: 'Leave safety behind',
            causalLink: 'Because of prior events.',
            role: 'turning_point',
            escalationType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
          },
        ],
      },
    ],
    overallTheme: 'Courage in the face of uncertainty',
    premise: 'A reluctant hero must leave safety to confront a growing threat.',
    openingImage: 'An opening image placeholder.',
    closingImage: 'A closing image placeholder.',
    pacingBudget: { targetPagesMin: 12, targetPagesMax: 28 },
    generatedAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

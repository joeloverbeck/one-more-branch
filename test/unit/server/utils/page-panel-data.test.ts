import {
  createChoice,
  createPage,
  PromiseType,
  ThreadType,
  Urgency,
} from '@/models';
import type { AnalystResult } from '@/llm/analyst-types';
import { buildInsightsPromiseMeta, buildInsightsThreadMeta } from '@/server/utils/page-panel-data';

function makeAnalystResult(overrides: Partial<AnalystResult> = {}): AnalystResult {
  return {
    milestoneConcluded: false,
    milestoneResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedMilestoneIds: [],
    sceneSummary: '',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'INCREMENTAL_PROGRESS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
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
    alignedMilestoneId: null,
    milestoneAlignmentConfidence: 'LOW',
    milestoneAlignmentReason: '',
    thematicCharge: 'AMBIGUOUS',
    narrativeFocus: 'BALANCED',
    thematicChargeDescription: '',
    obligatorySceneFulfilled: null,
    premisePromiseFulfilled: null,
    delayedConsequencesTriggered: [],
    knowledgeAsymmetryDetected: [],
    dramaticIronyOpportunities: [],
    rawResponse: '',
    ...overrides,
  };
}

describe('page-panel-data insights metadata', () => {
  it('derives resolved thread and promise metadata from parent canonical state', () => {
    const parentPage = createPage({
      id: 1,
      narrativeText: 'Parent',
      sceneSummary: 'Parent summary.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
      parentAccumulatedActiveState: {
        currentLocation: 'Gate',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [
          { id: 'td-1', text: 'Find the sigil', threadType: ThreadType.QUEST, urgency: Urgency.HIGH },
          { id: 'td-2', text: 'Watch the courtyard', threadType: ThreadType.INFORMATION, urgency: Urgency.LOW },
        ],
      },
      accumulatedPromises: [
        {
          id: 'pr-1',
          description: 'The sigil should unlock a hidden vault.',
          promiseType: PromiseType.CHEKHOV_GUN,
          scope: 'BEAT',
          resolutionHint: 'Used at the vault door',
          suggestedUrgency: Urgency.HIGH,
          age: 1,
        },
      ],
    });

    const childPage = createPage({
      id: 2,
      narrativeText: 'Child',
      sceneSummary: 'Child summary.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 1,
      parentChoiceIndex: 0,
      parentAccumulatedActiveState: parentPage.accumulatedActiveState,
      activeStateChanges: {
        newLocation: null,
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: ['td-1'],
      },
      analystResult: makeAnalystResult({ promisesResolved: ['pr-1'] }),
    });

    expect(buildInsightsThreadMeta(childPage, parentPage)).toEqual({
      'td-1': { threadType: ThreadType.QUEST, urgency: Urgency.HIGH },
      'td-2': { threadType: ThreadType.INFORMATION, urgency: Urgency.LOW },
    });
    expect(buildInsightsPromiseMeta(childPage, parentPage)).toEqual({
      'pr-1': { promiseType: PromiseType.CHEKHOV_GUN, scope: 'BEAT', urgency: Urgency.HIGH },
    });
  });

  it('degrades safely when parent page is unavailable', () => {
    const page = createPage({
      id: 2,
      narrativeText: 'Orphan child',
      sceneSummary: 'Summary.',
      choices: [createChoice('A'), createChoice('B')],
      isEnding: false,
      parentPageId: 1,
      parentChoiceIndex: 0,
      parentAccumulatedActiveState: {
        currentLocation: 'Gate',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [
          { id: 'td-2', text: 'Watch the courtyard', threadType: ThreadType.INFORMATION, urgency: Urgency.LOW },
        ],
      },
      analystResult: makeAnalystResult({ promisesResolved: ['pr-1'] }),
    });

    expect(buildInsightsThreadMeta(page, null)).toEqual({
      'td-2': { threadType: ThreadType.INFORMATION, urgency: Urgency.LOW },
    });
    expect(buildInsightsPromiseMeta(page, null)).toEqual({});
  });
});

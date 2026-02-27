import { collectAncestorContext } from '@/engine/ancestor-collector';
import { createChoice, createPage, parseStoryId } from '@/models';
import type { Page } from '@/models';
import type { AnalystResult, ThematicCharge } from '@/llm/analyst-types';
import { storage } from '@/persistence';

function buildAnalystResult(thematicCharge: ThematicCharge): AnalystResult {
  return {
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    narrativeSummary: '',
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
    alignedBeatId: null,
    beatAlignmentConfidence: 'LOW',
    beatAlignmentReason: '',
    thematicCharge,
    thematicChargeDescription: '',
    obligatorySceneFulfilled: null,
    premisePromiseFulfilled: null,
    delayedConsequencesTriggered: [],
    rawResponse: '',
  };
}

function buildPage(
  id: number,
  parentPageId: number | null,
  thematicCharge: ThematicCharge
): Page {
  return createPage({
    id,
    narrativeText: `Narrative ${id}`,
    sceneSummary: `Summary ${id}`,
    choices: [createChoice('A'), createChoice('B')],
    isEnding: false,
    parentPageId,
    parentChoiceIndex: parentPageId === null ? null : 0,
    analystResult: buildAnalystResult(thematicCharge),
  });
}

describe('ancestor-collector', () => {
  const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes parent thematic valence in trajectory for a root-parent branch', async () => {
    const parentPage = buildPage(1, null, 'THESIS_SUPPORTING');

    const result = await collectAncestorContext(storyId, parentPage);

    expect(result.thematicValenceTrajectory).toEqual([
      { pageId: 1, thematicValence: 'THESIS_SUPPORTING' },
    ]);
  });

  it('builds thematic trajectory in chronological order capped to recent 5 scenes', async () => {
    const parentPage = buildPage(7, 6, 'ANTITHESIS_SUPPORTING');
    const page6 = buildPage(6, 5, 'THESIS_SUPPORTING');
    const page5 = buildPage(5, 4, 'THESIS_SUPPORTING');
    const page4 = buildPage(4, 3, 'ANTITHESIS_SUPPORTING');
    const page3 = buildPage(3, 2, 'AMBIGUOUS');
    const page2 = buildPage(2, 1, 'THESIS_SUPPORTING');
    const page1 = buildPage(1, null, 'ANTITHESIS_SUPPORTING');

    jest.spyOn(storage, 'loadPage').mockImplementation((_, pageId) => {
      const pages = new Map([
        [1, page1],
        [2, page2],
        [3, page3],
        [4, page4],
        [5, page5],
        [6, page6],
      ]);
      return Promise.resolve(pages.get(pageId) ?? null);
    });

    const result = await collectAncestorContext(storyId, parentPage);

    expect(result.thematicValenceTrajectory).toEqual([
      { pageId: 3, thematicValence: 'AMBIGUOUS' },
      { pageId: 4, thematicValence: 'ANTITHESIS_SUPPORTING' },
      { pageId: 5, thematicValence: 'THESIS_SUPPORTING' },
      { pageId: 6, thematicValence: 'THESIS_SUPPORTING' },
      { pageId: 7, thematicValence: 'ANTITHESIS_SUPPORTING' },
    ]);
  });
});

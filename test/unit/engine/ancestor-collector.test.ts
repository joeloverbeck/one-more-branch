import { collectAncestorContext } from '@/engine/ancestor-collector';
import { createChoice, createPage, parseStoryId } from '@/models';
import type { Page } from '@/models';
import type { AnalystResult, NarrativeFocus, ThematicCharge } from '@/llm/analyst-types';
import { storage } from '@/persistence';

function buildAnalystResult(
  thematicCharge: ThematicCharge,
  narrativeFocus: NarrativeFocus
): AnalystResult {
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
    thematicCharge,
    narrativeFocus,
    thematicChargeDescription: '',
    obligatorySceneFulfilled: null,
    premisePromiseFulfilled: null,
    delayedConsequencesTriggered: [],
knowledgeAsymmetryDetected: [],
dramaticIronyOpportunities: [],
rawResponse: '',
  };
}

function buildPage(
  id: number,
  parentPageId: number | null,
  thematicCharge: ThematicCharge,
  narrativeFocus: NarrativeFocus
): Page {
  return createPage({
    id,
    narrativeText: `Narrative ${id}`,
    sceneSummary: `Summary ${id}`,
    choices: [createChoice('A'), createChoice('B')],
    isEnding: false,
    parentPageId,
    parentChoiceIndex: parentPageId === null ? null : 0,
    analystResult: buildAnalystResult(thematicCharge, narrativeFocus),
  });
}

describe('ancestor-collector', () => {
  const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('includes parent thematic valence in trajectory for a root-parent branch', async () => {
    const parentPage = buildPage(1, null, 'THESIS_SUPPORTING', 'DEEPENING');

    const result = await collectAncestorContext(storyId, parentPage);

    expect(result.thematicValenceTrajectory).toEqual([
      { pageId: 1, thematicValence: 'THESIS_SUPPORTING' },
    ]);
    expect(result.narrativeFocusTrajectory).toEqual([{ pageId: 1, narrativeFocus: 'DEEPENING' }]);
  });

  it('builds thematic trajectory in chronological order capped to recent 5 scenes', async () => {
    const parentPage = buildPage(7, 6, 'ANTITHESIS_SUPPORTING', 'BROADENING');
    const page6 = buildPage(6, 5, 'THESIS_SUPPORTING', 'DEEPENING');
    const page5 = buildPage(5, 4, 'THESIS_SUPPORTING', 'DEEPENING');
    const page4 = buildPage(4, 3, 'ANTITHESIS_SUPPORTING', 'BALANCED');
    const page3 = buildPage(3, 2, 'AMBIGUOUS', 'BROADENING');
    const page2 = buildPage(2, 1, 'THESIS_SUPPORTING', 'BALANCED');
    const page1 = buildPage(1, null, 'ANTITHESIS_SUPPORTING', 'DEEPENING');

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
    expect(result.narrativeFocusTrajectory).toEqual([
      { pageId: 3, narrativeFocus: 'BROADENING' },
      { pageId: 4, narrativeFocus: 'BALANCED' },
      { pageId: 5, narrativeFocus: 'DEEPENING' },
      { pageId: 6, narrativeFocus: 'DEEPENING' },
      { pageId: 7, narrativeFocus: 'BROADENING' },
    ]);
  });
});

import { mergePageWriterAndReconciledStateWithAnalystResults } from '../../../src/llm/result-merger.js';
import type { StateReconciliationResult } from '../../../src/engine/state-reconciler-types.js';
import type { AnalystResult, PageWriterResult } from '../../../src/llm/types.js';

function createPageWriterResult(overrides: Partial<PageWriterResult> = {}): PageWriterResult {
  return {
    narrative: 'The hero entered the cave.',
    choices: [
      { text: 'Go left', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
      { text: 'Go right', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
    ],
    sceneSummary: 'The hero enters a dark cave and encounters a hostile goblin.',
    protagonistAffect: {
      primaryEmotion: 'determination',
      primaryIntensity: 'moderate',
      primaryCause: 'The quest ahead',
      secondaryEmotions: [],
      dominantMotivation: 'Find the treasure',
    },
    isEnding: false,
    rawResponse: 'writer raw response',
    ...overrides,
  };
}

function createReconciliationResult(
  overrides: Partial<StateReconciliationResult> = {},
): StateReconciliationResult {
  return {
    currentLocation: 'Reconciled cave',
    threatsAdded: ['THREAT_BATS_RECONCILED: Confirmed bat swarm'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [{ text: 'Golden chest reconciled', threadType: 'QUEST', urgency: 'MEDIUM' }],
    threadsResolved: [],
    newCanonFacts: ['Reconciler accepted cave continuity'],
    newCharacterCanonFacts: { Goblin: ['Reconciler confirms goblin fear of fire'] },
    inventoryAdded: ['Reconciled torch'],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [{ characterName: 'Goblin', states: ['Cautious'] }],
    characterStateChangesRemoved: [],
    reconciliationDiagnostics: [{ code: 'INFO', message: 'All checks passed' }],
    ...overrides,
  };
}

function createAnalystResult(overrides: Partial<AnalystResult> = {}): AnalystResult {
  return {
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    narrativeSummary: 'The protagonist continues the current scene.',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
    objectiveAnchors: [],
    anchorEvidence: [],
    completionGateSatisfied: false,
    completionGateFailureReason: '',
    rawResponse: 'analyst raw response',
    ...overrides,
  };
}

describe('mergePageWriterAndReconciledStateWithAnalystResults', () => {
  it('merges creative writer fields with reconciled deltas and analyst fields', () => {
    const writer = createPageWriterResult();
    const reconciliation = createReconciliationResult();
    const analyst = createAnalystResult({
      beatConcluded: true,
      beatResolution: 'The scene stabilizes',
    });

    const result = mergePageWriterAndReconciledStateWithAnalystResults(writer, reconciliation, analyst);

    expect(result.narrative).toBe(writer.narrative);
    expect(result.choices).toEqual(writer.choices);
    expect(result.currentLocation).toBe('Reconciled cave');
    expect(result.threatsAdded).toEqual(['THREAT_BATS_RECONCILED: Confirmed bat swarm']);
    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('The scene stabilizes');
  });

  it('uses writer rawResponse and does not expose reconciliation diagnostics', () => {
    const writer = createPageWriterResult({ rawResponse: 'writer-only-raw' });
    const reconciliation = createReconciliationResult({
      reconciliationDiagnostics: [{ code: 'WARN', message: 'diagnostic detail' }],
    });

    const result = mergePageWriterAndReconciledStateWithAnalystResults(writer, reconciliation, null);

    expect(result.rawResponse).toBe('writer-only-raw');
    expect('reconciliationDiagnostics' in result).toBe(false);
  });
});

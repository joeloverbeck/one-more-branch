import {
  mergePageWriterAndReconciledStateWithAnalystResults,
  mergeWriterAndAnalystResults,
} from '../../../src/llm/result-merger.js';
import type { StateReconciliationResult } from '../../../src/engine/state-reconciler-types.js';
import type { AnalystResult, PageWriterResult, WriterResult } from '../../../src/llm/types.js';

function createWriterResult(overrides: Partial<WriterResult> = {}): WriterResult {
  return {
    narrative: 'The hero entered the cave.',
    choices: [
      { text: 'Go left', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
      { text: 'Go right', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
    ],
    currentLocation: 'Dark cave',
    threatsAdded: ['THREAT_BATS: Swarm of bats'],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [{ text: 'Golden chest spotted', threadType: 'MYSTERY', urgency: 'HIGH' }],
    threadsResolved: [],
    newCanonFacts: ['The cave is ancient'],
    newCharacterCanonFacts: { Goblin: ['Afraid of fire'] },
    inventoryAdded: ['Torch'],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [{ characterName: 'Goblin', states: ['Hostile'] }],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'determination',
      primaryIntensity: 'moderate',
      primaryCause: 'The quest ahead',
      secondaryEmotions: [],
      dominantMotivation: 'Find the treasure',
    },
    isEnding: false,
    sceneSummary: 'The hero enters a dark cave and encounters a hostile goblin.',
    rawResponse: 'writer raw response',
    ...overrides,
  };
}

function createPageWriterResult(overrides: Partial<PageWriterResult> = {}): PageWriterResult {
  const writerResult = createWriterResult();
  return {
    narrative: writerResult.narrative,
    choices: writerResult.choices,
    sceneSummary: writerResult.sceneSummary,
    protagonistAffect: writerResult.protagonistAffect,
    isEnding: writerResult.isEnding,
    rawResponse: writerResult.rawResponse,
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
    narrativeSummary: '',
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

describe('mergeWriterAndAnalystResults', () => {
  it('should return defaults when analyst is null', () => {
    const writer = createWriterResult();
    const result = mergeWriterAndAnalystResults(writer, null);

    expect(result.beatConcluded).toBe(false);
    expect(result.beatResolution).toBe('');
    expect(result.deviation).toEqual({ detected: false });
  });

  it('should use analyst beat fields when analyst has no deviation', () => {
    const writer = createWriterResult();
    const analyst = createAnalystResult({
      beatConcluded: true,
      beatResolution: 'The hero found the entrance',
    });

    const result = mergeWriterAndAnalystResults(writer, analyst);

    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('The hero found the entrance');
    expect(result.deviation).toEqual({ detected: false });
  });

  it('should create beat deviation when all conditions are met', () => {
    const writer = createWriterResult();
    const analyst = createAnalystResult({
      deviationDetected: true,
      deviationReason: 'Hero abandoned the quest',
      invalidatedBeatIds: ['1.2', '1.3'],
      narrativeSummary: 'The hero turned back',
    });

    const result = mergeWriterAndAnalystResults(writer, analyst);

    expect(result.deviation).toEqual({
      detected: true,
      reason: 'Hero abandoned the quest',
      invalidatedBeatIds: ['1.2', '1.3'],
      narrativeSummary: 'The hero turned back',
    });
  });

  it('should fall back to no-deviation when narrativeSummary is missing', () => {
    const writer = createWriterResult();
    const analyst = createAnalystResult({
      deviationDetected: true,
      deviationReason: 'Hero abandoned the quest',
      invalidatedBeatIds: ['1.2'],
      narrativeSummary: '',
    });

    const result = mergeWriterAndAnalystResults(writer, analyst);

    expect(result.deviation).toEqual({ detected: false });
  });

  it('should fall back to no-deviation when invalidatedBeatIds is empty', () => {
    const writer = createWriterResult();
    const analyst = createAnalystResult({
      deviationDetected: true,
      deviationReason: 'Hero abandoned the quest',
      invalidatedBeatIds: [],
      narrativeSummary: 'The hero turned back',
    });

    const result = mergeWriterAndAnalystResults(writer, analyst);

    expect(result.deviation).toEqual({ detected: false });
  });

  it('should fall back to no-deviation when deviationReason is whitespace-only', () => {
    const writer = createWriterResult();
    const analyst = createAnalystResult({
      deviationDetected: true,
      deviationReason: '   ',
      invalidatedBeatIds: ['1.2'],
      narrativeSummary: 'The hero turned back',
    });

    const result = mergeWriterAndAnalystResults(writer, analyst);

    expect(result.deviation).toEqual({ detected: false });
  });

  it('should pass through all writer fields unchanged', () => {
    const writer = createWriterResult();
    const result = mergeWriterAndAnalystResults(writer, null);

    expect(result.narrative).toBe(writer.narrative);
    expect(result.choices).toEqual(writer.choices);
    expect(result.currentLocation).toBe(writer.currentLocation);
    expect(result.threatsAdded).toEqual(writer.threatsAdded);
    expect(result.threatsRemoved).toEqual(writer.threatsRemoved);
    expect(result.constraintsAdded).toEqual(writer.constraintsAdded);
    expect(result.constraintsRemoved).toEqual(writer.constraintsRemoved);
    expect(result.threadsAdded).toEqual(writer.threadsAdded);
    expect(result.threadsResolved).toEqual(writer.threadsResolved);
    expect(result.newCanonFacts).toEqual(writer.newCanonFacts);
    expect(result.newCharacterCanonFacts).toEqual(writer.newCharacterCanonFacts);
    expect(result.inventoryAdded).toEqual(writer.inventoryAdded);
    expect(result.inventoryRemoved).toEqual(writer.inventoryRemoved);
    expect(result.healthAdded).toEqual(writer.healthAdded);
    expect(result.healthRemoved).toEqual(writer.healthRemoved);
    expect(result.characterStateChangesAdded).toEqual(writer.characterStateChangesAdded);
    expect(result.characterStateChangesRemoved).toEqual(writer.characterStateChangesRemoved);
    expect(result.protagonistAffect).toEqual(writer.protagonistAffect);
    expect(result.isEnding).toBe(writer.isEnding);
  });

  it('should use writer rawResponse, not analyst rawResponse', () => {
    const writer = createWriterResult({ rawResponse: 'writer-specific-response' });
    const analyst = createAnalystResult({ rawResponse: 'analyst-specific-response' });

    const result = mergeWriterAndAnalystResults(writer, analyst);

    expect(result.rawResponse).toBe('writer-specific-response');
  });

  it('should produce a result with deviation field (ContinuationGenerationResult shape)', () => {
    const writer = createWriterResult();
    const result = mergeWriterAndAnalystResults(writer, null);

    expect(result).toHaveProperty('deviation');
    expect(result.deviation).toHaveProperty('detected');
  });

  describe('pacing field pass-through', () => {
    it('should pass through pacing fields when analyst has pacing issue', () => {
      const writer = createWriterResult();
      const analyst = createAnalystResult({
        pacingIssueDetected: true,
        pacingIssueReason: 'Stalled',
        recommendedAction: 'nudge',
      });

      const result = mergeWriterAndAnalystResults(writer, analyst);

      expect(result.pacingIssueDetected).toBe(true);
      expect(result.pacingIssueReason).toBe('Stalled');
      expect(result.recommendedAction).toBe('nudge');
    });

    it('should default pacing fields when analyst is null', () => {
      const writer = createWriterResult();
      const result = mergeWriterAndAnalystResults(writer, null);

      expect(result.pacingIssueDetected).toBe(false);
      expect(result.pacingIssueReason).toBe('');
      expect(result.recommendedAction).toBe('none');
    });

    it('should pass through no-pacing-issue correctly', () => {
      const writer = createWriterResult();
      const analyst = createAnalystResult({
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
      });

      const result = mergeWriterAndAnalystResults(writer, analyst);

      expect(result.pacingIssueDetected).toBe(false);
      expect(result.pacingIssueReason).toBe('');
      expect(result.recommendedAction).toBe('none');
    });
  });
});

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

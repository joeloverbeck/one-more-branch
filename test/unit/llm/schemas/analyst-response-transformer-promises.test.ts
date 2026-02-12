import { validateAnalystResponse } from '../../../../src/llm/schemas/analyst-response-transformer';

function buildBaseAnalystJson(): Record<string, unknown> {
  return {
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    narrativeSummary: 'Summary of the scene.',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'INCREMENTAL_PROGRESS',
    objectiveEvidenceStrength: 'WEAK_IMPLICIT',
    commitmentStrength: 'NONE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
    objectiveAnchors: [],
    anchorEvidence: [],
    completionGateSatisfied: false,
    completionGateFailureReason: 'No progress yet',
    narrativePromises: [],
    threadPayoffAssessments: [],
  };
}

describe('validateAnalystResponse - narrativePromises', () => {
  it('parses narrative promises from response', () => {
    const json = {
      ...buildBaseAnalystJson(),
      narrativePromises: [
        {
          description: 'A silver dagger placed with emphasis',
          promiseType: 'CHEKHOV_GUN',
          suggestedUrgency: 'HIGH',
        },
        {
          description: 'The protagonist noted the eerie silence',
          promiseType: 'FORESHADOWING',
          suggestedUrgency: 'MEDIUM',
        },
      ],
    };

    const result = validateAnalystResponse(json, 'raw');
    expect(result.narrativePromises).toHaveLength(2);
    expect(result.narrativePromises[0]!.description).toBe('A silver dagger placed with emphasis');
    expect(result.narrativePromises[0]!.promiseType).toBe('CHEKHOV_GUN');
    expect(result.narrativePromises[0]!.suggestedUrgency).toBe('HIGH');
  });

  it('caps narrative promises at 3', () => {
    const json = {
      ...buildBaseAnalystJson(),
      narrativePromises: [
        { description: 'Promise 1', promiseType: 'CHEKHOV_GUN', suggestedUrgency: 'HIGH' },
        { description: 'Promise 2', promiseType: 'FORESHADOWING', suggestedUrgency: 'MEDIUM' },
        { description: 'Promise 3', promiseType: 'DRAMATIC_IRONY', suggestedUrgency: 'LOW' },
        { description: 'Promise 4', promiseType: 'UNRESOLVED_EMOTION', suggestedUrgency: 'HIGH' },
      ],
    };

    const result = validateAnalystResponse(json, 'raw');
    expect(result.narrativePromises).toHaveLength(3);
  });

  it('filters out empty description promises', () => {
    const json = {
      ...buildBaseAnalystJson(),
      narrativePromises: [
        { description: '', promiseType: 'CHEKHOV_GUN', suggestedUrgency: 'HIGH' },
        { description: '  ', promiseType: 'FORESHADOWING', suggestedUrgency: 'MEDIUM' },
        { description: 'Valid promise', promiseType: 'FORESHADOWING', suggestedUrgency: 'LOW' },
      ],
    };

    const result = validateAnalystResponse(json, 'raw');
    expect(result.narrativePromises).toHaveLength(1);
    expect(result.narrativePromises[0]!.description).toBe('Valid promise');
  });

  it('defaults to empty array when field is missing', () => {
    const json = buildBaseAnalystJson();
    delete json['narrativePromises'];
    const result = validateAnalystResponse(json, 'raw');
    expect(result.narrativePromises).toEqual([]);
  });
});

describe('validateAnalystResponse - threadPayoffAssessments', () => {
  it('parses thread payoff assessments', () => {
    const json = {
      ...buildBaseAnalystJson(),
      threadPayoffAssessments: [
        {
          threadId: 'td-3',
          threadText: 'Find the missing key',
          satisfactionLevel: 'WELL_EARNED',
          reasoning: 'The resolution was developed over several pages with clear consequences.',
        },
      ],
    };

    const result = validateAnalystResponse(json, 'raw');
    expect(result.threadPayoffAssessments).toHaveLength(1);
    expect(result.threadPayoffAssessments[0]!.threadId).toBe('td-3');
    expect(result.threadPayoffAssessments[0]!.satisfactionLevel).toBe('WELL_EARNED');
  });

  it('filters out assessments with empty threadId', () => {
    const json = {
      ...buildBaseAnalystJson(),
      threadPayoffAssessments: [
        { threadId: '', threadText: 'Some thread', satisfactionLevel: 'RUSHED', reasoning: 'Bad' },
        {
          threadId: 'td-1',
          threadText: 'Real thread',
          satisfactionLevel: 'ADEQUATE',
          reasoning: 'OK',
        },
      ],
    };

    const result = validateAnalystResponse(json, 'raw');
    expect(result.threadPayoffAssessments).toHaveLength(1);
    expect(result.threadPayoffAssessments[0]!.threadId).toBe('td-1');
  });

  it('defaults to empty array when field is missing', () => {
    const json = buildBaseAnalystJson();
    delete json['threadPayoffAssessments'];
    const result = validateAnalystResponse(json, 'raw');
    expect(result.threadPayoffAssessments).toEqual([]);
  });
});

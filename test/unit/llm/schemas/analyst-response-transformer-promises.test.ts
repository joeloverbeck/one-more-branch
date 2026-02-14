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
    promisesDetected: [],
    promisesResolved: [],
    promisePayoffAssessments: [],
    threadPayoffAssessments: [],
  };
}

describe('validateAnalystResponse - promisesDetected', () => {
  it('parses detected promises from response', () => {
    const json = {
      ...buildBaseAnalystJson(),
      promisesDetected: [
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
    expect(result.promisesDetected).toHaveLength(2);
    expect(result.promisesDetected[0]!.description).toBe('A silver dagger placed with emphasis');
    expect(result.promisesDetected[0]!.promiseType).toBe('CHEKHOV_GUN');
    expect(result.promisesDetected[0]!.suggestedUrgency).toBe('HIGH');
  });

  it('caps detected promises at 3', () => {
    const json = {
      ...buildBaseAnalystJson(),
      promisesDetected: [
        { description: 'Promise 1', promiseType: 'CHEKHOV_GUN', suggestedUrgency: 'HIGH' },
        { description: 'Promise 2', promiseType: 'FORESHADOWING', suggestedUrgency: 'MEDIUM' },
        { description: 'Promise 3', promiseType: 'DRAMATIC_IRONY', suggestedUrgency: 'LOW' },
        { description: 'Promise 4', promiseType: 'UNRESOLVED_EMOTION', suggestedUrgency: 'HIGH' },
      ],
    };

    const result = validateAnalystResponse(json, 'raw');
    expect(result.promisesDetected).toHaveLength(3);
  });

  it('filters out empty description detected promises', () => {
    const json = {
      ...buildBaseAnalystJson(),
      promisesDetected: [
        { description: '', promiseType: 'CHEKHOV_GUN', suggestedUrgency: 'HIGH' },
        { description: '  ', promiseType: 'FORESHADOWING', suggestedUrgency: 'MEDIUM' },
        { description: 'Valid promise', promiseType: 'FORESHADOWING', suggestedUrgency: 'LOW' },
      ],
    };

    const result = validateAnalystResponse(json, 'raw');
    expect(result.promisesDetected).toHaveLength(1);
    expect(result.promisesDetected[0]!.description).toBe('Valid promise');
  });

  it('defaults to empty array when detected field is missing', () => {
    const json = buildBaseAnalystJson();
    delete json['promisesDetected'];
    const result = validateAnalystResponse(json, 'raw');
    expect(result.promisesDetected).toEqual([]);
  });
});

describe('validateAnalystResponse - promisesResolved', () => {
  it('keeps only canonical pr-N resolved IDs', () => {
    const json = {
      ...buildBaseAnalystJson(),
      promisesResolved: [' pr-1 ', '', '   ', 'pr-2', 'td-3', 'pr-abc', 'PR-5'],
    };
    const result = validateAnalystResponse(json, 'raw');
    expect(result.promisesResolved).toEqual(['pr-1', 'pr-2']);
  });

  it('defaults to empty array when field is missing', () => {
    const json = buildBaseAnalystJson();
    delete json['promisesResolved'];
    const result = validateAnalystResponse(json, 'raw');
    expect(result.promisesResolved).toEqual([]);
  });
});

describe('validateAnalystResponse - promisePayoffAssessments', () => {
  it('parses promise payoff assessments', () => {
    const json = {
      ...buildBaseAnalystJson(),
      promisePayoffAssessments: [
        {
          promiseId: 'pr-7',
          description: 'Dagger prophecy',
          satisfactionLevel: 'WELL_EARNED',
          reasoning: 'Paid off through hard choices over multiple scenes.',
        },
      ],
    };

    const result = validateAnalystResponse(json, 'raw');
    expect(result.promisePayoffAssessments).toHaveLength(1);
    expect(result.promisePayoffAssessments[0]!.promiseId).toBe('pr-7');
    expect(result.promisePayoffAssessments[0]!.satisfactionLevel).toBe('WELL_EARNED');
  });

  it('filters out assessments with non-canonical promiseId', () => {
    const json = {
      ...buildBaseAnalystJson(),
      promisePayoffAssessments: [
        {
          promiseId: '',
          description: 'Bad',
          satisfactionLevel: 'RUSHED',
          reasoning: 'Bad',
        },
        {
          promiseId: 'pr-2',
          description: 'Valid',
          satisfactionLevel: 'ADEQUATE',
          reasoning: 'OK',
        },
        {
          promiseId: 'td-2',
          description: 'Wrong prefix',
          satisfactionLevel: 'ADEQUATE',
          reasoning: 'Wrong prefix should be rejected.',
        },
        {
          promiseId: 'pr-xyz',
          description: 'Bad suffix',
          satisfactionLevel: 'ADEQUATE',
          reasoning: 'Invalid numeric suffix should be rejected.',
        },
      ],
    };
    const result = validateAnalystResponse(json, 'raw');
    expect(result.promisePayoffAssessments).toHaveLength(1);
    expect(result.promisePayoffAssessments[0]!.promiseId).toBe('pr-2');
  });

  it('defaults to empty array when field is missing', () => {
    const json = buildBaseAnalystJson();
    delete json['promisePayoffAssessments'];
    const result = validateAnalystResponse(json, 'raw');
    expect(result.promisePayoffAssessments).toEqual([]);
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

import type { WriterResult } from '../../../../src/llm/types';
import {
  extractWriterValidationIssues,
  validateDeterministicWriterOutput,
  WRITER_OUTPUT_RULE_KEYS,
} from '../../../../src/llm/validation/writer-output-validator';

function buildWriterResult(overrides?: Partial<WriterResult>): WriterResult {
  return {
    narrative:
      'You move through the rain-dark alley and hear the patrol bells close in as the rooftops rattle above.',
    choices: [
      { text: 'Move toward the bell tower', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Hide under the bridge', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
    ],
    currentLocation: 'Rain-dark alley',
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
    newCanonFacts: [],
    newCharacterCanonFacts: {},
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'anxiety',
      primaryIntensity: 'moderate',
      primaryCause: 'the closing patrol route',
      secondaryEmotions: [],
      dominantMotivation: 'reach safety',
    },
    isEnding: false,
    sceneSummary: 'You evade patrol routes and choose a safer approach for the next move.',
    rawResponse: '{"ok":true}',
    ...overrides,
  };
}

describe('writer-output-validator', () => {
  it('returns no issues for valid deterministic output', () => {
    const issues = validateDeterministicWriterOutput(buildWriterResult());
    expect(issues).toEqual([]);
  });

  it('rejects ID-like additions with deterministic field paths', () => {
    const issues = validateDeterministicWriterOutput(
      buildWriterResult({
        threatsAdded: ['th-7'],
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleKey: 'state_id.addition.must_not_be_id_like',
          fieldPath: 'threatsAdded[0]',
        }),
      ]),
    );
  });

  it('rejects cross-category IDs in id-only fields', () => {
    const issues = validateDeterministicWriterOutput(
      buildWriterResult({
        constraintsRemoved: ['th-2'],
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleKey: 'state_id.id_only_field.prefix_mismatch',
          fieldPath: 'constraintsRemoved[0]',
        }),
      ]),
    );
  });

  it('rejects duplicate (choiceType, primaryDelta) pairs across choices', () => {
    const issues = validateDeterministicWriterOutput(
      buildWriterResult({
        choices: [
          { text: 'Hold position', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Signal from cover', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        ],
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleKey: WRITER_OUTPUT_RULE_KEYS.DUPLICATE_CHOICE_PAIR,
          fieldPath: 'choices[1]',
        }),
      ]),
    );
  });

  it('rejects protagonistAffect required fields when empty after trim', () => {
    const issues = validateDeterministicWriterOutput(
      buildWriterResult({
        protagonistAffect: {
          primaryEmotion: '   ',
          primaryIntensity: 'moderate',
          primaryCause: '   ',
          secondaryEmotions: [{ emotion: 'fear', cause: '   ' }],
          dominantMotivation: '   ',
        },
      }),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleKey: WRITER_OUTPUT_RULE_KEYS.PROTAGONIST_AFFECT_REQUIRED,
          fieldPath: 'protagonistAffect.primaryEmotion',
        }),
        expect.objectContaining({
          ruleKey: WRITER_OUTPUT_RULE_KEYS.PROTAGONIST_AFFECT_REQUIRED,
          fieldPath: 'protagonistAffect.primaryCause',
        }),
        expect.objectContaining({
          ruleKey: WRITER_OUTPUT_RULE_KEYS.PROTAGONIST_AFFECT_REQUIRED,
          fieldPath: 'protagonistAffect.dominantMotivation',
        }),
        expect.objectContaining({
          ruleKey: WRITER_OUTPUT_RULE_KEYS.PROTAGONIST_AFFECT_REQUIRED,
          fieldPath: 'protagonistAffect.secondaryEmotions[0].cause',
        }),
      ]),
    );
  });

  it('extracts deterministic issues from unknown errors as empty array', () => {
    expect(extractWriterValidationIssues(new Error('other'))).toEqual([]);
  });
});

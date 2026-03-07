import type { PageWriterResult } from '../../../../src/llm/writer-types';
import {
  extractWriterValidationIssues,
  validateWriterOutput,
  WRITER_OUTPUT_RULE_KEYS,
} from '../../../../src/llm/validation/writer-output-validator';

function buildWriterResult(overrides?: Partial<PageWriterResult>): PageWriterResult {
  return {
    narrative:
      'You move through the rain-dark alley and hear the patrol bells close in as the rooftops rattle above.',
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
    const issues = validateWriterOutput(buildWriterResult());
    expect(issues).toEqual([]);
  });

  it('rejects protagonistAffect required fields when empty after trim', () => {
    const issues = validateWriterOutput(
      buildWriterResult({
        protagonistAffect: {
          primaryEmotion: '   ',
          primaryIntensity: 'moderate',
          primaryCause: '   ',
          secondaryEmotions: [{ emotion: 'fear', cause: '   ' }],
          dominantMotivation: '   ',
        },
      })
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
      ])
    );
  });

  it('extracts deterministic issues from unknown errors as empty array', () => {
    expect(extractWriterValidationIssues(new Error('other'))).toEqual([]);
  });
});

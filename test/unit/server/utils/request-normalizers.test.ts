import {
  MAX_GUIDANCE_FIELD_LENGTH,
  parseCustomChoiceText,
  parseProgressId,
  normalizeProtagonistGuidance,
} from '../../../../src/server/utils/request-normalizers';

describe('request normalizers', () => {
  describe('parseProgressId', () => {
    it('returns trimmed id for non-empty string', () => {
      expect(parseProgressId('  progress-1  ')).toBe('progress-1');
    });

    it('returns undefined for empty or non-string values', () => {
      expect(parseProgressId('   ')).toBeUndefined();
      expect(parseProgressId(123)).toBeUndefined();
      expect(parseProgressId(undefined)).toBeUndefined();
    });
  });

  describe('normalizeProtagonistGuidance', () => {
    it('returns undefined for non-object values', () => {
      expect(normalizeProtagonistGuidance(undefined)).toBeUndefined();
      expect(normalizeProtagonistGuidance('x')).toBeUndefined();
      expect(normalizeProtagonistGuidance([])).toBeUndefined();
    });

    it('trims and keeps non-empty fields', () => {
      expect(
        normalizeProtagonistGuidance({
          suggestedEmotions: '  afraid  ',
          suggestedThoughts: '  this is wrong  ',
          suggestedSpeech: '  go now  ',
        })
      ).toEqual({
        suggestedEmotions: 'afraid',
        suggestedThoughts: 'this is wrong',
        suggestedSpeech: 'go now',
      });
    });

    it('returns undefined when all fields are blank', () => {
      expect(
        normalizeProtagonistGuidance({
          suggestedEmotions: '   ',
          suggestedThoughts: '',
          suggestedSpeech: '   ',
        })
      ).toBeUndefined();
    });

    it('truncates each field to max guidance length', () => {
      const tooLong = ` ${'a'.repeat(MAX_GUIDANCE_FIELD_LENGTH + 7)} `;
      const guidance = normalizeProtagonistGuidance({ suggestedSpeech: tooLong });

      expect(guidance?.suggestedSpeech).toBe('a'.repeat(MAX_GUIDANCE_FIELD_LENGTH));
    });
  });

  describe('parseCustomChoiceText', () => {
    it('returns missing error when value is not a string', () => {
      expect(parseCustomChoiceText(undefined)).toEqual({ error: 'Missing pageId or choiceText' });
    });

    it('returns empty error when trimmed value is empty', () => {
      expect(parseCustomChoiceText('   ')).toEqual({ error: 'Choice text cannot be empty' });
    });

    it('returns length error when value exceeds 500 chars', () => {
      expect(parseCustomChoiceText('a'.repeat(501))).toEqual({
        error: 'Choice text must be 500 characters or fewer',
      });
    });

    it('returns trimmed choice text when valid', () => {
      expect(parseCustomChoiceText('  Hold this line  ')).toEqual({ value: 'Hold this line' });
    });
  });
});

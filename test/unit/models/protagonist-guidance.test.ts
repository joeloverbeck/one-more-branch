import {
  isProtagonistGuidanceEmpty,
  type ProtagonistGuidance,
} from '../../../src/models/protagonist-guidance';

describe('isProtagonistGuidanceEmpty', () => {
  it('returns true for undefined', () => {
    expect(isProtagonistGuidanceEmpty(undefined)).toBe(true);
  });

  it('returns true for empty object', () => {
    expect(isProtagonistGuidanceEmpty({})).toBe(true);
  });

  it('returns true for empty and whitespace fields', () => {
    const guidance: ProtagonistGuidance = {
      suggestedEmotions: '',
      suggestedThoughts: '   ',
      suggestedSpeech: '',
    };

    expect(isProtagonistGuidanceEmpty(guidance)).toBe(true);
  });

  it('returns false when any field has value', () => {
    expect(isProtagonistGuidanceEmpty({ suggestedEmotions: 'angry' })).toBe(false);
    expect(isProtagonistGuidanceEmpty({ suggestedThoughts: 'this is bad' })).toBe(false);
    expect(isProtagonistGuidanceEmpty({ suggestedSpeech: 'hello' })).toBe(false);
  });

  it('returns false when all fields are present', () => {
    expect(
      isProtagonistGuidanceEmpty({
        suggestedEmotions: 'tense',
        suggestedThoughts: 'stay focused',
        suggestedSpeech: 'hold the line',
      })
    ).toBe(false);
  });
});

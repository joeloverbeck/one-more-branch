import {
  EmotionIntensity,
  SecondaryEmotion,
  ProtagonistAffect,
  isEmotionIntensity,
  isSecondaryEmotion,
  isProtagonistAffect,
  createDefaultProtagonistAffect,
  formatProtagonistAffect,
} from '@/models';

describe('protagonist-affect', () => {
  describe('isEmotionIntensity', () => {
    it('returns true for valid intensity values', () => {
      expect(isEmotionIntensity('mild')).toBe(true);
      expect(isEmotionIntensity('moderate')).toBe(true);
      expect(isEmotionIntensity('strong')).toBe(true);
      expect(isEmotionIntensity('overwhelming')).toBe(true);
    });

    it('returns false for invalid intensity values', () => {
      expect(isEmotionIntensity('low')).toBe(false);
      expect(isEmotionIntensity('high')).toBe(false);
      expect(isEmotionIntensity('extreme')).toBe(false);
      expect(isEmotionIntensity('')).toBe(false);
      expect(isEmotionIntensity(null)).toBe(false);
      expect(isEmotionIntensity(undefined)).toBe(false);
      expect(isEmotionIntensity(1)).toBe(false);
      expect(isEmotionIntensity({})).toBe(false);
    });
  });

  describe('isSecondaryEmotion', () => {
    it('returns true for valid secondary emotion objects', () => {
      const validEmotion: SecondaryEmotion = {
        emotion: 'guilt',
        cause: "awareness that Leire is watching",
      };
      expect(isSecondaryEmotion(validEmotion)).toBe(true);
    });

    it('returns true for objects with only required properties', () => {
      expect(isSecondaryEmotion({ emotion: 'fear', cause: 'the darkness' })).toBe(true);
    });

    it('returns false for missing emotion property', () => {
      expect(isSecondaryEmotion({ cause: 'something' })).toBe(false);
    });

    it('returns false for missing cause property', () => {
      expect(isSecondaryEmotion({ emotion: 'anger' })).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isSecondaryEmotion(null)).toBe(false);
      expect(isSecondaryEmotion(undefined)).toBe(false);
      expect(isSecondaryEmotion('string')).toBe(false);
      expect(isSecondaryEmotion(123)).toBe(false);
      expect(isSecondaryEmotion([])).toBe(false);
    });

    it('returns false for non-string properties', () => {
      expect(isSecondaryEmotion({ emotion: 123, cause: 'valid' })).toBe(false);
      expect(isSecondaryEmotion({ emotion: 'valid', cause: null })).toBe(false);
    });
  });

  describe('isProtagonistAffect', () => {
    it('returns true for valid protagonist affect objects', () => {
      const validAffect: ProtagonistAffect = {
        primaryEmotion: 'attraction',
        primaryIntensity: 'strong',
        primaryCause: "Marla's unexpected attention",
        secondaryEmotions: [
          { emotion: 'guilt', cause: 'awareness that Leire is watching' },
        ],
        dominantMotivation: 'Navigate this encounter without damaging relationship with Leire',
      };
      expect(isProtagonistAffect(validAffect)).toBe(true);
    });

    it('returns true for affect with empty secondary emotions', () => {
      const affect: ProtagonistAffect = {
        primaryEmotion: 'curiosity',
        primaryIntensity: 'mild',
        primaryCause: 'unusual discovery',
        secondaryEmotions: [],
        dominantMotivation: 'Investigate further',
      };
      expect(isProtagonistAffect(affect)).toBe(true);
    });

    it('returns true for affect with multiple secondary emotions', () => {
      const affect: ProtagonistAffect = {
        primaryEmotion: 'fear',
        primaryIntensity: 'overwhelming',
        primaryCause: 'imminent danger',
        secondaryEmotions: [
          { emotion: 'desperation', cause: 'no escape route' },
          { emotion: 'regret', cause: 'past choices led here' },
          { emotion: 'determination', cause: 'survival instinct' },
        ],
        dominantMotivation: 'Find a way to escape',
      };
      expect(isProtagonistAffect(affect)).toBe(true);
    });

    it('returns false for missing required properties', () => {
      expect(isProtagonistAffect({ primaryEmotion: 'fear' })).toBe(false);
      expect(isProtagonistAffect({ primaryIntensity: 'strong' })).toBe(false);
      expect(isProtagonistAffect({
        primaryEmotion: 'fear',
        primaryIntensity: 'strong',
        primaryCause: 'danger',
        // missing secondaryEmotions and dominantMotivation
      })).toBe(false);
    });

    it('returns false for invalid primaryIntensity', () => {
      expect(isProtagonistAffect({
        primaryEmotion: 'fear',
        primaryIntensity: 'extreme', // invalid
        primaryCause: 'danger',
        secondaryEmotions: [],
        dominantMotivation: 'survive',
      })).toBe(false);
    });

    it('returns false for invalid secondaryEmotions array', () => {
      expect(isProtagonistAffect({
        primaryEmotion: 'fear',
        primaryIntensity: 'strong',
        primaryCause: 'danger',
        secondaryEmotions: 'not an array',
        dominantMotivation: 'survive',
      })).toBe(false);

      expect(isProtagonistAffect({
        primaryEmotion: 'fear',
        primaryIntensity: 'strong',
        primaryCause: 'danger',
        secondaryEmotions: [{ invalid: 'structure' }],
        dominantMotivation: 'survive',
      })).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isProtagonistAffect(null)).toBe(false);
      expect(isProtagonistAffect(undefined)).toBe(false);
      expect(isProtagonistAffect('string')).toBe(false);
      expect(isProtagonistAffect(123)).toBe(false);
      expect(isProtagonistAffect([])).toBe(false);
    });
  });

  describe('createDefaultProtagonistAffect', () => {
    it('returns a valid ProtagonistAffect object', () => {
      const defaultAffect = createDefaultProtagonistAffect();
      expect(isProtagonistAffect(defaultAffect)).toBe(true);
    });

    it('returns neutral emotional state', () => {
      const defaultAffect = createDefaultProtagonistAffect();
      expect(defaultAffect.primaryEmotion).toBe('neutral');
      expect(defaultAffect.primaryIntensity).toBe('mild');
      expect(defaultAffect.primaryCause).toBe('No specific emotional driver');
      expect(defaultAffect.secondaryEmotions).toEqual([]);
      expect(defaultAffect.dominantMotivation).toBe('Continue forward');
    });

    it('returns a new object each time', () => {
      const first = createDefaultProtagonistAffect();
      const second = createDefaultProtagonistAffect();
      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    it('returns immutable arrays', () => {
      const defaultAffect = createDefaultProtagonistAffect();
      expect(Object.isFrozen(defaultAffect.secondaryEmotions)).toBe(false);
      // The array should be a fresh copy
      expect(defaultAffect.secondaryEmotions).toEqual([]);
    });
  });

  describe('formatProtagonistAffect', () => {
    it('formats affect with no secondary emotions', () => {
      const affect: ProtagonistAffect = {
        primaryEmotion: 'curiosity',
        primaryIntensity: 'moderate',
        primaryCause: 'mysterious discovery',
        secondaryEmotions: [],
        dominantMotivation: 'Investigate the artifact',
      };

      const formatted = formatProtagonistAffect(affect);

      expect(formatted).toContain('Primary: CURIOSITY (moderate)');
      expect(formatted).toContain('mysterious discovery');
      expect(formatted).toContain('Motivation: Investigate the artifact');
      expect(formatted).not.toContain('Secondary:');
    });

    it('formats affect with secondary emotions', () => {
      const affect: ProtagonistAffect = {
        primaryEmotion: 'attraction',
        primaryIntensity: 'strong',
        primaryCause: "Marla's unexpected attention and physical presence",
        secondaryEmotions: [
          { emotion: 'guilt', cause: 'awareness that Leire is watching' },
          { emotion: 'curiosity', cause: "wondering about Marla's intentions" },
        ],
        dominantMotivation: 'Navigate this encounter without damaging relationship with Leire',
      };

      const formatted = formatProtagonistAffect(affect);

      expect(formatted).toContain('Primary: ATTRACTION (strong)');
      expect(formatted).toContain("Marla's unexpected attention");
      expect(formatted).toContain('Secondary: GUILT');
      expect(formatted).toContain('awareness that Leire is watching');
      expect(formatted).toContain('CURIOSITY');
      expect(formatted).toContain("wondering about Marla's intentions");
      expect(formatted).toContain('Navigate this encounter');
    });

    it('uppercases emotion names', () => {
      const affect: ProtagonistAffect = {
        primaryEmotion: 'overwhelming dread',
        primaryIntensity: 'overwhelming',
        primaryCause: 'approaching storm',
        secondaryEmotions: [
          { emotion: 'helplessness', cause: 'nowhere to run' },
        ],
        dominantMotivation: 'Find shelter',
      };

      const formatted = formatProtagonistAffect(affect);

      expect(formatted).toContain('OVERWHELMING DREAD');
      expect(formatted).toContain('HELPLESSNESS');
    });

    it('handles all intensity levels', () => {
      const intensities: EmotionIntensity[] = ['mild', 'moderate', 'strong', 'overwhelming'];

      for (const intensity of intensities) {
        const affect: ProtagonistAffect = {
          primaryEmotion: 'test',
          primaryIntensity: intensity,
          primaryCause: 'cause',
          secondaryEmotions: [],
          dominantMotivation: 'motivation',
        };

        const formatted = formatProtagonistAffect(affect);
        expect(formatted).toContain(`(${intensity})`);
      }
    });
  });
});

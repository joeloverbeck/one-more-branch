import {
  SCENE_PURPOSE_VALUES,
  VALUE_POLARITY_SHIFT_VALUES,
  PACING_MODE_VALUES,
  isScenePurpose,
  isValuePolarityShift,
  isPacingMode,
  SCENE_PURPOSE_LABELS,
  VALUE_POLARITY_SHIFT_LABELS,
  PACING_MODE_LABELS,
} from '../../../src/models/scene-direction-taxonomy';

describe('Scene direction taxonomy', () => {
  describe('SCENE_PURPOSE_VALUES', () => {
    it('contains exactly 17 values', () => {
      expect(SCENE_PURPOSE_VALUES).toHaveLength(17);
    });

    it('contains no duplicate values', () => {
      const unique = new Set(SCENE_PURPOSE_VALUES);
      expect(unique.size).toBe(SCENE_PURPOSE_VALUES.length);
    });

    it('includes all expected scene purpose values', () => {
      const expected = [
        'EXPOSITION',
        'INCITING_INCIDENT',
        'RISING_COMPLICATION',
        'REVERSAL',
        'REVELATION',
        'CONFRONTATION',
        'NEGOTIATION',
        'INVESTIGATION',
        'PREPARATION',
        'ESCAPE',
        'PURSUIT',
        'SACRIFICE',
        'BETRAYAL',
        'REUNION',
        'TRANSFORMATION',
        'CLIMACTIC_CHOICE',
        'AFTERMATH',
      ];
      expect(SCENE_PURPOSE_VALUES).toEqual(expected);
    });
  });

  describe('VALUE_POLARITY_SHIFT_VALUES', () => {
    it('contains exactly 5 values', () => {
      expect(VALUE_POLARITY_SHIFT_VALUES).toHaveLength(5);
    });

    it('contains no duplicate values', () => {
      const unique = new Set(VALUE_POLARITY_SHIFT_VALUES);
      expect(unique.size).toBe(VALUE_POLARITY_SHIFT_VALUES.length);
    });

    it('includes all expected polarity shift values', () => {
      const expected = [
        'POSITIVE_TO_NEGATIVE',
        'NEGATIVE_TO_POSITIVE',
        'POSITIVE_TO_DOUBLE_NEGATIVE',
        'NEGATIVE_TO_DOUBLE_POSITIVE',
        'IRONIC_SHIFT',
      ];
      expect(VALUE_POLARITY_SHIFT_VALUES).toEqual(expected);
    });
  });

  describe('PACING_MODE_VALUES', () => {
    it('contains exactly 5 values', () => {
      expect(PACING_MODE_VALUES).toHaveLength(5);
    });

    it('contains no duplicate values', () => {
      const unique = new Set(PACING_MODE_VALUES);
      expect(unique.size).toBe(PACING_MODE_VALUES.length);
    });

    it('includes all expected pacing mode values', () => {
      const expected = [
        'ACCELERATING',
        'DECELERATING',
        'SUSTAINED_HIGH',
        'OSCILLATING',
        'BUILDING_SLOW',
      ];
      expect(PACING_MODE_VALUES).toEqual(expected);
    });
  });

  describe('isScenePurpose', () => {
    it('returns true for every valid scene purpose value', () => {
      for (const value of SCENE_PURPOSE_VALUES) {
        expect(isScenePurpose(value)).toBe(true);
      }
    });

    it('returns false for a number', () => {
      expect(isScenePurpose(42)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isScenePurpose('')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isScenePurpose(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isScenePurpose(null)).toBe(false);
    });

    it('returns false for a similar-but-wrong string', () => {
      expect(isScenePurpose('EXPOSITION_')).toBe(false);
      expect(isScenePurpose('exposition')).toBe(false);
      expect(isScenePurpose('Exposition')).toBe(false);
      expect(isScenePurpose('INCITING_INCIDEN')).toBe(false);
    });
  });

  describe('isValuePolarityShift', () => {
    it('returns true for every valid polarity shift value', () => {
      for (const value of VALUE_POLARITY_SHIFT_VALUES) {
        expect(isValuePolarityShift(value)).toBe(true);
      }
    });

    it('returns false for a number', () => {
      expect(isValuePolarityShift(99)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isValuePolarityShift('')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValuePolarityShift(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValuePolarityShift(null)).toBe(false);
    });

    it('returns false for a similar-but-wrong string', () => {
      expect(isValuePolarityShift('POSITIVE_TO_NEGATIV')).toBe(false);
      expect(isValuePolarityShift('positive_to_negative')).toBe(false);
      expect(isValuePolarityShift('IRONIC')).toBe(false);
    });
  });

  describe('isPacingMode', () => {
    it('returns true for every valid pacing mode value', () => {
      for (const value of PACING_MODE_VALUES) {
        expect(isPacingMode(value)).toBe(true);
      }
    });

    it('returns false for a number', () => {
      expect(isPacingMode(0)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isPacingMode('')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isPacingMode(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isPacingMode(null)).toBe(false);
    });

    it('returns false for a similar-but-wrong string', () => {
      expect(isPacingMode('ACCELERATIN')).toBe(false);
      expect(isPacingMode('accelerating')).toBe(false);
      expect(isPacingMode('SUSTAINED_LOW')).toBe(false);
    });
  });

  describe('SCENE_PURPOSE_LABELS', () => {
    it('has an entry for every scene purpose value', () => {
      for (const value of SCENE_PURPOSE_VALUES) {
        expect(SCENE_PURPOSE_LABELS[value]).toBeDefined();
        expect(typeof SCENE_PURPOSE_LABELS[value]).toBe('string');
        expect(SCENE_PURPOSE_LABELS[value].length).toBeGreaterThan(0);
      }
    });

    it('has exactly as many entries as SCENE_PURPOSE_VALUES', () => {
      expect(Object.keys(SCENE_PURPOSE_LABELS)).toHaveLength(SCENE_PURPOSE_VALUES.length);
    });
  });

  describe('VALUE_POLARITY_SHIFT_LABELS', () => {
    it('has an entry for every polarity shift value', () => {
      for (const value of VALUE_POLARITY_SHIFT_VALUES) {
        expect(VALUE_POLARITY_SHIFT_LABELS[value]).toBeDefined();
        expect(typeof VALUE_POLARITY_SHIFT_LABELS[value]).toBe('string');
        expect(VALUE_POLARITY_SHIFT_LABELS[value].length).toBeGreaterThan(0);
      }
    });

    it('has exactly as many entries as VALUE_POLARITY_SHIFT_VALUES', () => {
      expect(Object.keys(VALUE_POLARITY_SHIFT_LABELS)).toHaveLength(
        VALUE_POLARITY_SHIFT_VALUES.length
      );
    });
  });

  describe('PACING_MODE_LABELS', () => {
    it('has an entry for every pacing mode value', () => {
      for (const value of PACING_MODE_VALUES) {
        expect(PACING_MODE_LABELS[value]).toBeDefined();
        expect(typeof PACING_MODE_LABELS[value]).toBe('string');
        expect(PACING_MODE_LABELS[value].length).toBeGreaterThan(0);
      }
    });

    it('has exactly as many entries as PACING_MODE_VALUES', () => {
      expect(Object.keys(PACING_MODE_LABELS)).toHaveLength(PACING_MODE_VALUES.length);
    });
  });
});

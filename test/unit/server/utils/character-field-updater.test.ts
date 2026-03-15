import {
  isEditableCharacterField,
  validateCharacterFieldValue,
  applyCharacterFieldUpdate,
} from '../../../../src/server/utils/character-field-updater.js';
import type { StandaloneDecomposedCharacter } from '../../../../src/models/standalone-decomposed-character.js';

function makeCharacter(
  overrides: Partial<StandaloneDecomposedCharacter> = {}
): StandaloneDecomposedCharacter {
  return {
    id: 'char-1',
    name: 'Test Character',
    rawDescription: 'A test character description',
    speechFingerprint: {
      catchphrases: ['hello'],
      vocabularyProfile: 'standard',
      sentencePatterns: 'short',
      verbalTics: [],
      dialogueSamples: [],
      metaphorFrames: 'nature',
      antiExamples: [],
      discourseMarkers: [],
      registerShifts: 'none',
    },
    coreTraits: ['brave'],
    knowledgeBoundaries: 'limited',
    decisionPattern: 'impulsive',
    coreBeliefs: ['justice'],
    conflictPriority: 'survival',
    appearance: 'tall',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('isEditableCharacterField', () => {
  it('allows top-level string fields', () => {
    expect(isEditableCharacterField('name')).toBe(true);
    expect(isEditableCharacterField('appearance')).toBe(true);
    expect(isEditableCharacterField('moralLine')).toBe(true);
    expect(isEditableCharacterField('worstFear')).toBe(true);
  });

  it('allows top-level array fields', () => {
    expect(isEditableCharacterField('coreTraits')).toBe(true);
    expect(isEditableCharacterField('escalationLadder')).toBe(true);
  });

  it('allows nested speechFingerprint fields', () => {
    expect(isEditableCharacterField('speechFingerprint.vocabularyProfile')).toBe(true);
    expect(isEditableCharacterField('speechFingerprint.catchphrases')).toBe(true);
  });

  it('allows nested stressVariants fields', () => {
    expect(isEditableCharacterField('stressVariants.underThreat')).toBe(true);
    expect(isEditableCharacterField('stressVariants.whenWinning')).toBe(true);
  });

  it('allows nested focalizationFilter fields', () => {
    expect(isEditableCharacterField('focalizationFilter.noticesFirst')).toBe(true);
  });

  it('allows emotionSalience enum', () => {
    expect(isEditableCharacterField('emotionSalience')).toBe(true);
  });

  it('blocks immutable fields', () => {
    expect(isEditableCharacterField('id')).toBe(false);
    expect(isEditableCharacterField('createdAt')).toBe(false);
  });

  it('blocks unknown fields', () => {
    expect(isEditableCharacterField('fakeField')).toBe(false);
    expect(isEditableCharacterField('speechFingerprint.fakeField')).toBe(false);
  });
});

describe('validateCharacterFieldValue', () => {
  it('accepts string for string fields', () => {
    expect(validateCharacterFieldValue('name', 'New Name')).toBeNull();
  });

  it('rejects non-string for string fields', () => {
    expect(validateCharacterFieldValue('name', 42)).toBe('Expected string for field "name"');
  });

  it('accepts string array for array fields', () => {
    expect(validateCharacterFieldValue('coreTraits', ['brave', 'kind'])).toBeNull();
  });

  it('rejects non-array for array fields', () => {
    expect(validateCharacterFieldValue('coreTraits', 'not-array')).toBe(
      'Expected string array for field "coreTraits"'
    );
  });

  it('rejects array with non-string items', () => {
    expect(validateCharacterFieldValue('coreTraits', ['ok', 42])).toBe(
      'Expected string array for field "coreTraits"'
    );
  });

  it('accepts valid emotionSalience values', () => {
    expect(validateCharacterFieldValue('emotionSalience', 'LOW')).toBeNull();
    expect(validateCharacterFieldValue('emotionSalience', 'MEDIUM')).toBeNull();
    expect(validateCharacterFieldValue('emotionSalience', 'HIGH')).toBeNull();
  });

  it('accepts empty string for emotionSalience (clear)', () => {
    expect(validateCharacterFieldValue('emotionSalience', '')).toBeNull();
  });

  it('rejects invalid emotionSalience values', () => {
    expect(validateCharacterFieldValue('emotionSalience', 'INVALID')).toBe(
      'Invalid emotionSalience value: "INVALID"'
    );
  });
});

describe('applyCharacterFieldUpdate', () => {
  it('updates top-level string field immutably', () => {
    const original = makeCharacter();
    const updated = applyCharacterFieldUpdate(original, 'name', 'New Name');

    expect(updated.name).toBe('New Name');
    expect(original.name).toBe('Test Character');
    expect(updated).not.toBe(original);
  });

  it('updates top-level array field', () => {
    const original = makeCharacter();
    const updated = applyCharacterFieldUpdate(original, 'coreTraits', ['cunning', 'wise']);

    expect(updated.coreTraits).toEqual(['cunning', 'wise']);
    expect(original.coreTraits).toEqual(['brave']);
  });

  it('updates nested speechFingerprint field', () => {
    const original = makeCharacter();
    const updated = applyCharacterFieldUpdate(
      original,
      'speechFingerprint.vocabularyProfile',
      'elevated'
    );

    expect(updated.speechFingerprint.vocabularyProfile).toBe('elevated');
    expect(original.speechFingerprint.vocabularyProfile).toBe('standard');
  });

  it('creates parent object when undefined', () => {
    const original = makeCharacter();
    const updated = applyCharacterFieldUpdate(
      original,
      'stressVariants.underThreat',
      'freezes'
    );

    expect(updated.stressVariants?.underThreat).toBe('freezes');
  });

  it('clears emotionSalience when value is empty string', () => {
    const original = makeCharacter({ emotionSalience: 'HIGH' as never });
    const updated = applyCharacterFieldUpdate(original, 'emotionSalience', '');

    expect(updated.emotionSalience).toBeUndefined();
  });
});

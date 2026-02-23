import {
  normalizeSelectedSceneDirection,
  MAX_SCENE_DIRECTION_TEXT_LENGTH,
} from '../../../../src/server/utils/request-normalizers';

describe('normalizeSelectedSceneDirection', () => {
  const validInput = {
    scenePurpose: 'CONFRONTATION',
    valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
    pacingMode: 'ACCELERATING',
    sceneDirection: 'The hero faces the villain.',
    dramaticJustification: 'This advances the conflict.',
  };

  it('returns undefined for non-object values', () => {
    expect(normalizeSelectedSceneDirection(undefined)).toBeUndefined();
    expect(normalizeSelectedSceneDirection(null)).toBeUndefined();
    expect(normalizeSelectedSceneDirection('some string')).toBeUndefined();
    expect(normalizeSelectedSceneDirection([1, 2])).toBeUndefined();
    expect(normalizeSelectedSceneDirection(42)).toBeUndefined();
  });

  it('returns undefined when scenePurpose is invalid', () => {
    expect(
      normalizeSelectedSceneDirection({ ...validInput, scenePurpose: 'INVALID_PURPOSE' })
    ).toBeUndefined();
  });

  it('returns undefined when valuePolarityShift is invalid', () => {
    expect(
      normalizeSelectedSceneDirection({ ...validInput, valuePolarityShift: 'NOT_A_SHIFT' })
    ).toBeUndefined();
  });

  it('returns undefined when pacingMode is invalid', () => {
    expect(
      normalizeSelectedSceneDirection({ ...validInput, pacingMode: 'TURBO' })
    ).toBeUndefined();
  });

  it('returns undefined when sceneDirection is empty or whitespace-only', () => {
    expect(
      normalizeSelectedSceneDirection({ ...validInput, sceneDirection: '' })
    ).toBeUndefined();
    expect(
      normalizeSelectedSceneDirection({ ...validInput, sceneDirection: '   ' })
    ).toBeUndefined();
  });

  it('returns undefined when dramaticJustification is empty or whitespace-only', () => {
    expect(
      normalizeSelectedSceneDirection({ ...validInput, dramaticJustification: '' })
    ).toBeUndefined();
    expect(
      normalizeSelectedSceneDirection({ ...validInput, dramaticJustification: '   ' })
    ).toBeUndefined();
  });

  it('trims whitespace from sceneDirection and dramaticJustification', () => {
    const result = normalizeSelectedSceneDirection({
      ...validInput,
      sceneDirection: '  The hero faces the villain.  ',
      dramaticJustification: '  This advances the conflict.  ',
    });

    expect(result).toEqual({
      scenePurpose: 'CONFRONTATION',
      valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
      pacingMode: 'ACCELERATING',
      sceneDirection: 'The hero faces the villain.',
      dramaticJustification: 'This advances the conflict.',
    });
  });

  it('truncates sceneDirection and dramaticJustification to MAX_SCENE_DIRECTION_TEXT_LENGTH', () => {
    const longText = 'a'.repeat(MAX_SCENE_DIRECTION_TEXT_LENGTH + 500);
    const result = normalizeSelectedSceneDirection({
      ...validInput,
      sceneDirection: longText,
      dramaticJustification: longText,
    });

    expect(result).toBeDefined();
    expect(result!.sceneDirection).toHaveLength(MAX_SCENE_DIRECTION_TEXT_LENGTH);
    expect(result!.dramaticJustification).toHaveLength(MAX_SCENE_DIRECTION_TEXT_LENGTH);
  });

  it('returns a valid SelectedSceneDirection when all fields are correct', () => {
    const result = normalizeSelectedSceneDirection(validInput);

    expect(result).toEqual({
      scenePurpose: 'CONFRONTATION',
      valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
      pacingMode: 'ACCELERATING',
      sceneDirection: 'The hero faces the villain.',
      dramaticJustification: 'This advances the conflict.',
    });
  });
});

import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import { EmotionSalience } from '../../models/character-enums.js';

const STRING_FIELDS = new Set([
  'name',
  'appearance',
  'knowledgeBoundaries',
  'decisionPattern',
  'conflictPriority',
  'superObjective',
  'pressurePoint',
  'moralLine',
  'worstFear',
  'formativeWound',
  'misbelief',
  'sociology',
  'rawDescription',
  'speechFingerprint.vocabularyProfile',
  'speechFingerprint.sentencePatterns',
  'speechFingerprint.metaphorFrames',
  'speechFingerprint.registerShifts',
  'stressVariants.underThreat',
  'stressVariants.inIntimacy',
  'stressVariants.whenLying',
  'stressVariants.whenAshamed',
  'stressVariants.whenWinning',
  'focalizationFilter.noticesFirst',
  'focalizationFilter.systematicallyMisses',
  'focalizationFilter.misreadsAs',
]);

const ARRAY_FIELDS = new Set([
  'coreTraits',
  'coreBeliefs',
  'falseBeliefs',
  'secretsKept',
  'stakes',
  'personalDilemmas',
  'escalationLadder',
  'immediateObjectives',
  'constraints',
  'desires',
  'currentIntentions',
  'speechFingerprint.catchphrases',
  'speechFingerprint.verbalTics',
  'speechFingerprint.dialogueSamples',
  'speechFingerprint.antiExamples',
  'speechFingerprint.discourseMarkers',
]);

const ENUM_FIELDS = new Set(['emotionSalience']);

const EMOTION_SALIENCE_VALUES = new Set(Object.values(EmotionSalience));

export function isEditableCharacterField(fieldPath: string): boolean {
  return STRING_FIELDS.has(fieldPath) || ARRAY_FIELDS.has(fieldPath) || ENUM_FIELDS.has(fieldPath);
}

export function validateCharacterFieldValue(fieldPath: string, value: unknown): string | null {
  if (STRING_FIELDS.has(fieldPath)) {
    if (typeof value !== 'string') {
      return `Expected string for field "${fieldPath}"`;
    }
    return null;
  }

  if (ARRAY_FIELDS.has(fieldPath)) {
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
      return `Expected string array for field "${fieldPath}"`;
    }
    return null;
  }

  if (ENUM_FIELDS.has(fieldPath)) {
    if (fieldPath === 'emotionSalience') {
      if (value !== '' && !EMOTION_SALIENCE_VALUES.has(value as EmotionSalience)) {
        return `Invalid emotionSalience value: "${String(value)}"`;
      }
    }
    return null;
  }

  return `Unknown field: "${fieldPath}"`;
}

export function applyCharacterFieldUpdate(
  character: StandaloneDecomposedCharacter,
  fieldPath: string,
  value: unknown
): StandaloneDecomposedCharacter {
  const parts = fieldPath.split('.');
  const charRecord = character as unknown as Record<string, unknown>;

  if (parts.length === 1) {
    const field = parts[0] as string;
    if (field === 'emotionSalience' && value === '') {
      const { [field]: _removed, ...rest } = charRecord;
      void _removed;
      return rest as unknown as StandaloneDecomposedCharacter;
    }
    return { ...character, [field]: value } as unknown as StandaloneDecomposedCharacter;
  }

  if (parts.length === 2) {
    const parent = parts[0] as string;
    const child = parts[1] as string;
    const existingParent = (charRecord[parent] as Record<string, unknown> | undefined) ?? {};
    return {
      ...character,
      [parent]: { ...existingParent, [child]: value },
    } as unknown as StandaloneDecomposedCharacter;
  }

  return character;
}

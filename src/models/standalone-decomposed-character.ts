import type { SpeechFingerprint } from './decomposed-character.js';

export interface StandaloneDecomposedCharacter {
  readonly id: string;
  readonly name: string;
  readonly rawDescription: string;
  readonly speechFingerprint: SpeechFingerprint;
  readonly coreTraits: readonly string[];
  readonly motivations: string;
  readonly knowledgeBoundaries: string;
  readonly falseBeliefs?: readonly string[];
  readonly secretsKept?: readonly string[];
  readonly decisionPattern: string;
  readonly coreBeliefs: readonly string[];
  readonly conflictPriority: string;
  readonly appearance: string;
  readonly createdAt: string;
}

export function isStandaloneDecomposedCharacter(
  value: unknown
): value is StandaloneDecomposedCharacter {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['rawDescription'] === 'string' &&
    typeof obj['speechFingerprint'] === 'object' &&
    obj['speechFingerprint'] !== null &&
    Array.isArray(obj['coreTraits']) &&
    typeof obj['motivations'] === 'string' &&
    typeof obj['knowledgeBoundaries'] === 'string' &&
    typeof obj['decisionPattern'] === 'string' &&
    Array.isArray(obj['coreBeliefs']) &&
    typeof obj['conflictPriority'] === 'string' &&
    typeof obj['appearance'] === 'string' &&
    typeof obj['createdAt'] === 'string'
  );
}

export function formatStandaloneCharacterSummary(char: StandaloneDecomposedCharacter): string {
  const lines: string[] = [
    `${char.name}`,
    `  Traits: ${char.coreTraits.join(', ')}`,
    `  Motivations: ${char.motivations}`,
    `  Appearance: ${char.appearance}`,
  ];
  return lines.join('\n');
}

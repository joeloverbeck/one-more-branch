import type {
  FocalizationFilter,
  SpeechFingerprint,
  StressVariants,
} from './decomposed-character.js';
import type { EmotionSalience } from './character-enums.js';

export interface StandaloneDecomposedCharacter {
  readonly id: string;
  readonly name: string;
  readonly rawDescription: string;
  readonly speechFingerprint: SpeechFingerprint;
  readonly coreTraits: readonly string[];
  readonly superObjective?: string;
  readonly knowledgeBoundaries: string;
  readonly falseBeliefs?: readonly string[];
  readonly secretsKept?: readonly string[];
  readonly decisionPattern: string;
  readonly coreBeliefs: readonly string[];
  readonly conflictPriority: string;
  readonly appearance: string;
  readonly createdAt: string;
  readonly stakes?: readonly string[];
  readonly pressurePoint?: string;
  readonly personalDilemmas?: readonly string[];
  readonly emotionSalience?: EmotionSalience;
  readonly moralLine?: string;
  readonly worstFear?: string;
  readonly formativeWound?: string;
  readonly misbelief?: string;
  readonly stressVariants?: StressVariants;
  readonly focalizationFilter?: FocalizationFilter;
  readonly escalationLadder?: readonly string[];
  readonly immediateObjectives?: readonly string[];
  readonly constraints?: readonly string[];
  readonly desires?: readonly string[];
  readonly currentIntentions?: readonly string[];
  readonly sociology?: string;
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
  ];

  if (char.superObjective) {
    lines.push(`  Super-Objective: ${char.superObjective}`);
  }

  lines.push(`  Appearance: ${char.appearance}`);

  if (char.stakes && char.stakes.length > 0) {
    lines.push(`  Stakes: ${char.stakes.join(', ')}`);
  }

  if (char.pressurePoint) {
    lines.push(`  Pressure Point: ${char.pressurePoint}`);
  }

  if (char.personalDilemmas && char.personalDilemmas.length > 0) {
    lines.push(`  Dilemmas: ${char.personalDilemmas.join(', ')}`);
  }

  if (char.emotionSalience) {
    lines.push(`  Emotion Salience: ${char.emotionSalience}`);
  }

  if (char.moralLine) {
    lines.push(`  Moral Line: ${char.moralLine}`);
  }

  if (char.worstFear) {
    lines.push(`  Worst Fear: ${char.worstFear}`);
  }

  if (char.formativeWound) {
    lines.push(`  Formative Wound: ${char.formativeWound}`);
  }

  if (char.misbelief) {
    lines.push(`  Misbelief: ${char.misbelief}`);
  }

  if (char.escalationLadder && char.escalationLadder.length > 0) {
    lines.push(`  Escalation Ladder: ${char.escalationLadder.join(' → ')}`);
  }

  if (char.immediateObjectives && char.immediateObjectives.length > 0) {
    lines.push(`  Immediate Objectives: ${char.immediateObjectives.join('; ')}`);
  }

  if (char.constraints && char.constraints.length > 0) {
    lines.push(`  Constraints: ${char.constraints.join('; ')}`);
  }

  if (char.desires && char.desires.length > 0) {
    lines.push(`  Desires: ${char.desires.join('; ')}`);
  }

  if (char.currentIntentions && char.currentIntentions.length > 0) {
    lines.push(`  Current Intentions: ${char.currentIntentions.join('; ')}`);
  }

  if (char.sociology) {
    lines.push(`  Sociology: ${char.sociology}`);
  }

  return lines.join('\n');
}

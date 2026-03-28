import type {
  FocalizationFilter,
  SpeechFingerprint,
  StressVariants,
} from './decomposed-character.js';
import type { EmotionSalience } from './character-enums.js';

export type StandaloneCharacterSummaryView = 'identity' | 'psychology' | 'standalone';

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

export function formatStandaloneCharacterPromptSummary(
  char: StandaloneDecomposedCharacter,
  view: StandaloneCharacterSummaryView
): string {
  switch (view) {
    case 'identity':
      return formatIdentitySummary(char);
    case 'psychology':
      return formatPsychologySummary(char);
    case 'standalone':
      return formatStandaloneSummary(char);
  }
}

function formatIdentitySummary(char: StandaloneDecomposedCharacter): string {
  return [
    `Name: ${char.name}`,
    `Core Traits: ${joinInlineList(char.coreTraits) || 'None'}`,
    `Appearance: ${char.appearance}`,
  ].join('\n');
}

function formatPsychologySummary(char: StandaloneDecomposedCharacter): string {
  const lines = [`Name: ${char.name}`, `Core Traits: ${joinInlineList(char.coreTraits) || 'None'}`];

  if (char.superObjective) {
    lines.push(`Super-Objective: ${char.superObjective}`);
  }

  if (hasItems(char.stakes)) {
    lines.push('Stakes:');
    lines.push(formatBulletedList(char.stakes));
  }

  if (char.pressurePoint) {
    lines.push(`Pressure Point: ${char.pressurePoint}`);
  }

  if (hasItems(char.personalDilemmas)) {
    lines.push('Personal Dilemmas:');
    lines.push(formatBulletedList(char.personalDilemmas));
  }

  if (char.emotionSalience) {
    lines.push(`Emotion Salience: ${char.emotionSalience}`);
  }

  if (char.moralLine) {
    lines.push(`Moral Line: ${char.moralLine}`);
  }

  if (char.worstFear) {
    lines.push(`Worst Fear: ${char.worstFear}`);
  }

  if (char.formativeWound) {
    lines.push(`Formative Wound: ${char.formativeWound}`);
  }

  if (char.misbelief) {
    lines.push(`Misbelief: ${char.misbelief}`);
  }

  if (char.focalizationFilter) {
    lines.push('Focalization Filter:');
    lines.push(...formatFocalizationFilter(char.focalizationFilter, '- '));
  }

  if (hasItems(char.escalationLadder)) {
    lines.push('Escalation Ladder:');
    lines.push(formatBulletedList(char.escalationLadder));
  }

  if (char.stressVariants) {
    lines.push('Stress Variants:');
    lines.push(...formatStressVariants(char.stressVariants, '- '));
  }

  lines.push(`Knowledge Boundaries: ${char.knowledgeBoundaries}`);
  lines.push(`Decision Pattern: ${char.decisionPattern}`);
  lines.push(`Conflict Priority: ${char.conflictPriority}`);
  lines.push(`Appearance: ${char.appearance}`);
  lines.push('Core Beliefs:');
  lines.push(formatBulletedList(char.coreBeliefs));

  if (hasItems(char.falseBeliefs)) {
    lines.push('False Beliefs:');
    lines.push(formatBulletedList(char.falseBeliefs));
  }

  if (hasItems(char.secretsKept)) {
    lines.push('Secrets Kept:');
    lines.push(formatBulletedList(char.secretsKept));
  }

  if (hasItems(char.immediateObjectives)) {
    lines.push(`Immediate Objectives: ${char.immediateObjectives.join('; ')}`);
  }

  if (hasItems(char.constraints)) {
    lines.push('Constraints:');
    lines.push(formatBulletedList(char.constraints));
  }

  if (hasItems(char.desires)) {
    lines.push('Desires:');
    lines.push(formatBulletedList(char.desires));
  }

  if (hasItems(char.currentIntentions)) {
    lines.push('Current Intentions:');
    lines.push(formatBulletedList(char.currentIntentions));
  }

  if (char.sociology) {
    lines.push(`Sociology: ${char.sociology}`);
  }

  return lines.join('\n');
}

function formatStandaloneSummary(char: StandaloneDecomposedCharacter): string {
  const lines: string[] = [`${char.name}`, `  Traits: ${joinInlineList(char.coreTraits)}`];

  if (char.superObjective) {
    lines.push(`  Super-Objective: ${char.superObjective}`);
  }

  lines.push(`  Appearance: ${char.appearance}`);

  if (hasItems(char.stakes)) {
    lines.push(`  Stakes: ${joinInlineList(char.stakes)}`);
  }

  if (char.pressurePoint) {
    lines.push(`  Pressure Point: ${char.pressurePoint}`);
  }

  if (hasItems(char.personalDilemmas)) {
    lines.push(`  Dilemmas: ${joinInlineList(char.personalDilemmas)}`);
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

  if (char.focalizationFilter) {
    lines.push('  Focalization Filter:');
    lines.push(...formatFocalizationFilter(char.focalizationFilter, '    '));
  }

  if (char.stressVariants) {
    lines.push('  Stress Variants:');
    lines.push(...formatStressVariants(char.stressVariants, '    '));
  }

  if (hasItems(char.escalationLadder)) {
    lines.push(`  Escalation Ladder: ${char.escalationLadder.join(' → ')}`);
  }

  if (hasItems(char.immediateObjectives)) {
    lines.push(`  Immediate Objectives: ${char.immediateObjectives.join('; ')}`);
  }

  if (hasItems(char.constraints)) {
    lines.push(`  Constraints: ${char.constraints.join('; ')}`);
  }

  if (hasItems(char.desires)) {
    lines.push(`  Desires: ${char.desires.join('; ')}`);
  }

  if (hasItems(char.currentIntentions)) {
    lines.push(`  Current Intentions: ${char.currentIntentions.join('; ')}`);
  }

  if (char.sociology) {
    lines.push(`  Sociology: ${char.sociology}`);
  }

  return lines.join('\n');
}

function formatBulletedList(values: readonly string[]): string {
  return values.map((value) => `- ${value}`).join('\n');
}

function formatFocalizationFilter(
  filter: FocalizationFilter,
  prefix: string
): [string, string, string] {
  return [
    `${prefix}Notices First: ${filter.noticesFirst}`,
    `${prefix}Systematically Misses: ${filter.systematicallyMisses}`,
    `${prefix}Misreads As: ${filter.misreadsAs}`,
  ];
}

function formatStressVariants(
  stressVariants: StressVariants,
  prefix: string
): [string, string, string, string, string] {
  return [
    `${prefix}Under Threat: ${stressVariants.underThreat}`,
    `${prefix}In Intimacy: ${stressVariants.inIntimacy}`,
    `${prefix}When Lying: ${stressVariants.whenLying}`,
    `${prefix}When Ashamed: ${stressVariants.whenAshamed}`,
    `${prefix}When Winning: ${stressVariants.whenWinning}`,
  ];
}

function hasItems(values: readonly string[] | undefined): values is readonly string[] {
  return Boolean(values && values.length > 0);
}

function joinInlineList(values: readonly string[]): string {
  return values.join(', ');
}

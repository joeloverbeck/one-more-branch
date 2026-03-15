export interface SpeechFingerprint {
  readonly catchphrases: readonly string[];
  readonly vocabularyProfile: string;
  readonly sentencePatterns: string;
  readonly verbalTics: readonly string[];
  readonly dialogueSamples: readonly string[];
  readonly metaphorFrames: string;
  readonly antiExamples: readonly string[];
  readonly discourseMarkers: readonly string[];
  readonly registerShifts: string;
}

export interface DecomposedRelationship {
  readonly valence: number; // -5 to +5
  readonly dynamic: string; // label: mentor, rival, ally, target, dependency, protector, etc.
  readonly history: string; // 1-2 sentences
  readonly currentTension: string; // 1-2 sentences
  readonly leverage: string; // 1 sentence
}

import type { EmotionSalience, StoryFunction } from './character-enums.js';

export interface FocalizationFilter {
  readonly noticesFirst: string;
  readonly systematicallyMisses: string;
  readonly misreadsAs: string;
}

export interface StressVariants {
  readonly underThreat: string;
  readonly inIntimacy: string;
  readonly whenLying: string;
  readonly whenAshamed: string;
  readonly whenWinning: string;
}

export interface DecomposedCharacter {
  readonly name: string;
  readonly speechFingerprint: SpeechFingerprint;
  readonly coreTraits: readonly string[];
  readonly superObjective?: string;
  readonly thematicStance: string;
  readonly protagonistRelationship: DecomposedRelationship | null;
  readonly knowledgeBoundaries: string;
  readonly falseBeliefs?: readonly string[];
  readonly secretsKept?: readonly string[];
  readonly decisionPattern: string;
  readonly coreBeliefs: readonly string[];
  readonly conflictPriority: string;
  readonly appearance: string;
  readonly rawDescription: string;
  readonly stakes?: readonly string[];
  readonly pressurePoint?: string;
  readonly personalDilemmas?: readonly string[];
  readonly emotionSalience?: EmotionSalience;
  readonly storyFunction?: StoryFunction;
  readonly narrativeRole?: string;
  readonly moralLine?: string;
  readonly worstFear?: string;
  readonly formativeWound?: string;
  readonly misbelief?: string;
  readonly stressVariants?: StressVariants;
  readonly focalizationFilter?: FocalizationFilter;
  readonly escalationLadder?: readonly string[];
  readonly ruptureTriggers?: readonly string[];
  readonly repairMoves?: readonly string[];
  readonly immediateObjectives?: readonly string[];
  readonly constraints?: readonly string[];
  readonly desires?: readonly string[];
  readonly currentIntentions?: readonly string[];
  readonly sociology?: string;
}

export function formatDecomposedCharacterForPrompt(
  char: DecomposedCharacter,
  isProtagonist?: boolean
): string {
  const fingerprint = char.speechFingerprint;
  const lines: string[] = [`CHARACTER: ${char.name}`];

  if (isProtagonist) {
    lines.push('PROTAGONIST');
  }

  lines.push(
    `Core Traits: ${char.coreTraits.join(', ')}`,
  );

  if (char.superObjective) {
    lines.push(`Super-Objective: ${char.superObjective}`);
  }

  lines.push(
    `Thematic Stance: ${char.thematicStance}`,
    `Appearance: ${char.appearance}`
  );

  if (char.stakes && char.stakes.length > 0) {
    lines.push(`Stakes:\n${char.stakes.map((s) => `  - ${s}`).join('\n')}`);
  }

  if (char.pressurePoint) {
    lines.push(`Pressure Point: ${char.pressurePoint}`);
  }

  if (char.personalDilemmas && char.personalDilemmas.length > 0) {
    lines.push(`Personal Dilemmas:\n${char.personalDilemmas.map((d) => `  - ${d}`).join('\n')}`);
  }

  if (char.emotionSalience) {
    lines.push(`Emotion Salience: ${char.emotionSalience}`);
  }

  if (char.storyFunction) {
    lines.push(`Story Function: ${char.storyFunction}`);
  }

  if (char.narrativeRole) {
    lines.push(`Narrative Role: ${char.narrativeRole}`);
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
    lines.push(
      `Focalization Filter:`,
      `  Notices First: ${char.focalizationFilter.noticesFirst}`,
      `  Systematically Misses: ${char.focalizationFilter.systematicallyMisses}`,
      `  Misreads As: ${char.focalizationFilter.misreadsAs}`
    );
  }

  if (char.escalationLadder && char.escalationLadder.length > 0) {
    lines.push(`Escalation Ladder:\n${char.escalationLadder.map((step, i) => `  ${i + 1}. ${step}`).join('\n')}`);
  }

  if (char.stressVariants) {
    lines.push(
      `Stress Variants:`,
      `  Under Threat: ${char.stressVariants.underThreat}`,
      `  In Intimacy: ${char.stressVariants.inIntimacy}`,
      `  When Lying: ${char.stressVariants.whenLying}`,
      `  When Ashamed: ${char.stressVariants.whenAshamed}`,
      `  When Winning: ${char.stressVariants.whenWinning}`
    );
  }

  if (char.protagonistRelationship !== null) {
    const rel = char.protagonistRelationship;
    lines.push(
      `Protagonist Relationship:`,
      `  Dynamic: ${rel.dynamic} (valence: ${rel.valence})`,
      `  History: ${rel.history}`,
      `  Current Tension: ${rel.currentTension}`,
      `  Leverage: ${rel.leverage}`
    );
  }

  if (char.immediateObjectives && char.immediateObjectives.length > 0) {
    lines.push(`Immediate Objectives:\n${char.immediateObjectives.map((o) => `  - ${o}`).join('\n')}`);
  }

  if (char.constraints && char.constraints.length > 0) {
    lines.push(`Constraints:\n${char.constraints.map((c) => `  - ${c}`).join('\n')}`);
  }

  if (char.desires && char.desires.length > 0) {
    lines.push(`Desires:\n${char.desires.map((d) => `  - ${d}`).join('\n')}`);
  }

  if (char.currentIntentions && char.currentIntentions.length > 0) {
    lines.push(`Current Intentions:\n${char.currentIntentions.map((i) => `  - ${i}`).join('\n')}`);
  }

  if (char.sociology) {
    lines.push(`Sociology: ${char.sociology}`);
  }

  lines.push(`Knowledge Boundaries: ${char.knowledgeBoundaries}`);

  if (char.falseBeliefs && char.falseBeliefs.length > 0) {
    lines.push(`False Beliefs:\n${char.falseBeliefs.map((b) => `  - ${b}`).join('\n')}`);
  }
  if (char.secretsKept && char.secretsKept.length > 0) {
    lines.push(`Secrets Kept:\n${char.secretsKept.map((s) => `  - ${s}`).join('\n')}`);
  }

  lines.push('');
  lines.push('SPEECH FINGERPRINT:');
  lines.push(`  Vocabulary: ${fingerprint.vocabularyProfile}`);
  lines.push(`  Sentence patterns: ${fingerprint.sentencePatterns}`);

  if (fingerprint.catchphrases.length > 0) {
    lines.push(`  Catchphrases: ${fingerprint.catchphrases.map((c) => `"${c}"`).join(', ')}`);
  }

  if (fingerprint.verbalTics.length > 0) {
    lines.push(`  Verbal tics: ${fingerprint.verbalTics.join(', ')}`);
  }

  if (fingerprint.dialogueSamples.length > 0) {
    lines.push('  Example lines:');
    for (const sample of fingerprint.dialogueSamples) {
      lines.push(`    "${sample}"`);
    }
  }

  if (fingerprint.metaphorFrames.trim().length > 0) {
    lines.push(`  Metaphor frames: ${fingerprint.metaphorFrames}`);
  }

  if (fingerprint.discourseMarkers.length > 0) {
    lines.push(`  Discourse markers: ${fingerprint.discourseMarkers.join(', ')}`);
  }

  if (fingerprint.registerShifts.trim().length > 0) {
    lines.push(`  Register shifts: ${fingerprint.registerShifts}`);
  }

  if (fingerprint.antiExamples.length > 0) {
    lines.push('  Anti-examples (how they do NOT sound):');
    for (const antiExample of fingerprint.antiExamples) {
      lines.push(`    "${antiExample}"`);
    }
  }

  if (char.decisionPattern.trim().length > 0) {
    lines.push(`Decision Pattern: ${char.decisionPattern}`);
  }

  if (char.coreBeliefs.length > 0) {
    lines.push(`Core Beliefs:\n${char.coreBeliefs.map((belief) => `  - ${belief}`).join('\n')}`);
  }

  if (char.conflictPriority.trim().length > 0) {
    lines.push(`Conflict Priority: ${char.conflictPriority}`);
  }

  return lines.join('\n');
}

export function formatSpeechFingerprintForWriter(fingerprint: SpeechFingerprint): string {
  const lines: string[] = [
    `Vocabulary: ${fingerprint.vocabularyProfile}`,
    `Sentence patterns: ${fingerprint.sentencePatterns}`,
  ];

  if (fingerprint.catchphrases.length > 0) {
    lines.push(`Catchphrases: ${fingerprint.catchphrases.map((c) => `"${c}"`).join(', ')}`);
  }

  if (fingerprint.verbalTics.length > 0) {
    lines.push(`Verbal tics: ${fingerprint.verbalTics.join(', ')}`);
  }

  if (fingerprint.dialogueSamples.length > 0) {
    lines.push('Example lines:');
    for (const sample of fingerprint.dialogueSamples) {
      lines.push(`  "${sample}"`);
    }
  }

  if (fingerprint.metaphorFrames.trim().length > 0) {
    lines.push(`Metaphor frames: ${fingerprint.metaphorFrames}`);
  }

  if (fingerprint.discourseMarkers.length > 0) {
    lines.push(`Discourse markers: ${fingerprint.discourseMarkers.join(', ')}`);
  }

  if (fingerprint.registerShifts.trim().length > 0) {
    lines.push(`Register shifts: ${fingerprint.registerShifts}`);
  }

  if (fingerprint.antiExamples.length > 0) {
    lines.push('Anti-examples (how they do NOT sound):');
    for (const antiExample of fingerprint.antiExamples) {
      lines.push(`  "${antiExample}"`);
    }
  }

  return lines.join('\n');
}

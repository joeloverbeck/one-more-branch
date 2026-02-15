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

export interface DecomposedCharacter {
  readonly name: string;
  readonly speechFingerprint: SpeechFingerprint;
  readonly coreTraits: readonly string[];
  readonly motivations: string;
  readonly protagonistRelationship: DecomposedRelationship | null;
  readonly knowledgeBoundaries: string;
  readonly falseBeliefs?: readonly string[];
  readonly secretsKept?: readonly string[];
  readonly decisionPattern: string;
  readonly coreBeliefs: readonly string[];
  readonly conflictPriority: string;
  readonly appearance: string;
  readonly rawDescription: string;
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
    `Motivations: ${char.motivations}`,
    `Appearance: ${char.appearance}`
  );

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

export interface SpeechFingerprint {
  readonly catchphrases: readonly string[];
  readonly vocabularyProfile: string;
  readonly sentencePatterns: string;
  readonly verbalTics: readonly string[];
  readonly dialogueSamples: readonly string[];
}

export interface DecomposedCharacter {
  readonly name: string;
  readonly speechFingerprint: SpeechFingerprint;
  readonly coreTraits: readonly string[];
  readonly motivations: string;
  readonly relationships: readonly string[];
  readonly knowledgeBoundaries: string;
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

  if (char.relationships.length > 0) {
    lines.push(`Relationships:\n${char.relationships.map((r) => `  - ${r}`).join('\n')}`);
  }

  lines.push(`Knowledge Boundaries: ${char.knowledgeBoundaries}`);
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

  return lines.join('\n');
}

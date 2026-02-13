import {
  formatDecomposedCharacterForPrompt,
  formatSpeechFingerprintForWriter,
} from '../../../src/models/decomposed-character';
import type {
  DecomposedCharacter,
  SpeechFingerprint,
} from '../../../src/models/decomposed-character';
import { formatDecomposedWorldForPrompt } from '../../../src/models/decomposed-world';
import type { DecomposedWorld } from '../../../src/models/decomposed-world';

describe('formatDecomposedCharacterForPrompt', () => {
  function createCharacter(overrides?: Partial<DecomposedCharacter>): DecomposedCharacter {
    return {
      name: 'Kael',
      speechFingerprint: {
        catchphrases: ['Steel remembers'],
        vocabularyProfile: 'Terse military vocabulary',
        sentencePatterns: 'Short declarative statements',
        verbalTics: ['clicks tongue'],
        dialogueSamples: ['Move. Now.'],
      },
      coreTraits: ['stoic', 'loyal'],
      motivations: 'Seeks redemption',
      relationships: ['Former commander'],
      knowledgeBoundaries: 'Knows tactics, not politics',
      appearance: 'Tall, scarred',
      rawDescription: 'A disgraced guard.',
      ...overrides,
    };
  }

  it('includes character name, traits, and motivations', () => {
    const result = formatDecomposedCharacterForPrompt(createCharacter());
    expect(result).toContain('CHARACTER: Kael');
    expect(result).toContain('Core Traits: stoic, loyal');
    expect(result).toContain('Motivations: Seeks redemption');
  });

  it('adds PROTAGONIST label when requested', () => {
    const result = formatDecomposedCharacterForPrompt(createCharacter(), true);
    expect(result).toContain('CHARACTER: Kael\nPROTAGONIST\nCore Traits: stoic, loyal');
  });

  it('does not add PROTAGONIST label when false or omitted', () => {
    const omitted = formatDecomposedCharacterForPrompt(createCharacter());
    const explicitFalse = formatDecomposedCharacterForPrompt(createCharacter(), false);
    expect(omitted).not.toContain('PROTAGONIST');
    expect(explicitFalse).not.toContain('PROTAGONIST');
  });

  it('includes speech fingerprint details', () => {
    const result = formatDecomposedCharacterForPrompt(createCharacter());
    expect(result).toContain('SPEECH FINGERPRINT:');
    expect(result).toContain('Vocabulary: Terse military vocabulary');
    expect(result).toContain('Catchphrases: "Steel remembers"');
    expect(result).toContain('Verbal tics: clicks tongue');
    expect(result).toContain('"Move. Now."');
  });

  it('includes relationships', () => {
    const result = formatDecomposedCharacterForPrompt(createCharacter());
    expect(result).toContain('Relationships:');
    expect(result).toContain('- Former commander');
  });

  it('omits catchphrases section when empty', () => {
    const char = createCharacter({
      speechFingerprint: {
        catchphrases: [],
        vocabularyProfile: 'Normal',
        sentencePatterns: 'Normal',
        verbalTics: [],
        dialogueSamples: [],
      },
    });
    const result = formatDecomposedCharacterForPrompt(char);
    expect(result).not.toContain('Catchphrases:');
    expect(result).not.toContain('Verbal tics:');
    expect(result).not.toContain('Example lines:');
  });
});

describe('formatSpeechFingerprintForWriter', () => {
  it('formats speech data for writer consumption', () => {
    const fp: SpeechFingerprint = {
      catchphrases: ['Bless the Maker'],
      vocabularyProfile: 'Desert nomad dialect',
      sentencePatterns: 'Poetic inversions',
      verbalTics: ['whispers prayers'],
      dialogueSamples: ['The desert takes, the desert gives.'],
    };
    const result = formatSpeechFingerprintForWriter(fp);
    expect(result).toContain('Vocabulary: Desert nomad dialect');
    expect(result).toContain('Catchphrases: "Bless the Maker"');
    expect(result).toContain('"The desert takes, the desert gives."');
  });

  it('omits empty arrays', () => {
    const fp: SpeechFingerprint = {
      catchphrases: [],
      vocabularyProfile: 'Normal',
      sentencePatterns: 'Normal',
      verbalTics: [],
      dialogueSamples: [],
    };
    const result = formatSpeechFingerprintForWriter(fp);
    expect(result).not.toContain('Catchphrases:');
    expect(result).not.toContain('Verbal tics:');
    expect(result).not.toContain('Example lines:');
  });
});

describe('formatDecomposedWorldForPrompt', () => {
  it('groups facts by domain', () => {
    const world: DecomposedWorld = {
      facts: [
        { domain: 'magic', fact: 'Blood runes bind oaths', scope: 'Worldwide' },
        { domain: 'magic', fact: 'Only mages can see runes', scope: 'Worldwide' },
        { domain: 'society', fact: 'The tribunal controls justice', scope: 'Capital' },
      ],
      rawWorldbuilding: 'some raw text',
    };
    const result = formatDecomposedWorldForPrompt(world);
    expect(result).toContain('WORLDBUILDING (structured):');
    expect(result).toContain('[MAGIC]');
    expect(result).toContain('[SOCIETY]');
    expect(result).toContain('Blood runes bind oaths (scope: Worldwide)');
  });

  it('returns empty string for no facts', () => {
    const world: DecomposedWorld = { facts: [], rawWorldbuilding: 'raw text' };
    expect(formatDecomposedWorldForPrompt(world)).toBe('');
  });
});

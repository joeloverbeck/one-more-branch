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
        metaphorFrames: 'Frames conflict as siege and attrition.',
        antiExamples: ['Permit me a delicate overture, my friend.'],
        discourseMarkers: ['Look,'],
        registerShifts: 'Formal around officers, crude under stress.',
      },
      coreTraits: ['stoic', 'loyal'],
      motivations: 'Seeks redemption',
      protagonistRelationship: {
        valence: 2,
        dynamic: 'former subordinate',
        history: 'Served under the former commander for years.',
        currentTension: 'Seeks to prove worthy of their legacy.',
        leverage: 'Knowledge of shared military operations.',
      },
      knowledgeBoundaries: 'Knows tactics, not politics',
      decisionPattern: 'Calculates risk first, commits when cornered.',
      coreBeliefs: ['Debt must be paid'],
      conflictPriority: 'Protect civilians over status.',
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
    expect(result).toContain('Metaphor frames: Frames conflict as siege and attrition.');
    expect(result).toContain('Discourse markers: Look,');
    expect(result).toContain('Register shifts: Formal around officers, crude under stress.');
    expect(result).toContain('Anti-examples (how they do NOT sound):');
    expect(result).toContain('Decision Pattern: Calculates risk first, commits when cornered.');
    expect(result).toContain('Core Beliefs:');
    expect(result).toContain('Conflict Priority: Protect civilians over status.');
  });

  it('includes protagonist relationship', () => {
    const result = formatDecomposedCharacterForPrompt(createCharacter());
    expect(result).toContain('Protagonist Relationship:');
    expect(result).toContain('Dynamic: former subordinate (valence: 2)');
    expect(result).toContain('Current Tension:');
  });

  it('omits catchphrases section when empty', () => {
    const char = createCharacter({
      speechFingerprint: {
        catchphrases: [],
        vocabularyProfile: 'Normal',
        sentencePatterns: 'Normal',
        verbalTics: [],
        dialogueSamples: [],
        metaphorFrames: '',
        antiExamples: [],
        discourseMarkers: [],
        registerShifts: '',
      },
      decisionPattern: '',
      coreBeliefs: [],
      conflictPriority: '',
    });
    const result = formatDecomposedCharacterForPrompt(char);
    expect(result).not.toContain('Catchphrases:');
    expect(result).not.toContain('Verbal tics:');
    expect(result).not.toContain('Example lines:');
    expect(result).not.toContain('Metaphor frames:');
    expect(result).not.toContain('Discourse markers:');
    expect(result).not.toContain('Register shifts:');
    expect(result).not.toContain('Anti-examples (how they do NOT sound):');
    expect(result).not.toContain('Decision Pattern:');
    expect(result).not.toContain('Core Beliefs:');
    expect(result).not.toContain('Conflict Priority:');
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
      metaphorFrames: 'Treats fate as weather that must be read, not controlled.',
      antiExamples: ['Proceed with standard operating protocol.'],
      discourseMarkers: ['Listen,'],
      registerShifts: 'Ceremonial in rituals, sparse and direct in danger.',
    };
    const result = formatSpeechFingerprintForWriter(fp);
    expect(result).toContain('Vocabulary: Desert nomad dialect');
    expect(result).toContain('Catchphrases: "Bless the Maker"');
    expect(result).toContain('"The desert takes, the desert gives."');
    expect(result).toContain('Metaphor frames: Treats fate as weather that must be read, not controlled.');
    expect(result).toContain('Discourse markers: Listen,');
    expect(result).toContain('Register shifts: Ceremonial in rituals, sparse and direct in danger.');
    expect(result).toContain('Anti-examples (how they do NOT sound):');
  });

  it('omits empty arrays', () => {
    const fp: SpeechFingerprint = {
      catchphrases: [],
      vocabularyProfile: 'Normal',
      sentencePatterns: 'Normal',
      verbalTics: [],
      dialogueSamples: [],
      metaphorFrames: '',
      antiExamples: [],
      discourseMarkers: [],
      registerShifts: '',
    };
    const result = formatSpeechFingerprintForWriter(fp);
    expect(result).not.toContain('Catchphrases:');
    expect(result).not.toContain('Verbal tics:');
    expect(result).not.toContain('Example lines:');
    expect(result).not.toContain('Metaphor frames:');
    expect(result).not.toContain('Discourse markers:');
    expect(result).not.toContain('Register shifts:');
    expect(result).not.toContain('Anti-examples (how they do NOT sound):');
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

  it('includes factType tags when present', () => {
    const world: DecomposedWorld = {
      facts: [
        { domain: 'magic', fact: 'Iron disrupts magical fields', scope: 'Worldwide', factType: 'LAW' },
        { domain: 'religion', fact: 'The clans believe the old gods sleep', scope: 'North', factType: 'BELIEF' },
        { domain: 'society', fact: 'Tavern talk claims the duke is a fraud', scope: 'Capital', factType: 'RUMOR' },
      ],
      rawWorldbuilding: 'some raw text',
    };
    const result = formatDecomposedWorldForPrompt(world);
    expect(result).toContain('[LAW] Iron disrupts magical fields (scope: Worldwide)');
    expect(result).toContain('[BELIEF] The clans believe the old gods sleep (scope: North)');
    expect(result).toContain('[RUMOR] Tavern talk claims the duke is a fraud (scope: Capital)');
  });

  it('omits factType tag when factType is undefined', () => {
    const world: DecomposedWorld = {
      facts: [
        { domain: 'magic', fact: 'Magic exists in this world', scope: 'Worldwide' },
      ],
      rawWorldbuilding: 'some raw text',
    };
    const result = formatDecomposedWorldForPrompt(world);
    expect(result).toContain('- Magic exists in this world (scope: Worldwide)');
    expect(result).not.toMatch(/\[LAW\]|\[NORM\]|\[BELIEF\]|\[DISPUTED\]|\[RUMOR\]|\[MYSTERY\]/);
  });
});

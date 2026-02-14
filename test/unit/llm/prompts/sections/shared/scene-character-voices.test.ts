import type { DecomposedCharacter } from '../../../../../../src/models/decomposed-character';
import type { StoryBible } from '../../../../../../src/llm/lorekeeper-types';
import { buildSceneCharacterVoicesSection } from '../../../../../../src/llm/prompts/sections/shared/scene-character-voices';

function makeFingerprint(overrides: Partial<DecomposedCharacter['speechFingerprint']> = {}): DecomposedCharacter['speechFingerprint'] {
  return {
    catchphrases: ['"By the old gods"'],
    vocabularyProfile: 'Archaic, formal register',
    sentencePatterns: 'Long compound sentences with subordinate clauses',
    verbalTics: ['clearing throat'],
    dialogueSamples: ['"I have seen this before, child."'],
    metaphorFrames: 'Nature and seasons',
    antiExamples: ['"Yo what\'s up dude"'],
    discourseMarkers: ['indeed', 'furthermore'],
    registerShifts: 'Becomes terse when angry',
    ...overrides,
  };
}

function makeDecomposed(name: string, overrides: Partial<DecomposedCharacter> = {}): DecomposedCharacter {
  return {
    name,
    speechFingerprint: makeFingerprint(),
    coreTraits: ['wise'],
    motivations: 'Seek truth',
    relationships: [],
    knowledgeBoundaries: 'None',
    decisionPattern: 'Measured',
    coreBeliefs: [],
    conflictPriority: 'Peace',
    appearance: 'Old man',
    rawDescription: 'A wise elder',
    ...overrides,
  };
}

function makeBible(overrides: Partial<StoryBible> = {}): StoryBible {
  return {
    sceneWorldContext: 'A dark forest',
    relevantCharacters: [],
    relevantCanonFacts: [],
    relevantHistory: '',
    ...overrides,
  };
}

describe('buildSceneCharacterVoicesSection', () => {
  it('returns empty string when relevantCharacters is empty', () => {
    const bible = makeBible({ relevantCharacters: [] });
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', [makeDecomposed('Mentor')]);
    expect(result).toBe('');
  });

  it('returns empty string when only protagonist is in relevantCharacters', () => {
    const bible = makeBible({
      relevantCharacters: [
        {
          name: 'Hero',
          role: 'protagonist',
          relevantProfile: 'The main character',
          speechPatterns: 'Bold and direct',
          protagonistRelationship: 'self',
          currentState: 'Healthy',
        },
      ],
    });
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', [makeDecomposed('Hero')]);
    expect(result).toBe('');
  });

  it('outputs full fingerprint for matched NPC', () => {
    const bible = makeBible({
      relevantCharacters: [
        {
          name: 'Mentor',
          role: 'ally',
          relevantProfile: 'Wise elder',
          speechPatterns: 'Formal and measured',
          protagonistRelationship: 'Teacher',
          currentState: 'Present',
        },
      ],
    });
    const decomposed = [makeDecomposed('Hero'), makeDecomposed('Mentor')];
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', decomposed);

    expect(result).toContain('NPC VOICE FINGERPRINTS');
    expect(result).toContain('[Mentor] SPEECH FINGERPRINT:');
    expect(result).toContain('Vocabulary: Archaic, formal register');
    expect(result).toContain('Catchphrases:');
    expect(result).toContain('Example lines:');
    expect(result).toContain('Anti-examples');
    expect(result).toContain('Discourse markers: indeed, furthermore');
    expect(result).not.toContain('Speech: Formal and measured');
  });

  it('falls back to lorekeeper speechPatterns for unmatched NPC', () => {
    const bible = makeBible({
      relevantCharacters: [
        {
          name: 'Stranger',
          role: 'unknown',
          relevantProfile: 'Mysterious figure',
          speechPatterns: 'Whispered, cryptic riddles',
          protagonistRelationship: 'Unknown',
          currentState: 'Lurking',
        },
      ],
    });
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', [makeDecomposed('Hero')]);

    expect(result).toContain('[Stranger] Speech: Whispered, cryptic riddles');
    expect(result).not.toContain('SPEECH FINGERPRINT:');
  });

  it('matches names case-insensitively', () => {
    const bible = makeBible({
      relevantCharacters: [
        {
          name: 'MENTOR',
          role: 'ally',
          relevantProfile: 'Wise elder',
          speechPatterns: 'Formal',
          protagonistRelationship: 'Teacher',
          currentState: 'Present',
        },
      ],
    });
    const decomposed = [makeDecomposed('Hero'), makeDecomposed('mentor')];
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', decomposed);

    expect(result).toContain('[MENTOR] SPEECH FINGERPRINT:');
    expect(result).toContain('Vocabulary:');
  });

  it('falls back for all NPCs when decomposedCharacters is undefined', () => {
    const bible = makeBible({
      relevantCharacters: [
        {
          name: 'Villain',
          role: 'antagonist',
          relevantProfile: 'Dark lord',
          speechPatterns: 'Booming, imperious',
          protagonistRelationship: 'Enemy',
          currentState: 'Threatening',
        },
      ],
    });
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', undefined);

    expect(result).toContain('[Villain] Speech: Booming, imperious');
  });

  it('falls back for all NPCs when decomposedCharacters is empty', () => {
    const bible = makeBible({
      relevantCharacters: [
        {
          name: 'Villain',
          role: 'antagonist',
          relevantProfile: 'Dark lord',
          speechPatterns: 'Booming, imperious',
          protagonistRelationship: 'Enemy',
          currentState: 'Threatening',
        },
      ],
    });
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', []);

    expect(result).toContain('[Villain] Speech: Booming, imperious');
  });

  it('handles mixed matched and unmatched NPCs', () => {
    const bible = makeBible({
      relevantCharacters: [
        {
          name: 'Mentor',
          role: 'ally',
          relevantProfile: 'Wise elder',
          speechPatterns: 'Formal and measured',
          protagonistRelationship: 'Teacher',
          currentState: 'Present',
        },
        {
          name: 'Stranger',
          role: 'unknown',
          relevantProfile: 'Mysterious figure',
          speechPatterns: 'Cryptic whispers',
          protagonistRelationship: 'Unknown',
          currentState: 'Lurking',
        },
      ],
    });
    const decomposed = [makeDecomposed('Hero'), makeDecomposed('Mentor')];
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', decomposed);

    expect(result).toContain('[Mentor] SPEECH FINGERPRINT:');
    expect(result).toContain('Vocabulary:');
    expect(result).toContain('[Stranger] Speech: Cryptic whispers');
  });

  it('excludes protagonist by case-insensitive name match', () => {
    const bible = makeBible({
      relevantCharacters: [
        {
          name: 'hero',
          role: 'protagonist',
          relevantProfile: 'Main character',
          speechPatterns: 'Bold',
          protagonistRelationship: 'self',
          currentState: 'Healthy',
        },
        {
          name: 'Mentor',
          role: 'ally',
          relevantProfile: 'Wise elder',
          speechPatterns: 'Formal',
          protagonistRelationship: 'Teacher',
          currentState: 'Present',
        },
      ],
    });
    const decomposed = [makeDecomposed('Hero'), makeDecomposed('Mentor')];
    const result = buildSceneCharacterVoicesSection(bible, 'Hero', decomposed);

    expect(result).not.toContain('[hero]');
    expect(result).toContain('[Mentor] SPEECH FINGERPRINT:');
  });
});

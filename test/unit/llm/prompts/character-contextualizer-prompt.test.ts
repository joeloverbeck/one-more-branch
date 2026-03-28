import { buildCharacterContextualizerPrompt } from '../../../../src/llm/prompts/character-contextualizer-prompt';
import type { CharacterContextualizerContext } from '../../../../src/llm/prompts/character-contextualizer-prompt';
import type { StandaloneDecomposedCharacter } from '../../../../src/models/standalone-decomposed-character';
import type { StorySpine } from '../../../../src/models/story-spine';

function makeCharacter(
  name: string,
  overrides: Partial<StandaloneDecomposedCharacter> = {}
): StandaloneDecomposedCharacter {
  return {
    id: `char-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    rawDescription: `${name} is dangerous and exhausted.`,
    speechFingerprint: {
      catchphrases: ['Stay on bearing.'],
      vocabularyProfile: 'Clipped naval diction',
      sentencePatterns: 'Short commands with precise follow-through',
      verbalTics: ['Listen'],
      dialogueSamples: ['Stay on bearing, and maybe we survive this yet.'],
      metaphorFrames: 'Storms and navigation',
      antiExamples: ['Whatever, let us vibe.'],
      discourseMarkers: ['No.', 'Then listen.'],
      registerShifts: 'Gets colder under pressure.',
    },
    coreTraits: ['guarded', 'precise'],
    knowledgeBoundaries: 'Knows the codes, not the mastermind.',
    decisionPattern: 'Acts fast, then fortifies the choice.',
    coreBeliefs: ['Competence is safer than trust'],
    conflictPriority: 'Mission over comfort',
    appearance: 'Rain-dark coat and immaculate gloves',
    createdAt: '2026-03-01T10:00:00.000Z',
    immediateObjectives: ['Secure the map', 'Test Tomas'],
    ...overrides,
  };
}

function makeSpine(): StorySpine {
  return {
    centralDramaticQuestion: 'Can trust survive the cost of survival?',
    protagonistNeedVsWant: {
      need: 'Trust others again',
      want: 'Recover the map first',
      dynamic: 'DIVERGENT',
    },
    primaryAntagonisticForce: {
      description: 'A surveillance state tightening around every failed oath',
      pressureMechanism: 'Turns suspicion into public ritual punishment',
    },
    storySpineType: 'MYSTERY',
    conflictAxis: 'TRUTH_VS_STABILITY',
    conflictType: 'EXTERNAL',
    characterArcType: 'POSITIVE_CHANGE',
    toneFeel: ['wet', 'claustrophobic', 'watchful'],
    toneAvoid: ['quirky', 'detached', 'campy'],
    wantNeedCollisionPoint: 'She can only save the city by exposing her own lie.',
    protagonistDeepestFear: 'Needing someone enough to be ruled by them again',
  };
}

function makeContext(): CharacterContextualizerContext {
  return {
    characters: [makeCharacter('Iria Vale'), makeCharacter('Tomas Wren')],
    protagonistIndex: 0,
    spine: makeSpine(),
    tone: 'tense and intimate',
  };
}

describe('buildCharacterContextualizerPrompt', () => {
  it('uses the shared standalone character profile view', () => {
    const messages = buildCharacterContextualizerPrompt(makeContext());
    const userContent = messages[1]?.content ?? '';

    expect(messages).toHaveLength(2);
    expect(userContent).toContain('CHARACTER PROFILES:');
    expect(userContent).toContain('Iria Vale');
    expect(userContent).toContain('  Traits: guarded, precise');
    expect(userContent).toContain('  Immediate Objectives: Secure the map; Test Tomas');
    expect(userContent).toContain(' (PROTAGONIST)');
    expect(userContent).toContain(' (NPC)');
    expect(userContent).not.toContain('Iria Vale is dangerous and exhausted.');
  });
});

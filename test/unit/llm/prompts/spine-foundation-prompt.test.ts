import { buildSpineFoundationPrompt } from '../../../../src/llm/prompts/spine-foundation-prompt';
import type { SpinePromptContext } from '../../../../src/llm/prompts/spine-prompt';
import type { DecomposedWorld } from '../../../../src/models/decomposed-world';
import type { StandaloneDecomposedCharacter } from '../../../../src/models/standalone-decomposed-character';

const DECOMPOSED_WORLD: DecomposedWorld = {
  worldLogline: 'A rain-soaked observatory city running on oath and suspicion.',
  facts: [
    {
      id: 'wf-1',
      domain: 'culture',
      fact: 'Naming a betrayer aloud in a sealed room is treated as a binding accusation.',
      scope: 'citywide',
      factType: 'PRACTICE',
      narrativeWeight: 'HIGH',
      sensoryHook: 'Voices drop whenever the ritual wording begins.',
    },
  ],
  rawWorldbuilding: 'A rain-soaked observatory city running on oath and suspicion.',
};

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
    superObjective: 'Recover the map',
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

function makeContext(): SpinePromptContext {
  return {
    tone: 'tense nautical intrigue',
    decomposedWorld: DECOMPOSED_WORLD,
    decomposedCharacters: [makeCharacter('Iria Vale'), makeCharacter('Tomas Wren')],
    startingSituation: 'The courier disappears before dawn with the only clean copy of the map.',
  };
}

describe('buildSpineFoundationPrompt', () => {
  it('uses the shared standalone character profile view for protagonist and NPCs', () => {
    const messages = buildSpineFoundationPrompt(makeContext());
    const userContent = messages[1]?.content ?? '';

    expect(messages).toHaveLength(2);
    expect(userContent).toContain('PROTAGONIST CHARACTER:');
    expect(userContent).toContain('NPC CHARACTERS (Pre-Decomposed Profiles):');
    expect(userContent).toContain('  Traits: guarded, precise');
    expect(userContent).toContain('  Immediate Objectives: Secure the map; Test Tomas');
    expect(userContent).not.toContain('Iria Vale is dangerous and exhausted.');
    expect(userContent).not.toContain('Tomas Wren is dangerous and exhausted.');
  });
});

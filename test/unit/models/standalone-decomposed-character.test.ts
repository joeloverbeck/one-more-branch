import { formatStandaloneCharacterSummary } from '../../../src/models/standalone-decomposed-character';
import { EmotionSalience } from '../../../src/models/character-enums';
import type { StandaloneDecomposedCharacter } from '../../../src/models/standalone-decomposed-character';

function makeCharacter(
  overrides: Partial<StandaloneDecomposedCharacter> = {}
): StandaloneDecomposedCharacter {
  return {
    id: 'char-iria-vale',
    name: 'Iria Vale',
    rawDescription: 'A dangerous and exhausted navigator.',
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
    falseBeliefs: ['Tomas already chose betrayal'],
    secretsKept: ['She copied the cipher key'],
    decisionPattern: 'Acts fast, then fortifies the choice.',
    coreBeliefs: ['Competence is safer than trust'],
    conflictPriority: 'Mission over comfort',
    appearance: 'Rain-dark coat and immaculate gloves',
    createdAt: '2026-03-01T10:00:00.000Z',
    stakes: ['Lose the map'],
    pressurePoint: 'Being publicly exposed as compromised',
    personalDilemmas: ['Protect the source or save the alliance'],
    emotionSalience: EmotionSalience.HIGH,
    moralLine: 'Will not hand civilians to the tribunal',
    worstFear: 'Being trapped under someone else’s command again',
    formativeWound: 'A prior captain framed her to save himself',
    misbelief: 'If she needs anyone, they own her',
    stressVariants: {
      underThreat: 'Gets colder and more procedural',
      inIntimacy: 'Deflects with mission language',
      whenLying: 'Over-explains tactical details',
      whenAshamed: 'Turns severe and overcorrects',
      whenWinning: 'Presses for irreversible leverage',
    },
    focalizationFilter: {
      noticesFirst: 'Breaks in resolve',
      systematicallyMisses: 'Unscripted kindness',
      misreadsAs: 'Reads hesitation as stalling',
    },
    escalationLadder: ['Warn once', 'Corner verbally', 'Force a commitment'],
    immediateObjectives: ['Secure the map', 'Test Tomas'],
    constraints: ['Cannot expose the informant'],
    desires: ['Control the terms of the exchange'],
    currentIntentions: ['Extract proof'],
    sociology: 'Officer caste training with dockside survival habits',
    ...overrides,
  };
}

describe('formatStandaloneCharacterSummary', () => {
  it('includes focalization and stress-variant details when present', () => {
    const result = formatStandaloneCharacterSummary(makeCharacter());

    expect(result).toContain('Focalization Filter:');
    expect(result).toContain('Notices First: Breaks in resolve');
    expect(result).toContain('Systematically Misses: Unscripted kindness');
    expect(result).toContain('Misreads As: Reads hesitation as stalling');
    expect(result).toContain('Stress Variants:');
    expect(result).toContain('Under Threat: Gets colder and more procedural');
    expect(result).toContain('When Winning: Presses for irreversible leverage');
  });
});

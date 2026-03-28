import {
  formatStandaloneCharacterPromptSummary,
  type StandaloneDecomposedCharacter,
} from '../../../src/models/standalone-decomposed-character';
import { EmotionSalience } from '../../../src/models/character-enums';

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

describe('formatStandaloneCharacterPromptSummary', () => {
  it('renders the identity view without psychology-only fields', () => {
    const result = formatStandaloneCharacterPromptSummary(makeCharacter(), 'identity');

    expect(result).toContain('Name: Iria Vale');
    expect(result).toContain('Core Traits: guarded, precise');
    expect(result).toContain('Appearance: Rain-dark coat and immaculate gloves');
    expect(result).not.toContain('Super-Objective:');
    expect(result).not.toContain('Knowledge Boundaries:');
    expect(result).not.toContain('A dangerous and exhausted navigator.');
  });

  it('renders the psychology view with structured lists and no raw description', () => {
    const result = formatStandaloneCharacterPromptSummary(makeCharacter(), 'psychology');

    expect(result).toContain('Super-Objective: Recover the map');
    expect(result).toContain('Stakes:\n- Lose the map');
    expect(result).toContain('Personal Dilemmas:\n- Protect the source or save the alliance');
    expect(result).toContain('Focalization Filter:');
    expect(result).toContain('- Notices First: Breaks in resolve');
    expect(result).toContain('Stress Variants:');
    expect(result).toContain('- When Winning: Presses for irreversible leverage');
    expect(result).toContain('Core Beliefs:\n- Competence is safer than trust');
    expect(result).toContain('Constraints:\n- Cannot expose the informant');
    expect(result).not.toContain('A dangerous and exhausted navigator.');
  });

  it('renders the standalone view for planner and spine consumers', () => {
    const result = formatStandaloneCharacterPromptSummary(makeCharacter(), 'standalone');

    expect(result).toContain('Iria Vale');
    expect(result).toContain('  Traits: guarded, precise');
    expect(result).toContain('  Super-Objective: Recover the map');
    expect(result).toContain('  Focalization Filter:');
    expect(result).toContain('    Notices First: Breaks in resolve');
    expect(result).toContain('  Stress Variants:');
    expect(result).toContain('    Under Threat: Gets colder and more procedural');
    expect(result).toContain('  Immediate Objectives: Secure the map; Test Tomas');
    expect(result).not.toContain('A dangerous and exhausted navigator.');
  });
});

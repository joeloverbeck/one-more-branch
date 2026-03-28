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

    expect(result).toBe(
      [
        'Name: Iria Vale',
        'Core Traits: guarded, precise',
        'Appearance: Rain-dark coat and immaculate gloves',
      ].join('\n')
    );
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
    expect(result).toContain('Knowledge Boundaries: Knows the codes, not the mastermind.');
    expect(result).toContain('Decision Pattern: Acts fast, then fortifies the choice.');
    expect(result).toContain('Conflict Priority: Mission over comfort');
    expect(result).toContain('Appearance: Rain-dark coat and immaculate gloves');
    expect(result).toContain('Core Beliefs:\n- Competence is safer than trust');
    expect(result).toContain('False Beliefs:\n- Tomas already chose betrayal');
    expect(result).toContain('Secrets Kept:\n- She copied the cipher key');
    expect(result).toContain('Immediate Objectives: Secure the map; Test Tomas');
    expect(result).toContain('Constraints:\n- Cannot expose the informant');
    expect(result).toContain('Desires:\n- Control the terms of the exchange');
    expect(result).toContain('Current Intentions:\n- Extract proof');
    expect(result).toContain(
      'Sociology: Officer caste training with dockside survival habits'
    );
    expect(result).not.toContain('A dangerous and exhausted navigator.');
  });

  it('renders the standalone view for shared downstream consumers without psychology-only sections', () => {
    const result = formatStandaloneCharacterPromptSummary(makeCharacter(), 'standalone');

    expect(result).toContain('Iria Vale');
    expect(result).toContain('  Traits: guarded, precise');
    expect(result).toContain('  Super-Objective: Recover the map');
    expect(result).toContain('  Appearance: Rain-dark coat and immaculate gloves');
    expect(result).toContain('  Stakes: Lose the map');
    expect(result).toContain(
      '  Pressure Point: Being publicly exposed as compromised'
    );
    expect(result).toContain('  Dilemmas: Protect the source or save the alliance');
    expect(result).toContain('  Emotion Salience: HIGH');
    expect(result).toContain('  Moral Line: Will not hand civilians to the tribunal');
    expect(result).toContain(
      '  Worst Fear: Being trapped under someone else’s command again'
    );
    expect(result).toContain('  Formative Wound: A prior captain framed her to save himself');
    expect(result).toContain('  Misbelief: If she needs anyone, they own her');
    expect(result).toContain('  Focalization Filter:');
    expect(result).toContain('    Notices First: Breaks in resolve');
    expect(result).toContain('  Stress Variants:');
    expect(result).toContain('    Under Threat: Gets colder and more procedural');
    expect(result).toContain('  Escalation Ladder: Warn once → Corner verbally → Force a commitment');
    expect(result).toContain('  Immediate Objectives: Secure the map; Test Tomas');
    expect(result).toContain('  Constraints: Cannot expose the informant');
    expect(result).toContain('  Desires: Control the terms of the exchange');
    expect(result).toContain('  Current Intentions: Extract proof');
    expect(result).toContain(
      '  Sociology: Officer caste training with dockside survival habits'
    );
    expect(result).not.toContain('Knowledge Boundaries:');
    expect(result).not.toContain('Decision Pattern:');
    expect(result).not.toContain('Conflict Priority:');
    expect(result).not.toContain('Core Beliefs:');
    expect(result).not.toContain('False Beliefs:');
    expect(result).not.toContain('Secrets Kept:');
    expect(result).not.toContain('A dangerous and exhausted navigator.');
  });
});

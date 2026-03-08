import type { SavedDevelopedCharacter } from '../../../src/models/saved-developed-character.js';
import {
  isSavedDevelopedCharacter,
  isCharacterStageComplete,
  canGenerateCharacterStage,
  isCharacterFullyComplete,
} from '../../../src/models/saved-developed-character.js';

function makeValidCharacter(
  overrides: Partial<SavedDevelopedCharacter> = {},
): SavedDevelopedCharacter {
  return {
    id: 'char-1',
    characterName: 'Test Character',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    sourceWebId: 'web-1',
    sourceWebName: 'Test Web',
    webContext: {
      assignment: {
        characterName: 'Test Character',
        isProtagonist: false,
        storyFunction: 'ANTAGONIST',
        characterDepth: 'COMPLEX',
        narrativeRole: 'Main antagonist',
        conflictRelationship: 'Direct opposition',
      },
      relationshipArchetypes: [],
      castDynamicsSummary: 'A tense cast dynamic.',
    },
    characterKernel: null,
    tridimensionalProfile: null,
    agencyModel: null,
    deepRelationships: null,
    textualPresentation: null,
    completedStages: [],
    ...overrides,
  };
}

describe('isSavedDevelopedCharacter', () => {
  it('returns true for valid object with all nullable fields null', () => {
    const char = makeValidCharacter();
    expect(isSavedDevelopedCharacter(char)).toBe(true);
  });

  it('returns true for valid object with all stages populated', () => {
    const char = makeValidCharacter({
      characterKernel: {
        characterName: 'Test',
        superObjective: 'Dominate',
        immediateObjectives: ['Plan'],
        primaryOpposition: 'Hero',
        stakes: ['Life'],
        constraints: ['Time'],
        pressurePoint: 'Weakness',
      },
      tridimensionalProfile: {
        characterName: 'Test',
        physiology: 'Tall',
        sociology: 'Noble',
        psychology: 'Ruthless',
        derivationChain: 'Chain',
        coreTraits: ['Ambitious'],
      },
      agencyModel: {
        characterName: 'Test',
        replanningPolicy: 'STUBBORN',
        emotionSalience: 'LOW',
        coreBeliefs: ['Power'],
        desires: ['Control'],
        currentIntentions: ['Attack'],
        falseBeliefs: ['Invincible'],
        decisionPattern: 'Calculated',
      },
      deepRelationships: {
        relationships: [],
        secrets: ['A dark secret'],
        personalDilemmas: ['A tough choice'],
      },
      textualPresentation: {
        characterName: 'Test',
        voiceRegister: 'FORMAL',
        speechFingerprint: {
          lexicon: 'archaic',
          cadence: 'measured',
          verbalTics: ['indeed'],
        },
        appearance: 'Tall and dark',
        knowledgeBoundaries: 'Knows magic',
        conflictPriority: 'Self-preservation',
      },
      completedStages: [1, 2, 3, 4, 5],
    });
    expect(isSavedDevelopedCharacter(char)).toBe(true);
  });

  it('returns false for missing required fields', () => {
    expect(isSavedDevelopedCharacter({})).toBe(false);
    expect(isSavedDevelopedCharacter(null)).toBe(false);
    expect(isSavedDevelopedCharacter(undefined)).toBe(false);
    expect(isSavedDevelopedCharacter('string')).toBe(false);

    // Missing id
    const { id: _, ...noId } = makeValidCharacter();
    void _;
    expect(isSavedDevelopedCharacter(noId)).toBe(false);

    // Missing characterName
    const { characterName: _2, ...noName } = makeValidCharacter();
    void _2;
    expect(isSavedDevelopedCharacter(noName)).toBe(false);

    // Missing webContext
    const { webContext: _3, ...noWebContext } = makeValidCharacter();
    void _3;
    expect(isSavedDevelopedCharacter(noWebContext)).toBe(false);

    // Missing completedStages
    const { completedStages: _4, ...noStages } = makeValidCharacter();
    void _4;
    expect(isSavedDevelopedCharacter(noStages)).toBe(false);
  });
});

describe('isCharacterStageComplete', () => {
  it('returns true when stage is in completedStages', () => {
    const char = makeValidCharacter({ completedStages: [1, 2, 3] });
    expect(isCharacterStageComplete(char, 1)).toBe(true);
    expect(isCharacterStageComplete(char, 2)).toBe(true);
    expect(isCharacterStageComplete(char, 3)).toBe(true);
  });

  it('returns false when stage is not in completedStages', () => {
    const char = makeValidCharacter({ completedStages: [1, 2] });
    expect(isCharacterStageComplete(char, 3)).toBe(false);
    expect(isCharacterStageComplete(char, 4)).toBe(false);
    expect(isCharacterStageComplete(char, 5)).toBe(false);
  });
});

describe('canGenerateCharacterStage', () => {
  it('returns true for stage 1 always', () => {
    const char = makeValidCharacter({ completedStages: [] });
    expect(canGenerateCharacterStage(char, 1)).toBe(true);
  });

  it('returns true for stage 2 when stage 1 complete', () => {
    const char = makeValidCharacter({ completedStages: [1] });
    expect(canGenerateCharacterStage(char, 2)).toBe(true);
  });

  it('returns false for stage 2 when stage 1 not complete', () => {
    const char = makeValidCharacter({ completedStages: [] });
    expect(canGenerateCharacterStage(char, 2)).toBe(false);
  });

  it('returns false for stage 5 when stage 4 not complete', () => {
    const char = makeValidCharacter({ completedStages: [1, 2, 3] });
    expect(canGenerateCharacterStage(char, 5)).toBe(false);
  });

  it('returns true for stage 5 when stage 4 complete', () => {
    const char = makeValidCharacter({ completedStages: [1, 2, 3, 4] });
    expect(canGenerateCharacterStage(char, 5)).toBe(true);
  });
});

describe('isCharacterFullyComplete', () => {
  it('returns true when all 5 stages complete', () => {
    const char = makeValidCharacter({ completedStages: [1, 2, 3, 4, 5] });
    expect(isCharacterFullyComplete(char)).toBe(true);
  });

  it('returns false when any stage missing', () => {
    const char1 = makeValidCharacter({ completedStages: [1, 2, 3, 4] });
    expect(isCharacterFullyComplete(char1)).toBe(false);

    const char2 = makeValidCharacter({ completedStages: [] });
    expect(isCharacterFullyComplete(char2)).toBe(false);

    const char3 = makeValidCharacter({ completedStages: [1, 3, 5] });
    expect(isCharacterFullyComplete(char3)).toBe(false);
  });
});

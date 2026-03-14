import {
  CharacterDepth,
  EmotionSalience,
  PipelineRelationshipType,
  RelationshipValence,
  ReplanningPolicy,
  StoryFunction,
  VoiceRegister,
} from '../../../src/models/character-enums.js';
import type {
  CastRoleAssignment,
  RelationshipArchetype,
} from '../../../src/models/character-pipeline-types.js';
import {
  toDecomposedCharacter,
  toDecomposedCharacterFromWeb,
} from '../../../src/models/character-web-converter.js';
import type {
  CharacterWebContext,
  SavedDevelopedCharacter,
} from '../../../src/models/saved-developed-character.js';

function createAssignment(
  overrides: Partial<CastRoleAssignment> = {},
): CastRoleAssignment {
  return {
    characterName: 'Mara Voss',
    isProtagonist: false,
    storyFunction: StoryFunction.RIVAL,
    characterDepth: CharacterDepth.ROUND,
    narrativeRole: 'A brilliant salvager who keeps outbidding the crew.',
    conflictRelationship: 'She needs the protagonist but refuses to yield control.',
    ...overrides,
  };
}

function createArchetypes(): readonly RelationshipArchetype[] {
  return [
    {
      fromCharacter: 'Mara Voss',
      toCharacter: 'Iria Vale',
      relationshipType: PipelineRelationshipType.RIVAL,
      valence: RelationshipValence.AMBIVALENT,
      essentialTension: 'They need each other to survive, but each reads compromise as surrender.',
    },
    {
      fromCharacter: 'Mara Voss',
      toCharacter: 'Quartermaster Pell',
      relationshipType: PipelineRelationshipType.CLIENT,
      valence: RelationshipValence.NEGATIVE,
      essentialTension: 'Debt keeps them aligned only until the money runs out.',
    },
  ];
}

function createWebContext(
  overrides: Partial<CharacterWebContext> = {},
): CharacterWebContext {
  return {
    assignment: createAssignment(),
    protagonistName: 'Iria Vale',
    relationshipArchetypes: createArchetypes(),
    castDynamicsSummary: 'Everyone shares the route, but no one shares the terms.',
    ...overrides,
  };
}

function createCharacter(
  overrides: Partial<SavedDevelopedCharacter> = {},
): SavedDevelopedCharacter {
  return {
    id: 'char-mara',
    characterName: 'Mara Voss',
    createdAt: '2026-03-08T10:00:00.000Z',
    updatedAt: '2026-03-08T10:00:00.000Z',
    sourceWebId: 'web-1',
    characterKernel: {
      characterName: 'Mara Voss',
      superObjective: 'Claim the route before the protagonist can legitimize it.',
      immediateObjectives: ['Milestone Iria to the archive', 'Keep Pell indebted'],
      primaryOpposition: 'Iria Vale forcing cooperation',
      stakes: ['Lose the route', 'Lose control of her crew'],
      constraints: ['Cannot expose how deep her debt runs'],
      pressurePoint: 'Any reminder that she once chose profit over family',
    },
    tridimensionalProfile: {
      characterName: 'Mara Voss',
      physiology: 'Lean, sleepless, and always half a step ahead of collapse.',
      sociology: 'Raised in dockside debt rings and taught to price affection as leverage.',
      psychology: 'Competitive, suspicious, and incapable of accepting grace without testing it.',
      derivationChain: 'Scarcity taught her to confuse dependence with defeat.',
      coreTraits: ['competitive', 'wary', 'resourceful'],
    },
    agencyModel: {
      characterName: 'Mara Voss',
      replanningPolicy: ReplanningPolicy.ON_NEW_INFORMATION,
      emotionSalience: EmotionSalience.MEDIUM,
      coreBeliefs: ['Control is safer than trust', 'Debt always gets collected'],
      desires: ['Own the route', 'Stay indispensable'],
      currentIntentions: ['Outmaneuver Iria', 'Contain Pell'],
      falseBeliefs: ['The protagonist will exploit any mercy she shows'],
      decisionPattern: 'She bargains first, escalates second, and apologizes never.',
    },
    deepRelationships: {
      relationships: [
        {
          fromCharacter: 'Mara Voss',
          toCharacter: 'Iria Vale',
          relationshipType: PipelineRelationshipType.RIVAL,
          valence: RelationshipValence.AMBIVALENT,
          numericValence: -1,
          history: 'They once split a score cleanly, then spent years proving that was a mistake.',
          currentTension: 'They must share the route long enough to seize it, but neither can bear to owe the other.',
          leverage: 'Mara knows which forged manifest would destroy Iria in court.',
        },
      ],
      secrets: ['She arranged the debt that trapped Pell in her service.'],
      personalDilemmas: ['Win alone and lose the route, or trust Iria and lose control.'],
    },
    textualPresentation: {
      characterName: 'Mara Voss',
      voiceRegister: VoiceRegister.COLLOQUIAL,
      speechFingerprint: {
        catchphrases: ['Price it properly.'],
        vocabularyProfile: 'Dockside trader slang sharpened into precise threats.',
        sentencePatterns: 'Short clauses, then a sting in the tail.',
        verbalTics: ['Listen'],
        dialogueSamples: ['Price it properly, and maybe I stop treating you like a liability.'],
        metaphorFrames: 'Debt, weather, knives, and salvage.',
        antiExamples: ['Let us trust the process and stay positive.'],
        discourseMarkers: ['Fine.', 'Listen.', 'No.'],
        registerShifts: 'Gets flatter and colder when cornered.',
      },
      appearance: 'Salt-stained finery worn like a dare.',
      knowledgeBoundaries: 'Knows the debt network and the archive route, but misreads how far Iria will bend.',
      conflictPriority: 'Control of the route matters more than temporary alliance.',
    },
    completedStages: [1, 2, 3, 4, 5],
    ...overrides,
  };
}

describe('toDecomposedCharacter', () => {
  it('maps a fully developed character into a DecomposedCharacter', () => {
    const result = toDecomposedCharacter(createCharacter(), createWebContext());

    expect(result).toEqual({
      name: 'Mara Voss',
      speechFingerprint: createCharacter().textualPresentation!.speechFingerprint,
      coreTraits: ['competitive', 'wary', 'resourceful'],
      superObjective: 'Claim the route before the protagonist can legitimize it.',
      thematicStance:
        'Iria Vale forcing cooperation turns Lose the route, Lose control of her crew into a personal test.',
      protagonistRelationship: {
        valence: -1,
        dynamic: 'RIVAL',
        history:
          'They once split a score cleanly, then spent years proving that was a mistake.',
        currentTension:
          'They must share the route long enough to seize it, but neither can bear to owe the other.',
        leverage: 'Mara knows which forged manifest would destroy Iria in court.',
      },
      knowledgeBoundaries:
        'Knows the debt network and the archive route, but misreads how far Iria will bend.',
      falseBeliefs: ['The protagonist will exploit any mercy she shows'],
      secretsKept: ['She arranged the debt that trapped Pell in her service.'],
      decisionPattern: 'She bargains first, escalates second, and apologizes never.',
      coreBeliefs: ['Control is safer than trust', 'Debt always gets collected'],
      conflictPriority: 'Control of the route matters more than temporary alliance.',
      appearance: 'Salt-stained finery worn like a dare.',
      rawDescription:
        'Mara Voss is driven by Claim the route before the protagonist can legitimize it. Lean, sleepless, and always half a step ahead of collapse. Raised in dockside debt rings and taught to price affection as leverage. Competitive, suspicious, and incapable of accepting grace without testing it.',
    });
  });

  it('returns null protagonistRelationship for the protagonist character', () => {
    const result = toDecomposedCharacter(
      createCharacter({
        characterName: 'Iria Vale',
      }),
      createWebContext({
        assignment: createAssignment({
          characterName: 'Iria Vale',
          isProtagonist: true,
          storyFunction: StoryFunction.CATALYST,
        }),
      }),
    );

    expect(result.protagonistRelationship).toBeNull();
  });

  it('returns null protagonistRelationship when no protagonist-facing relationship exists', () => {
    const result = toDecomposedCharacter(
      createCharacter({
        deepRelationships: {
          relationships: [
            {
              fromCharacter: 'Mara Voss',
              toCharacter: 'Quartermaster Pell',
              relationshipType: PipelineRelationshipType.CLIENT,
              valence: RelationshipValence.NEGATIVE,
              numericValence: -3,
              history: 'Pell borrowed from Mara and never caught up.',
              currentTension: 'Pell is planning to bolt.',
              leverage: 'Mara controls the books.',
            },
          ],
          secrets: ['She forged Pell into debt.'],
          personalDilemmas: ['Cut Pell loose or drag him under.'],
        },
      }),
      createWebContext(),
    );

    expect(result.protagonistRelationship).toBeNull();
  });

  it('throws when completedStages claim a full character but required stage payloads are missing', () => {
    expect(() =>
      toDecomposedCharacter(
        createCharacter({
          agencyModel: null,
        }),
        createWebContext(),
      ),
    ).toThrow('Character Mara Voss is missing completed stage data');
  });
});

describe('toDecomposedCharacterFromWeb', () => {
  it('builds a lightweight valid DecomposedCharacter from assignment and protagonist-facing archetypes', () => {
    const result = toDecomposedCharacterFromWeb(
      createAssignment(),
      createArchetypes(),
      'Iria Vale',
    );

    expect(result).toEqual({
      name: 'Mara Voss',
      speechFingerprint: {
        catchphrases: [],
        vocabularyProfile: 'Concrete, role-shaped language with no established signature yet.',
        sentencePatterns: 'Direct sentences that reflect function before nuance.',
        verbalTics: [],
        dialogueSamples: [],
        metaphorFrames: '',
        antiExamples: [],
        discourseMarkers: [],
        registerShifts: '',
      },
      coreTraits: ['rival', 'round'],
      superObjective:
        'A brilliant salvager who keeps outbidding the crew. She needs the protagonist but refuses to yield control.',
      thematicStance:
        'They need each other to survive, but each reads compromise as surrender. This defines how this rival pressures the protagonist.',
      protagonistRelationship: {
        valence: 0,
        dynamic: 'RIVAL',
        history:
          'They need each other to survive, but each reads compromise as surrender.',
        currentTension:
          'They need each other to survive, but each reads compromise as surrender.',
        leverage:
          'They need each other to survive, but each reads compromise as surrender.',
      },
      knowledgeBoundaries:
        'Only web-level role knowledge is established so far: A brilliant salvager who keeps outbidding the crew.',
      decisionPattern:
        'Acts according to a round rival role, pushing through she needs the protagonist but refuses to yield control.',
      coreBeliefs: [
        'A brilliant salvager who keeps outbidding the crew.',
        'She needs the protagonist but refuses to yield control.',
      ],
      conflictPriority: 'She needs the protagonist but refuses to yield control.',
      appearance:
        'No dedicated presentation yet; presence should read as a brilliant salvager who keeps outbidding the crew.',
      rawDescription:
        'Mara Voss is the round rival of the cast: A brilliant salvager who keeps outbidding the crew. She needs the protagonist but refuses to yield control. Their defining protagonist-facing tension is They need each other to survive, but each reads compromise as surrender.',
    });
  });

  it('returns null protagonistRelationship when no protagonist-facing archetype exists', () => {
    const result = toDecomposedCharacterFromWeb(
      createAssignment(),
      [
        {
          fromCharacter: 'Mara Voss',
          toCharacter: 'Quartermaster Pell',
          relationshipType: PipelineRelationshipType.CLIENT,
          valence: RelationshipValence.NEGATIVE,
          essentialTension: 'Debt keeps them aligned only until the money runs out.',
        },
      ],
      'Iria Vale',
    );

    expect(result.protagonistRelationship).toBeNull();
    expect(result.thematicStance).toBe(
      'She needs the protagonist but refuses to yield control. This defines how this rival pressures the story.',
    );
  });

  it('uses the explicit protagonistName contract instead of inferring protagonist identity', () => {
    const result = toDecomposedCharacterFromWeb(
      createAssignment(),
      createArchetypes(),
      'Someone Else',
    );

    expect(result.protagonistRelationship).toBeNull();
  });

  it('returns null protagonistRelationship for the protagonist character', () => {
    const result = toDecomposedCharacterFromWeb(
      createAssignment({
        characterName: 'Iria Vale',
        isProtagonist: true,
        storyFunction: StoryFunction.CATALYST,
      }),
      createArchetypes(),
      'Iria Vale',
    );

    expect(result.protagonistRelationship).toBeNull();
  });
});

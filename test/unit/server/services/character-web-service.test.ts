import { EngineError } from '@/engine/types';
import type { RunCharacterStageResult } from '@/llm/character-stage-runner';
import {
  CharacterDepth,
  PipelineRelationshipType,
  RelationshipValence,
  StoryFunction,
  VoiceRegister,
} from '@/models/character-enums';
import type {
  CastPipelineInputs,
  CastRoleAssignment,
  CharacterDevStage,
  RelationshipArchetype,
} from '@/models/character-pipeline-types';
import type { DecomposedCharacter } from '@/models/decomposed-character';
import type { SavedCharacterWeb } from '@/models/saved-character-web';
import type {
  CharacterWebContext,
  SavedDevelopedCharacter,
} from '@/models/saved-developed-character';
import {
  createCharacterWebService,
  type CharacterWebService,
} from '@/services/character-web-service';

type CharacterWebServiceDeps = NonNullable<Parameters<typeof createCharacterWebService>[0]>;

function createAssignment(
  overrides: Partial<CastRoleAssignment> = {},
): CastRoleAssignment {
  return {
    characterName: 'Iria Vale',
    isProtagonist: true,
    storyFunction: StoryFunction.CATALYST,
    characterDepth: CharacterDepth.ROUND,
    narrativeRole: 'A disgraced navigator chasing a vanished map.',
    conflictRelationship: 'Needs allies but distrusts every dependency.',
    ...overrides,
  };
}

function createArchetypes(): readonly RelationshipArchetype[] {
  return [
    {
      fromCharacter: 'Iria Vale',
      toCharacter: 'Mara Voss',
      relationshipType: PipelineRelationshipType.RIVAL,
      valence: RelationshipValence.AMBIVALENT,
      essentialTension: 'They need each other to survive, but neither can tolerate surrender.',
    },
  ];
}

function createInputs(overrides: Partial<CastPipelineInputs> = {}): CastPipelineInputs {
  return {
    kernelSummary: 'A revenge story about inherited guilt.',
    conceptSummary: 'A fugitive captain leads an impossible expedition.',
    userNotes: 'Keep everyone dangerous and emotionally articulate.',
    ...overrides,
  };
}

function createWeb(overrides: Partial<SavedCharacterWeb> = {}): SavedCharacterWeb {
  return {
    id: 'web-1',
    name: 'Shattered Compass',
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:00.000Z',
    sourceConceptId: 'concept-1',
    protagonistName: 'Iria Vale',
    inputs: createInputs(),
    assignments: [
      createAssignment(),
      createAssignment({
        characterName: 'Mara Voss',
        isProtagonist: false,
        storyFunction: StoryFunction.RIVAL,
        narrativeRole: 'A salvage captain who confuses control with safety.',
        conflictRelationship: 'Needs the protagonist to win but hates owing her.',
      }),
    ],
    relationshipArchetypes: createArchetypes(),
    castDynamicsSummary: 'The crew survives by weaponizing trust they do not actually possess.',
    ...overrides,
  };
}

function createCharacter(
  overrides: Partial<SavedDevelopedCharacter> = {},
): SavedDevelopedCharacter {
  return {
    id: 'char-1',
    characterName: 'Iria Vale',
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:00.000Z',
    sourceWebId: 'web-1',
    characterKernel: null,
    tridimensionalProfile: null,
    agencyModel: null,
    deepRelationships: null,
    textualPresentation: null,
    completedStages: [],
    ...overrides,
  };
}

function createCompletedCharacter(
  overrides: Partial<SavedDevelopedCharacter> = {},
): SavedDevelopedCharacter {
  return createCharacter({
    characterKernel: {
      characterName: 'Iria Vale',
      superObjective: 'Recover the map and restore her name.',
      immediateObjectives: ['Reach the observatory'],
      primaryOpposition: 'The admiralty hunting her crew',
      stakes: ['Lose her final chance at vindication'],
      constraints: ['Cannot reveal who gave her the chart'],
      pressurePoint: 'Any hint that she betrayed her brother',
    },
    tridimensionalProfile: {
      characterName: 'Iria Vale',
      physiology: 'Sea-worn and sleepless.',
      sociology: 'Raised in naval privilege, now surviving among smugglers.',
      psychology: 'Hypervigilant, proud, and unable to forgive dependence.',
      derivationChain: 'Exile turned competence into armor.',
      coreTraits: ['guarded', 'precise', 'resourceful'],
    },
    agencyModel: {
      characterName: 'Iria Vale',
      replanningPolicy: 'ON_NEW_INFORMATION',
      emotionSalience: 'HIGH',
      coreBeliefs: ['Competence is the only safe currency'],
      desires: ['Reclaim command'],
      currentIntentions: ['Decode the map'],
      falseBeliefs: ['Mara will betray her first'],
      decisionPattern: 'She improvises fast but doubles down when pride is threatened.',
    },
    deepRelationships: {
      relationships: [],
      secrets: ['She burned the original chart fragment.'],
      personalDilemmas: ['Trust Mara or die alone.'],
    },
    textualPresentation: {
      characterName: 'Iria Vale',
      voiceRegister: VoiceRegister.FORMAL,
      speechFingerprint: {
        catchphrases: [],
        vocabularyProfile: 'Controlled naval diction.',
        sentencePatterns: 'Short commands followed by explanation.',
        verbalTics: [],
        dialogueSamples: [],
        metaphorFrames: '',
        antiExamples: [],
        discourseMarkers: [],
        registerShifts: '',
      },
      appearance: 'Always immaculate above the collar.',
      knowledgeBoundaries: 'Knows the admiralty codebook.',
      conflictPriority: 'Protect the mission before affection.',
    },
    completedStages: [1, 2, 3, 4, 5],
    ...overrides,
  });
}

function createDecomposedCharacter(name: string): DecomposedCharacter {
  return {
    name,
    speechFingerprint: {
      catchphrases: [],
      vocabularyProfile: 'Controlled diction.',
      sentencePatterns: 'Short commands.',
      verbalTics: [],
      dialogueSamples: [],
      metaphorFrames: '',
      antiExamples: [],
      discourseMarkers: [],
      registerShifts: '',
    },
    coreTraits: ['guarded'],
    motivations: 'Survive',
    thematicStance: 'Trust is a liability.',
    protagonistRelationship: null,
    knowledgeBoundaries: 'Knows enough to stay dangerous.',
    decisionPattern: 'Act first.',
    coreBeliefs: ['Competence matters'],
    conflictPriority: 'Winning',
    appearance: 'Salt-stained finery.',
    rawDescription: 'A dangerous navigator.',
  };
}

function createMockConcept(): Record<string, unknown> {
  return {
    id: 'concept-1',
    name: 'Test Concept',
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:00.000Z',
    sourceKernelId: 'kernel-1',
    seeds: {},
    evaluatedConcept: {
      concept: {
        oneLineHook: 'A fugitive captain leads an impossible expedition.',
        elevatorParagraph: 'She must navigate betrayal and storm to reach the lost island.',
        protagonistSeed: 'Iria Vale',
        genreFrame: 'ADVENTURE',
        conflictLever: 'Trust vs survival',
        settingSeed: 'Storm-wracked seas',
        toneInstruction: 'Dark adventure',
        incitingDisruption: 'A vanished map resurfaces',
        escapeValve: 'Abandon the expedition',
      },
      scores: {
        hookStrength: 4,
        conflictEngine: 4,
        agencyBreadth: 3,
        noveltyLeverage: 3,
        llmFeasibility: 4,
        ironicPremise: 3,
        sceneGenerativePower: 4,
        contentCharge: 3,
      },
      overallScore: 3.5,
      passes: true,
      strengths: ['Strong hook'],
      weaknesses: ['Needs more tension'],
      tradeoffSummary: 'Good balance.',
    },
  };
}

function createMockKernel(): Record<string, unknown> {
  return {
    id: 'kernel-1',
    name: 'Test Kernel',
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:00.000Z',
    seeds: {},
    evaluatedKernel: {
      kernel: {
        dramaticThesis: 'A revenge story about inherited guilt.',
        antithesis: 'Guilt is inescapable.',
        valueAtStake: 'Freedom',
        opposingForce: 'The admiralty',
        directionOfChange: 'NEGATIVE',
        conflictAxis: 'DUTY_VS_DESIRE',
        dramaticStance: 'TRAGIC',
        thematicQuestion: 'Can guilt be inherited?',
      },
      scores: {
        tensionPolarity: 4,
        thematicWeight: 4,
        narrativeGenerativity: 3,
        playerAgencyFit: 3,
        emotionalResonance: 4,
      },
      overallScore: 3.6,
      passes: true,
      strengths: ['Strong thesis'],
      weaknesses: ['Narrow scope'],
      tradeoffSummary: 'Deep but focused.',
    },
  };
}

function createDeps(): jest.Mocked<CharacterWebServiceDeps> {
  return {
    now: jest.fn().mockReturnValue('2026-03-09T12:00:00.000Z'),
    createId: jest.fn().mockReturnValue('generated-id'),
    saveCharacterWeb: jest.fn().mockResolvedValue(undefined),
    loadCharacterWeb: jest.fn().mockResolvedValue(null),
    listCharacterWebs: jest.fn().mockResolvedValue([]),
    deleteCharacterWeb: jest.fn().mockResolvedValue(undefined),
    saveDevelopedCharacter: jest.fn().mockResolvedValue(undefined),
    loadDevelopedCharacter: jest
      .fn<ReturnType<CharacterWebServiceDeps['loadDevelopedCharacter']>, Parameters<CharacterWebServiceDeps['loadDevelopedCharacter']>>()
      .mockRejectedValue(new Error('Developed character not found: missing')),
    listDevelopedCharactersByWebId: jest.fn().mockResolvedValue([]),
    deleteDevelopedCharacter: jest.fn().mockResolvedValue(undefined),
    generateCharacterWeb: jest.fn().mockResolvedValue({
      assignments: createWeb().assignments,
      relationshipArchetypes: createArchetypes(),
      castDynamicsSummary: createWeb().castDynamicsSummary,
      rawResponse: 'raw-web',
    }),
    runCharacterStage: jest.fn().mockResolvedValue({
      updatedCharacter: createCharacter(),
      rawResponse: 'raw-stage',
    } satisfies RunCharacterStageResult),
    toDecomposedCharacter: jest
      .fn<DecomposedCharacter, [SavedDevelopedCharacter, CharacterWebContext]>()
      .mockImplementation((character) => createDecomposedCharacter(character.characterName)),
    toDecomposedCharacterFromWeb: jest
      .fn<DecomposedCharacter, [CastRoleAssignment, readonly RelationshipArchetype[], string]>()
      .mockImplementation((assignment) => createDecomposedCharacter(assignment.characterName)),
    loadConcept: jest.fn().mockResolvedValue(createMockConcept()),
    loadKernel: jest.fn().mockResolvedValue(createMockKernel()),
  };
}

describe('character-web-service', () => {
  let deps: jest.Mocked<CharacterWebServiceDeps>;
  let service: CharacterWebService;

  beforeEach(() => {
    deps = createDeps();
    service = createCharacterWebService(deps);
  });

  it('createWeb persists a new metadata-only web with sourceConceptId', async () => {
    const result = await service.createWeb(
      '  Shattered Compass  ',
      '  concept-1  ',
      '  Keep everyone dangerous. ',
    );

    expect(deps.saveCharacterWeb).toHaveBeenCalledWith({
      id: 'generated-id',
      name: 'Shattered Compass',
      createdAt: '2026-03-09T12:00:00.000Z',
      updatedAt: '2026-03-09T12:00:00.000Z',
      sourceConceptId: 'concept-1',
      protagonistName: '',
      inputs: {
        userNotes: 'Keep everyone dangerous.',
      },
      assignments: [],
      relationshipArchetypes: [],
      castDynamicsSummary: '',
    });
    expect(result.protagonistName).toBe('');
  });

  it('generateWeb derives inputs from concept+kernel, persists protagonist identity, and emits progress', async () => {
    deps.loadCharacterWeb.mockResolvedValue(createWeb({ protagonistName: '', assignments: [] }));
    const onStage = jest.fn();

    const result = await service.generateWeb(' web-1 ', ' valid-api-key-12345 ', onStage);

    expect(deps.loadConcept).toHaveBeenCalledWith('concept-1');
    expect(deps.loadKernel).toHaveBeenCalledWith('kernel-1');
    expect(deps.generateCharacterWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        kernelSummary: expect.stringContaining('A revenge story about inherited guilt.'),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        conceptSummary: expect.stringContaining('A fugitive captain leads an impossible expedition.'),
      }),
      'valid-api-key-12345',
    );
    expect(deps.saveCharacterWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'web-1',
        protagonistName: 'Iria Vale',
        assignments: createWeb().assignments,
        relationshipArchetypes: createArchetypes(),
      }),
    );
    expect(onStage).toHaveBeenNthCalledWith(1, {
      stage: 'GENERATING_CHARACTER_WEB',
      status: 'started',
      attempt: 1,
    });
    expect(onStage).toHaveBeenNthCalledWith(2, {
      stage: 'GENERATING_CHARACTER_WEB',
      status: 'completed',
      attempt: 1,
    });
    expect(result.protagonistName).toBe('Iria Vale');
  });

  it('generateWeb rejects generated webs without exactly one protagonist', async () => {
    deps.loadCharacterWeb.mockResolvedValue(createWeb({ protagonistName: '', assignments: [] }));
    deps.generateCharacterWeb.mockResolvedValue({
      assignments: [
        createAssignment(),
        createAssignment({ characterName: 'Mara Voss', isProtagonist: true }),
      ],
      relationshipArchetypes: [],
      castDynamicsSummary: 'Broken crew.',
      rawResponse: 'raw-web',
    });

    await expect(service.generateWeb('web-1', 'valid-api-key-12345')).rejects.toThrow(
      'Character web requires exactly one protagonist assignment; found 2',
    );
  });

  it('initializeCharacter snapshots current web context and null stages', async () => {
    deps.loadCharacterWeb.mockResolvedValue(createWeb());

    const result = await service.initializeCharacter('web-1', '  mara voss ');

    expect(deps.saveDevelopedCharacter).toHaveBeenCalledWith({
      id: 'generated-id',
      characterName: 'Mara Voss',
      createdAt: '2026-03-09T12:00:00.000Z',
      updatedAt: '2026-03-09T12:00:00.000Z',
      sourceWebId: 'web-1',
      characterKernel: null,
      tridimensionalProfile: null,
      agencyModel: null,
      deepRelationships: null,
      textualPresentation: null,
      completedStages: [],
    });
    expect(result.characterName).toBe('Mara Voss');
  });

  it('initializeCharacter rejects names not present in the web assignments', async () => {
    deps.loadCharacterWeb.mockResolvedValue(createWeb());

    await expect(service.initializeCharacter('web-1', 'Unknown')).rejects.toMatchObject({
      name: 'EngineError',
      code: 'VALIDATION_FAILED',
      message: 'Character Unknown is not assigned in character web web-1',
    } satisfies Partial<EngineError>);
  });

  it('initializeCharacter rejects duplicate developed entries for the same web character', async () => {
    deps.loadCharacterWeb.mockResolvedValue(createWeb());
    deps.listDevelopedCharactersByWebId.mockResolvedValue([
      createCharacter({ characterName: 'Mara Voss' }),
    ]);

    await expect(service.initializeCharacter('web-1', 'Mara Voss')).rejects.toMatchObject({
      name: 'EngineError',
      code: 'RESOURCE_CONFLICT',
      message: 'Developed character already exists for Mara Voss in character web web-1',
    } satisfies Partial<EngineError>);
  });

  it('generateCharacterStage derives inputs from concept+kernel, runs the stage runner, and persists', async () => {
    const character = createCharacter({ id: 'char-1' });
    const updatedCharacter = createCharacter({
      id: 'char-1',
      characterKernel: createCompletedCharacter().characterKernel,
      completedStages: [1],
    });
    deps.loadDevelopedCharacter.mockResolvedValue(character);
    deps.loadCharacterWeb.mockResolvedValue(createWeb());
    deps.runCharacterStage.mockResolvedValue({
      updatedCharacter,
      rawResponse: 'raw-stage',
    });

    const result = await service.generateCharacterStage('char-1', 1, 'valid-api-key-12345');

    expect(deps.loadConcept).toHaveBeenCalledWith('concept-1');
    expect(deps.loadKernel).toHaveBeenCalledWith('kernel-1');
    expect(deps.runCharacterStage).toHaveBeenCalledWith({
      character,
      stage: 1,
      apiKey: 'valid-api-key-12345',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      inputs: expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        kernelSummary: expect.stringContaining('A revenge story about inherited guilt.'),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        conceptSummary: expect.stringContaining('A fugitive captain leads an impossible expedition.'),
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      webContext: expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        assignment: expect.objectContaining({ characterName: 'Iria Vale' }),
        protagonistName: 'Iria Vale',
      }),
      otherDevelopedCharacters: undefined,
      onGenerationStage: undefined,
    });
    expect(deps.saveDevelopedCharacter).toHaveBeenCalledWith(updatedCharacter);
    expect(result).toBe(updatedCharacter);
  });

  it('generateCharacterStage loads sibling characters only for stage 4 and excludes the target', async () => {
    const target = createCharacter({
      id: 'char-1',
      characterKernel: createCompletedCharacter().characterKernel,
      tridimensionalProfile: createCompletedCharacter().tridimensionalProfile,
      agencyModel: createCompletedCharacter().agencyModel,
      completedStages: [1, 2, 3],
    });
    const sibling = createCharacter({
      id: 'char-2',
      characterName: 'Mara Voss',
    });
    deps.loadDevelopedCharacter.mockResolvedValue(target);
    deps.loadCharacterWeb.mockResolvedValue(createWeb());
    deps.listDevelopedCharactersByWebId.mockResolvedValue([target, sibling]);

    await service.generateCharacterStage('char-1', 4, 'valid-api-key-12345');

    expect(deps.runCharacterStage).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 4 as CharacterDevStage,
        otherDevelopedCharacters: [sibling],
      }),
    );
  });

  it('regenerateCharacterStage clears downstream stages before rerunning', async () => {
    const character = createCompletedCharacter({
      id: 'char-1',
      updatedAt: '2026-03-09T10:00:00.000Z',
    });
    deps.loadDevelopedCharacter.mockResolvedValue(character);
    deps.loadCharacterWeb.mockResolvedValue(createWeb());

    await service.regenerateCharacterStage('char-1', 3, 'valid-api-key-12345');

    const runnerInput = deps.runCharacterStage.mock.calls[0]?.[0];
    expect(runnerInput).toBeDefined();
    expect(runnerInput?.stage).toBe(3);
    expect(runnerInput?.otherDevelopedCharacters).toBeUndefined();
    expect(runnerInput?.character).toEqual(
      expect.objectContaining({
        id: 'char-1',
        updatedAt: '2026-03-09T12:00:00.000Z',
        agencyModel: null,
        deepRelationships: null,
        textualPresentation: null,
        completedStages: [1, 2],
      }),
    );
  });

  it('deleteWeb removes the web and all associated developed characters', async () => {
    deps.loadCharacterWeb.mockResolvedValue(createWeb());
    deps.listDevelopedCharactersByWebId.mockResolvedValue([
      createCharacter({ id: 'char-1' }),
      createCharacter({ id: 'char-2', characterName: 'Mara Voss' }),
    ]);

    await service.deleteWeb('web-1');

    expect(deps.deleteDevelopedCharacter).toHaveBeenCalledTimes(2);
    expect(deps.deleteDevelopedCharacter).toHaveBeenNthCalledWith(1, 'char-1');
    expect(deps.deleteDevelopedCharacter).toHaveBeenNthCalledWith(2, 'char-2');
    expect(deps.deleteCharacterWeb).toHaveBeenCalledWith('web-1');
  });

  it('toDecomposedCharacters mixes full and lightweight conversion while forcing protagonist first', async () => {
    const protagonistAssignment = createAssignment();
    const rivalAssignment = createAssignment({
      characterName: 'Mara Voss',
      isProtagonist: false,
      storyFunction: StoryFunction.RIVAL,
      narrativeRole: 'A salvage captain who confuses control with safety.',
      conflictRelationship: 'Needs the protagonist to win but hates owing her.',
    });
    deps.loadCharacterWeb.mockResolvedValue(
      createWeb({
        protagonistName: 'Iria Vale',
        assignments: [rivalAssignment, protagonistAssignment],
      }),
    );
    const completed = createCompletedCharacter({ characterName: 'Iria Vale' });
    const incomplete = createCharacter({ characterName: 'Mara Voss', completedStages: [1] });
    deps.listDevelopedCharactersByWebId.mockResolvedValue([incomplete, completed]);

    const result = await service.toDecomposedCharacters('web-1');

    expect(deps.toDecomposedCharacter).toHaveBeenCalledWith(completed, expect.objectContaining({
      assignment: protagonistAssignment,
      protagonistName: 'Iria Vale',
    }));
    expect(deps.toDecomposedCharacterFromWeb).toHaveBeenCalledWith(
      rivalAssignment,
      createArchetypes(),
      'Iria Vale',
    );
    expect(result.map((character) => character.name)).toEqual(['Iria Vale', 'Mara Voss']);
  });

  it('loadWeb returns null for missing webs', async () => {
    deps.loadCharacterWeb.mockResolvedValue(null);

    await expect(service.loadWeb('web-1')).resolves.toBeNull();
  });

  it('loadCharacter returns null for missing characters', async () => {
    deps.loadDevelopedCharacter.mockRejectedValue(
      new Error('Developed character not found: char-missing'),
    );

    await expect(service.loadCharacter('char-missing')).resolves.toBeNull();
  });

  it('generateCharacterStage normalizes missing developed characters into RESOURCE_NOT_FOUND', async () => {
    deps.loadDevelopedCharacter.mockRejectedValue(
      new Error('Developed character not found: char-missing'),
    );

    await expect(
      service.generateCharacterStage('char-missing', 1, 'valid-api-key-12345'),
    ).rejects.toMatchObject({
      name: 'EngineError',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Developed character not found: char-missing',
    } satisfies Partial<EngineError>);
  });

  it('deleteWeb rejects missing webs with RESOURCE_NOT_FOUND before deleting children', async () => {
    deps.loadCharacterWeb.mockResolvedValue(null);

    await expect(service.deleteWeb('web-missing')).rejects.toMatchObject({
      name: 'EngineError',
      code: 'RESOURCE_NOT_FOUND',
      message: 'Character web not found: web-missing',
    } satisfies Partial<EngineError>);
    expect(deps.deleteCharacterWeb).not.toHaveBeenCalled();
    expect(deps.deleteDevelopedCharacter).not.toHaveBeenCalled();
  });
});

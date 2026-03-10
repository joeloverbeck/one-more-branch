import type {
  AgencyModel,
  CastPipelineInputs,
  CharacterKernel,
  DeepRelationshipResult,
  TextualPresentation,
  TridimensionalProfile,
} from '../../../src/models/character-pipeline-types';
import type {
  CharacterWebContext,
  SavedDevelopedCharacter,
} from '../../../src/models/saved-developed-character';
import {
  runCharacterStage,
  type CharacterStageRunnerDeps,
} from '../../../src/llm/character-stage-runner';
import { EngineError } from '../../../src/engine/types';
import {
  CharacterDepth,
  EmotionSalience,
  PipelineRelationshipType,
  RelationshipValence,
  ReplanningPolicy,
  StoryFunction,
  VoiceRegister,
} from '../../../src/models/character-enums';

function createWebContext(): CharacterWebContext {
  return {
    assignment: {
      characterName: 'Iria Vale',
      isProtagonist: true,
      storyFunction: StoryFunction.CATALYST,
      characterDepth: CharacterDepth.ROUND,
      narrativeRole: 'Disgraced navigator chasing a vanished map',
      conflictRelationship: 'Needs control but depends on unstable allies',
    },
    protagonistName: 'Iria Vale',
    relationshipArchetypes: [
      {
        fromCharacter: 'Iria Vale',
        toCharacter: 'Tomas Wren',
        relationshipType: PipelineRelationshipType.ALLY,
        valence: RelationshipValence.AMBIVALENT,
        essentialTension: 'They need each other but distrust each other',
      },
    ],
    castDynamicsSummary: 'A brittle expedition bound together by profit and old betrayal.',
  };
}

function createCharacterKernel(): CharacterKernel {
  return {
    characterName: 'Iria Vale',
    superObjective: 'Recover the map and restore her name',
    immediateObjectives: ['Reach the observatory', 'Keep Tomas close'],
    primaryOpposition: 'The admiralty hunting her crew',
    stakes: ['Lose her last chance at vindication'],
    constraints: ['Cannot reveal her source'],
    pressurePoint: 'Any hint that she betrayed her brother',
  };
}

function createTridimensionalProfile(): TridimensionalProfile {
  return {
    characterName: 'Iria Vale',
    physiology: 'Sea-worn and sleepless, with a limp that flares in cold weather.',
    sociology: 'Raised in naval privilege, now surviving among smugglers.',
    psychology: 'Hypervigilant, proud, and unable to forgive dependence.',
    derivationChain: 'Exile and injury hardened her into brittle self-reliance.',
    coreTraits: ['guarded', 'precise', 'vindictive', 'resourceful', 'loyal'],
  };
}

function createAgencyModel(): AgencyModel {
  return {
    characterName: 'Iria Vale',
    replanningPolicy: ReplanningPolicy.ON_NEW_INFORMATION,
    emotionSalience: EmotionSalience.HIGH,
    coreBeliefs: ['Competence is the only safe currency'],
    desires: ['Reclaim command', 'Protect her brother'],
    currentIntentions: ['Decode the map', 'Manipulate the admiralty'],
    falseBeliefs: ['Tomas will betray her first'],
    decisionPattern: 'She improvises fast but doubles down when pride is threatened.',
  };
}

function createDeepRelationships(): DeepRelationshipResult {
  return {
    relationships: [
      {
        fromCharacter: 'Iria Vale',
        toCharacter: 'Tomas Wren',
        relationshipType: PipelineRelationshipType.ALLY,
        valence: RelationshipValence.AMBIVALENT,
        numericValence: 1,
        history: 'They survived a mutiny together and blame each other for it.',
        currentTension: 'He wants honesty; she keeps trading in half-truths.',
        leverage: 'He knows which logbook entry could ruin her forever.',
      },
    ],
    secrets: ['She burned the original chart fragment.'],
    personalDilemmas: ['Expose the conspiracy and sacrifice Tomas, or save him and stay damned.'],
  };
}

function createTextualPresentation(): TextualPresentation {
  return {
    characterName: 'Iria Vale',
    voiceRegister: VoiceRegister.FORMAL,
    speechFingerprint: {
      catchphrases: ['Stay on bearing.'],
      vocabularyProfile: 'Controlled naval diction with clipped commands.',
      sentencePatterns: 'Short commands followed by surgical explanation.',
      verbalTics: ['Listen carefully'],
      dialogueSamples: ['Stay on bearing, and maybe we survive this yet.'],
      metaphorFrames: ['Navigation, storms, and debt'],
      antiExamples: ['Whatever, let us just vibe with it.'],
      discourseMarkers: ['No.', 'Fine.', 'Then listen.'],
      registerShifts: 'Under pressure she becomes colder and more ceremonial.',
    },
    appearance: 'Always immaculate above the collar, no matter how wrecked the rest of her looks.',
    knowledgeBoundaries: 'Knows the admiralty codebook, suspects Tomas is compromised, misreads who ordered the purge.',
    conflictPriority: 'Protecting the mission beats affection until guilt breaks her discipline.',
  };
}

function createCharacter(
  overrides: Partial<SavedDevelopedCharacter> = {},
): SavedDevelopedCharacter {
  return {
    id: 'char-iria',
    characterName: 'Iria Vale',
    createdAt: '2026-03-08T10:00:00.000Z',
    updatedAt: '2026-03-08T10:00:00.000Z',
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

function createOtherCharacter(): SavedDevelopedCharacter {
  return createCharacter({
    id: 'char-tomas',
    characterName: 'Tomas Wren',
    characterKernel: {
      ...createCharacterKernel(),
      characterName: 'Tomas Wren',
      superObjective: 'Escape the empire without losing Iria',
    },
    tridimensionalProfile: {
      ...createTridimensionalProfile(),
      characterName: 'Tomas Wren',
      coreTraits: ['gentle', 'secretive', 'brilliant'],
    },
    agencyModel: {
      ...createAgencyModel(),
      characterName: 'Tomas Wren',
      coreBeliefs: ['Mercy is smarter than force'],
    },
    completedStages: [1, 2, 3],
  });
}

function createDeps(): jest.Mocked<CharacterStageRunnerDeps> {
  return {
    generateCharKernel: jest.fn(),
    generateCharTridimensional: jest.fn(),
    generateCharAgency: jest.fn(),
    generateCharRelationships: jest.fn(),
    generateCharPresentation: jest.fn(),
  };
}

describe('runCharacterStage', () => {
  const inputs: CastPipelineInputs = {
    kernelSummary: 'A revenge story about inherited guilt.',
    conceptSummary: 'A fugitive captain leads an impossible expedition.',
    userNotes: 'Keep everyone dangerous and emotionally articulate.',
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-09T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws EngineError when prerequisites are not met', async () => {
    await expect(
      runCharacterStage(
        {
          character: createCharacter(),
          stage: 2,
          apiKey: 'test-api-key-123',
          inputs,
          webContext: createWebContext(),
        },
        createDeps(),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<EngineError>>({
        name: 'EngineError',
        code: 'VALIDATION_FAILED',
      }),
    );
  });

  it('throws when completedStages claim prior work exists but the payload is missing', async () => {
    await expect(
      runCharacterStage(
        {
          character: createCharacter({ completedStages: [1] }),
          stage: 2,
          apiKey: 'test-api-key-123',
          inputs,
          webContext: createWebContext(),
        },
        createDeps(),
      ),
    ).rejects.toThrow('Iria Vale is missing required character kernel data');
  });

  it('runs stage 1 with the base prompt context and emits character progress events', async () => {
    const deps = createDeps();
    const characterKernel = createCharacterKernel();
    deps.generateCharKernel.mockResolvedValue({
      characterKernel,
      rawResponse: 'stage-1-raw',
    });

    const events: Array<{ stage: string; status: string; attempt: number }> = [];
    const result = await runCharacterStage(
      {
        character: createCharacter(),
        stage: 1,
        apiKey: 'test-api-key-123',
        inputs,
        webContext: createWebContext(),
        onGenerationStage: (event) => events.push(event),
      },
      deps,
    );

    expect(deps.generateCharKernel).toHaveBeenCalledWith(
      {
        webContext: createWebContext(),
        ...inputs,
      },
      'test-api-key-123',
    );
    expect(events).toEqual([
      { stage: 'GENERATING_CHAR_KERNEL', status: 'started', attempt: 1 },
      { stage: 'GENERATING_CHAR_KERNEL', status: 'completed', attempt: 1 },
    ]);
    expect(result.rawResponse).toBe('stage-1-raw');
    expect(result.updatedCharacter.characterKernel).toEqual(characterKernel);
    expect(result.updatedCharacter.completedStages).toEqual([1]);
    expect(result.updatedCharacter.updatedAt).toBe('2026-03-09T12:00:00.000Z');
  });

  it('runs stage 2 with stage 1 output in context', async () => {
    const deps = createDeps();
    const characterKernel = createCharacterKernel();
    const tridimensionalProfile = createTridimensionalProfile();
    deps.generateCharTridimensional.mockResolvedValue({
      tridimensionalProfile,
      rawResponse: 'stage-2-raw',
    });

    const result = await runCharacterStage(
      {
        character: createCharacter({
          characterKernel,
          completedStages: [1],
        }),
        stage: 2,
        apiKey: 'test-api-key-123',
        inputs,
        webContext: createWebContext(),
      },
      deps,
    );

    expect(deps.generateCharTridimensional).toHaveBeenCalledWith(
      {
        webContext: createWebContext(),
        characterKernel,
        ...inputs,
      },
      'test-api-key-123',
    );
    expect(result.updatedCharacter.tridimensionalProfile).toEqual(tridimensionalProfile);
    expect(result.updatedCharacter.completedStages).toEqual([1, 2]);
  });

  it('runs stage 3 with stages 1 and 2 in context', async () => {
    const deps = createDeps();
    const characterKernel = createCharacterKernel();
    const tridimensionalProfile = createTridimensionalProfile();
    const agencyModel = createAgencyModel();
    deps.generateCharAgency.mockResolvedValue({
      agencyModel,
      rawResponse: 'stage-3-raw',
    });

    const result = await runCharacterStage(
      {
        character: createCharacter({
          characterKernel,
          tridimensionalProfile,
          completedStages: [1, 2],
        }),
        stage: 3,
        apiKey: 'test-api-key-123',
        inputs,
        webContext: createWebContext(),
      },
      deps,
    );

    expect(deps.generateCharAgency).toHaveBeenCalledWith(
      {
        webContext: createWebContext(),
        characterKernel,
        tridimensionalProfile,
        ...inputs,
      },
      'test-api-key-123',
    );
    expect(result.updatedCharacter.agencyModel).toEqual(agencyModel);
    expect(result.updatedCharacter.completedStages).toEqual([1, 2, 3]);
  });

  it('runs stage 4 with sibling character context provided by the caller', async () => {
    const deps = createDeps();
    const characterKernel = createCharacterKernel();
    const tridimensionalProfile = createTridimensionalProfile();
    const agencyModel = createAgencyModel();
    const deepRelationships = createDeepRelationships();
    const otherDevelopedCharacters = [createOtherCharacter()];
    deps.generateCharRelationships.mockResolvedValue({
      deepRelationships,
      rawResponse: 'stage-4-raw',
    });

    const result = await runCharacterStage(
      {
        character: createCharacter({
          characterKernel,
          tridimensionalProfile,
          agencyModel,
          completedStages: [1, 2, 3],
        }),
        stage: 4,
        apiKey: 'test-api-key-123',
        inputs,
        webContext: createWebContext(),
        otherDevelopedCharacters,
      },
      deps,
    );

    expect(deps.generateCharRelationships).toHaveBeenCalledWith(
      {
        webContext: createWebContext(),
        characterKernel,
        tridimensionalProfile,
        agencyModel,
        otherDevelopedCharacters,
        ...inputs,
      },
      'test-api-key-123',
    );
    expect(result.updatedCharacter.deepRelationships).toEqual(deepRelationships);
    expect(result.updatedCharacter.completedStages).toEqual([1, 2, 3, 4]);
  });

  it('runs stage 5 with all prior stage outputs and deduplicates completed stages', async () => {
    const deps = createDeps();
    const characterKernel = createCharacterKernel();
    const tridimensionalProfile = createTridimensionalProfile();
    const agencyModel = createAgencyModel();
    const deepRelationships = createDeepRelationships();
    const textualPresentation = createTextualPresentation();
    deps.generateCharPresentation.mockResolvedValue({
      textualPresentation,
      rawResponse: 'stage-5-raw',
    });

    const result = await runCharacterStage(
      {
        character: createCharacter({
          characterKernel,
          tridimensionalProfile,
          agencyModel,
          deepRelationships,
          completedStages: [1, 2, 3, 4, 5],
        }),
        stage: 5,
        apiKey: 'test-api-key-123',
        inputs,
        webContext: createWebContext(),
      },
      deps,
    );

    expect(deps.generateCharPresentation).toHaveBeenCalledWith(
      {
        webContext: createWebContext(),
        characterKernel,
        tridimensionalProfile,
        agencyModel,
        deepRelationships,
        ...inputs,
      },
      'test-api-key-123',
    );
    expect(result.updatedCharacter.textualPresentation).toEqual(textualPresentation);
    expect(result.updatedCharacter.completedStages).toEqual([1, 2, 3, 4, 5]);
  });
});

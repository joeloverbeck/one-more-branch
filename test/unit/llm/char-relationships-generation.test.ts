const mockLogPrompt = jest.fn();
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getEntries: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
};

jest.mock('../../../src/logging/index.js', () => ({
  get logger(): typeof mockLogger {
    return mockLogger;
  },
  get logPrompt(): typeof mockLogPrompt {
    return mockLogPrompt;
  },
  logResponse: jest.fn(),
}));

jest.mock('../../../src/llm/retry.js', () => ({
  withRetry: <T>(fn: () => Promise<T>): Promise<T> => fn(),
}));

import {
  buildCharRelationshipsPrompt,
  type CharRelationshipsPromptContext,
} from '../../../src/llm/prompts/char-relationships-prompt';
import { CHAR_RELATIONSHIPS_GENERATION_SCHEMA } from '../../../src/llm/schemas/char-relationships-schema';
import { generateCharRelationships } from '../../../src/llm/char-relationships-generation';
import type {
  AgencyModel,
  CharacterKernel,
  TridimensionalProfile,
} from '../../../src/models/character-pipeline-types';
import type {
  CharacterWebContext,
  SavedDevelopedCharacter,
} from '../../../src/models/saved-developed-character';
import {
  CharacterDepth,
  EmotionSalience,
  PipelineRelationshipType,
  RelationshipValence,
  ReplanningPolicy,
  StoryFunction,
} from '../../../src/models/character-enums';

function createWebContext(overrides?: Partial<CharacterWebContext>): CharacterWebContext {
  return {
    assignment: {
      characterName: 'Kael',
      isProtagonist: false,
      storyFunction: StoryFunction.ANTAGONIST,
      characterDepth: CharacterDepth.ROUND,
      narrativeRole: 'The rival who challenges the protagonist at every turn.',
      conflictRelationship: "Directly opposes the protagonist's goals.",
    },
    protagonistName: 'Mira',
    relationshipArchetypes: [
      {
        fromCharacter: 'Kael',
        toCharacter: 'Mira',
        relationshipType: PipelineRelationshipType.RIVAL,
        valence: RelationshipValence.NEGATIVE,
        essentialTension: 'Both want the same thing but only one can have it.',
      },
    ],
    castDynamicsSummary: 'A volatile cast with shifting alliances and deep mistrust.',
    ...overrides,
  };
}

function createCharacterKernel(overrides?: Partial<CharacterKernel>): CharacterKernel {
  return {
    characterName: 'Kael',
    superObjective: 'To reclaim the throne that was stolen from his bloodline.',
    immediateObjectives: [
      'Infiltrate the court as a commoner',
      'Find allies among the disaffected nobles',
    ],
    primaryOpposition: "The current king, who murdered Kael's father.",
    stakes: ["His family's honor and legacy", 'The lives of those who supported his father'],
    constraints: [
      'Must conceal his true identity',
      'Cannot harm innocents in pursuit of his goal',
    ],
    pressurePoint:
      'His sister is held hostage by the king - any overt action risks her life.',
    ...overrides,
  };
}

function createTridimensionalProfile(
  overrides?: Partial<TridimensionalProfile>
): TridimensionalProfile {
  return {
    characterName: 'Kael',
    physiology:
      'Lean and wiry, with calloused hands from the forged commoner persona and a telltale blood-oath scar.',
    sociology:
      'Raised as a prince but living as a blacksmith among people he was taught to rule.',
    psychology:
      'Hypervigilant, proud, and morally strained by the lies he believes justice requires.',
    derivationChain:
      'Hidden heir + forced disguise -> commoner life -> shame, caution, and strategic patience.',
    coreTraits: [
      'Patient fury',
      'Strategic restraint',
      'Class guilt',
      'Hypervigilance',
      'Reluctant deception',
    ],
    ...overrides,
  };
}

function createAgencyModel(overrides?: Partial<AgencyModel>): AgencyModel {
  return {
    characterName: 'Kael',
    replanningPolicy: ReplanningPolicy.ON_NEW_INFORMATION,
    emotionSalience: EmotionSalience.HIGH,
    coreBeliefs: [
      'Power belongs to those with the will to reclaim it.',
      'Mercy without leverage invites betrayal.',
    ],
    desires: ['Reclaim the throne', 'Protect his sister', 'Be seen as just, not merely victorious'],
    currentIntentions: ['Maintain his cover at court', 'Recruit nobles who hate the king'],
    falseBeliefs: [
      'He can control the fallout of every lie he tells.',
      'His sister will forgive any collateral damage if he wins.',
    ],
    decisionPattern:
      'He gathers leverage before acting, but when family is threatened his planning collapses into decisive emotional risk-taking.',
    ...overrides,
  };
}

function createOtherDevelopedCharacter(
  overrides?: Partial<SavedDevelopedCharacter>
): SavedDevelopedCharacter {
  return {
    id: 'char-mira',
    characterName: 'Mira',
    createdAt: '2026-03-08T12:00:00.000Z',
    updatedAt: '2026-03-08T12:00:00.000Z',
    sourceWebId: 'web-1',
    characterKernel: {
      characterName: 'Mira',
      superObjective: 'To prevent the kingdom from collapsing into a revenge war.',
      immediateObjectives: ['Keep Kael alive', 'Contain the noble factions'],
      primaryOpposition: 'Kael\'s appetite for escalation',
      stakes: ['Civilian lives', 'Her own claim to moral legitimacy'],
      constraints: ['Cannot expose her hidden lineage yet'],
      pressurePoint: 'She still loves the version of Kael who no longer exists.',
    },
    tridimensionalProfile: {
      characterName: 'Mira',
      physiology: 'Graceful, injured, and visibly sleep-deprived.',
      sociology: 'Raised in exile among diplomats and smugglers.',
      psychology: 'Empathic, controlling, and desperate to avert mass bloodshed.',
      derivationChain: 'Exile + duty -> mediation instincts and secret ruthlessness.',
      coreTraits: ['Diplomatic', 'Guarded', 'Stubborn compassion'],
    },
    agencyModel: {
      characterName: 'Mira',
      replanningPolicy: ReplanningPolicy.ON_NEW_INFORMATION,
      emotionSalience: EmotionSalience.MEDIUM,
      coreBeliefs: ['Survival without legitimacy still corrodes the realm.'],
      desires: ['Keep the realm intact'],
      currentIntentions: ['Broker a temporary alliance'],
      falseBeliefs: ['Kael can still be reasoned back into restraint'],
      decisionPattern: 'She negotiates until the last safe second, then acts surgically.',
    },
    deepRelationships: null,
    textualPresentation: null,
    completedStages: [1, 2, 3],
    ...overrides,
  };
}

function createContext(
  overrides?: Partial<CharRelationshipsPromptContext>
): CharRelationshipsPromptContext {
  return {
    webContext: createWebContext(),
    characterKernel: createCharacterKernel(),
    tridimensionalProfile: createTridimensionalProfile(),
    agencyModel: createAgencyModel(),
    ...overrides,
  };
}

function validRelationshipsResponseRaw(
  overrides?: Partial<Record<string, unknown>>
): Record<string, unknown> {
  return {
    relationships: [
      {
        fromCharacter: 'Kael',
        toCharacter: 'Mira',
        relationshipType: 'RIVAL',
        valence: 'AMBIVALENT',
        numericValence: -2,
        history:
          'They survived the same purge from opposite hiding places and found each other years later under false names.',
        currentTension:
          'Kael wants decisive bloodshed while Mira keeps diverting him toward slower coalition-building.',
        leverage:
          'Mira knows where Kael\'s sister is hidden; Kael knows Mira\'s secret lineage could fracture her coalition.',
      },
    ],
    secrets: [
      'Kael suspects his father ordered atrocities that might justify the rebellion against his bloodline.',
    ],
    personalDilemmas: [
      'If he tells Mira the truth about his father, he may lose the only person restraining his worst impulses.',
    ],
    ...overrides,
  };
}

function createMockResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(payload),
            },
          },
        ],
      }),
  } as unknown as Response;
}

describe('buildCharRelationshipsPrompt', () => {
  it('includes web context plus Stage 1-3 outputs', () => {
    const messages = buildCharRelationshipsPrompt(createContext());

    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain('CHARACTER ROLE IN CAST:');
    expect(messages[1].content).toContain('RELATIONSHIP ARCHETYPES:');
    expect(messages[1].content).toContain('CHARACTER KERNEL (from Stage 1):');
    expect(messages[1].content).toContain('TRIDIMENSIONAL PROFILE (from Stage 2):');
    expect(messages[1].content).toContain('AGENCY MODEL (from Stage 3):');
    expect(messages[1].content).toContain('Replanning Policy: ON_NEW_INFORMATION');
    expect(messages[1].content).toContain('Current Intentions: Maintain his cover at court');
  });

  it('includes other developed characters when provided', () => {
    const messages = buildCharRelationshipsPrompt(
      createContext({ otherDevelopedCharacters: [createOtherDevelopedCharacter()] })
    );

    expect(messages[1].content).toContain('OTHER DEVELOPED CHARACTERS:');
    expect(messages[1].content).toContain('- Mira');
    expect(messages[1].content).toContain('Super-objective: To prevent the kingdom from collapsing into a revenge war.');
    expect(messages[1].content).toContain('False beliefs: Kael can still be reasoned back into restraint');
  });

  it('omits counterpart section when other developed characters are missing or empty', () => {
    const withoutSection = buildCharRelationshipsPrompt(createContext());
    expect(withoutSection[1].content).not.toContain('OTHER DEVELOPED CHARACTERS:');

    const withEmptyList = buildCharRelationshipsPrompt(
      createContext({ otherDevelopedCharacters: [] })
    );
    expect(withEmptyList[1].content).not.toContain('OTHER DEVELOPED CHARACTERS:');
  });

  it('includes optional summaries and notes when provided', () => {
    const messages = buildCharRelationshipsPrompt(
      createContext({
        kernelSummary: 'A story about power and betrayal.',
        conceptSummary: 'Dark medieval fantasy.',
        userNotes: 'Make the relationships dangerously intimate.',
      })
    );

    expect(messages[1].content).toContain('STORY KERNEL:\nA story about power and betrayal.');
    expect(messages[1].content).toContain('CONCEPT:\nDark medieval fantasy.');
    expect(messages[1].content).toContain(
      'USER NOTES:\nMake the relationships dangerously intimate.'
    );
  });
});

describe('CHAR_RELATIONSHIPS_GENERATION_SCHEMA', () => {
  it('has the correct top-level structure and required fields', () => {
    expect(CHAR_RELATIONSHIPS_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(CHAR_RELATIONSHIPS_GENERATION_SCHEMA.json_schema.name).toBe(
      'char_relationships_generation'
    );
    expect(CHAR_RELATIONSHIPS_GENERATION_SCHEMA.json_schema.strict).toBe(true);

    const schema = CHAR_RELATIONSHIPS_GENERATION_SCHEMA.json_schema.schema as Record<
      string,
      unknown
    >;
    expect(schema['type']).toBe('object');
    expect(schema['required']).toEqual(['relationships', 'secrets', 'personalDilemmas']);
  });

  it('defines relationship enum fields and numeric valence range', () => {
    const schema = CHAR_RELATIONSHIPS_GENERATION_SCHEMA.json_schema.schema as Record<
      string,
      unknown
    >;
    const properties = schema['properties'] as Record<string, unknown>;
    const relationships = properties['relationships'] as Record<string, unknown>;
    const relationshipItem = relationships['items'] as Record<string, unknown>;
    const relationshipProperties = relationshipItem['properties'] as Record<string, unknown>;

    expect((relationshipProperties['relationshipType'] as Record<string, unknown>)['anyOf']).toEqual(
      [
        {
          type: 'string',
          enum: [
            'KIN',
            'ALLY',
            'RIVAL',
            'PATRON',
            'CLIENT',
            'MENTOR',
            'SUBORDINATE',
            'ROMANTIC',
            'EX_ROMANTIC',
            'INFORMANT',
          ],
        },
      ]
    );
    expect((relationshipProperties['valence'] as Record<string, unknown>)['anyOf']).toEqual([
      {
        type: 'string',
        enum: ['POSITIVE', 'NEGATIVE', 'AMBIVALENT'],
      },
    ]);
    expect((relationshipProperties['numericValence'] as Record<string, unknown>)['minimum']).toBe(
      -5
    );
    expect((relationshipProperties['numericValence'] as Record<string, unknown>)['maximum']).toBe(
      5
    );
  });
});

describe('generateCharRelationships', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls OpenRouter with the Stage 4 schema and returns a typed result', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(createMockResponse(validRelationshipsResponseRaw()));

    const result = await generateCharRelationships(createContext(), 'test-api-key');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;

    expect(body['response_format']).toEqual(CHAR_RELATIONSHIPS_GENERATION_SCHEMA);
    expect(body['messages']).toHaveLength(2);
    expect(body['model']).toBeDefined();

    expect(result.deepRelationships.relationships).toHaveLength(1);
    expect(result.deepRelationships.relationships[0]?.relationshipType).toBe(
      PipelineRelationshipType.RIVAL
    );
    expect(result.deepRelationships.relationships[0]?.valence).toBe(
      RelationshipValence.AMBIVALENT
    );
    expect(result.deepRelationships.relationships[0]?.numericValence).toBe(-2);
    expect(result.deepRelationships.personalDilemmas).toHaveLength(1);
    expect(result.rawResponse).toBeDefined();
  });

  it('rejects invalid relationshipType enum values', async () => {
    const payload = validRelationshipsResponseRaw({
      relationships: [
        {
          ...(validRelationshipsResponseRaw().relationships as Record<string, unknown>[])[0],
          relationshipType: 'ENEMY',
        },
      ],
    });
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    await expect(generateCharRelationships(createContext(), 'test-api-key')).rejects.toThrow(
      /invalid relationshipType/
    );
  });

  it('rejects invalid valence enum values', async () => {
    const payload = validRelationshipsResponseRaw({
      relationships: [
        {
          ...(validRelationshipsResponseRaw().relationships as Record<string, unknown>[])[0],
          valence: 'BITTER',
        },
      ],
    });
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    await expect(generateCharRelationships(createContext(), 'test-api-key')).rejects.toThrow(
      /invalid valence/
    );
  });

  it('rejects out-of-range numericValence values', async () => {
    const payload = validRelationshipsResponseRaw({
      relationships: [
        {
          ...(validRelationshipsResponseRaw().relationships as Record<string, unknown>[])[0],
          numericValence: 6,
        },
      ],
    });
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    await expect(generateCharRelationships(createContext(), 'test-api-key')).rejects.toThrow(
      /invalid numericValence/
    );
  });

  it('rejects missing personalDilemmas', async () => {
    const payload = validRelationshipsResponseRaw();
    delete payload.personalDilemmas;
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    await expect(generateCharRelationships(createContext(), 'test-api-key')).rejects.toThrow(
      /missing or empty personalDilemmas/
    );
  });

  it('rejects alias field usage such as dilemmas', async () => {
    const payload = validRelationshipsResponseRaw();
    delete payload.personalDilemmas;
    payload.dilemmas = ['Use the wrong field name'];
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    await expect(generateCharRelationships(createContext(), 'test-api-key')).rejects.toThrow(
      /missing or empty personalDilemmas/
    );
  });

  it('logs the prompt with the charRelationships stage key', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(createMockResponse(validRelationshipsResponseRaw()));

    await generateCharRelationships(createContext(), 'test-api-key');

    expect(mockLogPrompt).toHaveBeenCalledWith(
      mockLogger,
      'charRelationships',
      expect.any(Array)
    );
  });
});

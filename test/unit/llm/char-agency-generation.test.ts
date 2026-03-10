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
  buildCharAgencyPrompt,
  type CharAgencyPromptContext,
} from '../../../src/llm/prompts/char-agency-prompt';
import { CHAR_AGENCY_GENERATION_SCHEMA } from '../../../src/llm/schemas/char-agency-schema';
import { generateCharAgency } from '../../../src/llm/char-agency-generation';
import type { CharacterWebContext } from '../../../src/models/saved-developed-character';
import type {
  CharacterKernel,
  TridimensionalProfile,
} from '../../../src/models/character-pipeline-types';
import {
  StoryFunction,
  CharacterDepth,
  PipelineRelationshipType,
  RelationshipValence,
  ReplanningPolicy,
  EmotionSalience,
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

function validAgencyResponseRaw(
  overrides?: Partial<Record<string, unknown>>
): Record<string, unknown> {
  return {
    characterName: 'Kael',
    replanningPolicy: 'ON_NEW_INFORMATION',
    emotionSalience: 'HIGH',
    coreBeliefs: [
      'Power belongs to those with the will to reclaim it.',
      'Mercy without leverage invites betrayal.',
    ],
    desires: ['Reclaim the throne', 'Protect his sister', 'Be seen as just, not merely victorious'],
    currentIntentions: [
      'Maintain his cover at court',
      'Recruit nobles who hate the king',
    ],
    falseBeliefs: [
      'He can control the fallout of every lie he tells.',
      'His sister will forgive any collateral damage if he wins.',
    ],
    decisionPattern:
      'He gathers leverage before acting, but when family is threatened his planning collapses into decisive emotional risk-taking.',
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

describe('buildCharAgencyPrompt', () => {
  it('includes web context, Stage 1 kernel, and Stage 2 tridimensional profile', () => {
    const context: CharAgencyPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      tridimensionalProfile: createTridimensionalProfile(),
      worldbuilding: '',
    };

    const messages = buildCharAgencyPrompt(context);

    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain('CHARACTER ROLE IN CAST:');
    expect(messages[1].content).toContain('A volatile cast with shifting alliances and deep mistrust.');
    expect(messages[1].content).toContain('CHARACTER KERNEL (from Stage 1):');
    expect(messages[1].content).toContain('reclaim the throne');
    expect(messages[1].content).toContain('TRIDIMENSIONAL PROFILE (from Stage 2):');
    expect(messages[1].content).toContain('Raised as a prince');
    expect(messages[1].content).toContain('Patient fury');
  });

  it('includes relationship archetypes and field instructions for currentIntentions', () => {
    const messages = buildCharAgencyPrompt({
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      tridimensionalProfile: createTridimensionalProfile(),
      worldbuilding: '',
    });

    expect(messages[1].content).toContain('RELATIONSHIP ARCHETYPES:');
    expect(messages[1].content).toContain('Kael -> Mira');
    expect(messages[1].content).toContain('currentIntentions');
    expect(messages[1].content).not.toContain('intentions:');
  });

  it('includes optional summaries and notes when provided', () => {
    const messages = buildCharAgencyPrompt({
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      tridimensionalProfile: createTridimensionalProfile(),
      kernelSummary: 'A story about power and betrayal.',
      conceptSummary: 'Dark medieval fantasy.',
      userNotes: 'Make him dangerous but sympathetic.',
      worldbuilding: '',
    });

    expect(messages[1].content).toContain('STORY KERNEL:\nA story about power and betrayal.');
    expect(messages[1].content).toContain('CONCEPT:\nDark medieval fantasy.');
    expect(messages[1].content).toContain('USER NOTES:\nMake him dangerous but sympathetic.');
  });
});

describe('CHAR_AGENCY_GENERATION_SCHEMA', () => {
  it('has the correct top-level structure and required fields', () => {
    expect(CHAR_AGENCY_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(CHAR_AGENCY_GENERATION_SCHEMA.json_schema.name).toBe('char_agency_generation');
    expect(CHAR_AGENCY_GENERATION_SCHEMA.json_schema.strict).toBe(true);

    const schema = CHAR_AGENCY_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    expect(schema['type']).toBe('object');
    expect(schema['required']).toEqual([
      'characterName',
      'replanningPolicy',
      'emotionSalience',
      'coreBeliefs',
      'desires',
      'currentIntentions',
      'falseBeliefs',
      'decisionPattern',
    ]);
  });

  it('uses anyOf for enum properties and string-array items for list fields', () => {
    const schema = CHAR_AGENCY_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    const properties = schema['properties'] as Record<string, unknown>;

    const replanningPolicy = properties['replanningPolicy'] as Record<string, unknown>;
    expect(replanningPolicy['anyOf']).toEqual([
      {
        type: 'string',
        enum: ['NEVER', 'ON_FAILURE', 'ON_NEW_INFORMATION', 'PERIODIC'],
      },
    ]);

    const emotionSalience = properties['emotionSalience'] as Record<string, unknown>;
    expect(emotionSalience['anyOf']).toEqual([
      {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH'],
      },
    ]);

    for (const field of ['coreBeliefs', 'desires', 'currentIntentions', 'falseBeliefs']) {
      const property = properties[field] as Record<string, unknown>;
      expect(property['type']).toBe('array');
      expect((property['items'] as Record<string, unknown>)['type']).toBe('string');
    }
  });
});

describe('generateCharAgency', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls OpenRouter with the Stage 3 schema and returns a typed result', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(validAgencyResponseRaw()));

    const result = await generateCharAgency(
      {
        webContext: createWebContext(),
        characterKernel: createCharacterKernel(),
        tridimensionalProfile: createTridimensionalProfile(),
        worldbuilding: '',
      },
      'test-api-key'
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;

    expect(body['response_format']).toEqual(CHAR_AGENCY_GENERATION_SCHEMA);
    expect(body['messages']).toHaveLength(2);
    expect(body['model']).toBeDefined();

    expect(result.agencyModel.characterName).toBe('Kael');
    expect(result.agencyModel.replanningPolicy).toBe(ReplanningPolicy.ON_NEW_INFORMATION);
    expect(result.agencyModel.emotionSalience).toBe(EmotionSalience.HIGH);
    expect(result.agencyModel.currentIntentions).toEqual([
      'Maintain his cover at court',
      'Recruit nobles who hate the king',
    ]);
    expect(result.rawResponse).toBeDefined();
  });

  it('rejects invalid replanningPolicy enum values', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(createMockResponse(validAgencyResponseRaw({ replanningPolicy: 'SOMETIMES' })));

    await expect(
      generateCharAgency(
        {
          webContext: createWebContext(),
          characterKernel: createCharacterKernel(),
          tridimensionalProfile: createTridimensionalProfile(),
          worldbuilding: '',
        },
        'test-api-key'
      )
    ).rejects.toThrow(/invalid replanningPolicy/);
  });

  it('rejects invalid emotionSalience enum values', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(createMockResponse(validAgencyResponseRaw({ emotionSalience: 'EXTREME' })));

    await expect(
      generateCharAgency(
        {
          webContext: createWebContext(),
          characterKernel: createCharacterKernel(),
          tridimensionalProfile: createTridimensionalProfile(),
          worldbuilding: '',
        },
        'test-api-key'
      )
    ).rejects.toThrow(/invalid emotionSalience/);
  });

  it('rejects responses that use intentions instead of currentIntentions', async () => {
    const withoutCurrentIntentions = { ...validAgencyResponseRaw() };
    delete withoutCurrentIntentions.currentIntentions;
    global.fetch = jest.fn().mockResolvedValue(
      createMockResponse({
        ...withoutCurrentIntentions,
        intentions: ['Use the wrong field name'],
      })
    );

    await expect(
      generateCharAgency(
        {
          webContext: createWebContext(),
          characterKernel: createCharacterKernel(),
          tridimensionalProfile: createTridimensionalProfile(),
          worldbuilding: '',
        },
        'test-api-key'
      )
    ).rejects.toThrow(/missing or empty currentIntentions/);
  });

  it('rejects array fields with non-string entries', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      createMockResponse(validAgencyResponseRaw({ falseBeliefs: ['Valid belief', 42] }))
    );

    await expect(
      generateCharAgency(
        {
          webContext: createWebContext(),
          characterKernel: createCharacterKernel(),
          tridimensionalProfile: createTridimensionalProfile(),
          worldbuilding: '',
        },
        'test-api-key'
      )
    ).rejects.toThrow(/falseBeliefs must contain only strings/);
  });

  it('rejects blank decisionPattern values', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(createMockResponse(validAgencyResponseRaw({ decisionPattern: '   ' })));

    await expect(
      generateCharAgency(
        {
          webContext: createWebContext(),
          characterKernel: createCharacterKernel(),
          tridimensionalProfile: createTridimensionalProfile(),
          worldbuilding: '',
        },
        'test-api-key'
      )
    ).rejects.toThrow(/missing decisionPattern/);
  });

  it('logs the prompt with the charAgency stage key', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(validAgencyResponseRaw()));

    await generateCharAgency(
      {
        webContext: createWebContext(),
        characterKernel: createCharacterKernel(),
        tridimensionalProfile: createTridimensionalProfile(),
        worldbuilding: '',
      },
      'test-api-key'
    );

    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'charAgency', expect.any(Array));
  });
});

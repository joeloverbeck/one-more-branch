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
  buildCharTridimensionalPrompt,
  type CharTridimensionalPromptContext,
} from '../../../src/llm/prompts/char-tridimensional-prompt';
import { CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA } from '../../../src/llm/schemas/char-tridimensional-schema';
import { generateCharTridimensional } from '../../../src/llm/char-tridimensional-generation';
import type { CharacterWebContext } from '../../../src/models/saved-developed-character';
import type { CharacterKernel } from '../../../src/models/character-pipeline-types';
import {
  StoryFunction,
  CharacterDepth,
  PipelineRelationshipType,
  RelationshipValence,
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
      'His sister is held hostage by the king — any overt action risks her life.',
    moralLine: 'Will not harm innocents even if it costs him the throne.',
    unacceptableCost: 'Losing his sister to save himself.',
    worstFear: 'That he is becoming the tyrant he seeks to overthrow.',
    sceneObjectivePatterns: [
      'Seeks information through indirect questioning',
      'Tests loyalty before revealing trust',
    ],
    ...overrides,
  };
}

function validTridimensionalResponseRaw(
  overrides?: Partial<Record<string, unknown>>
): Record<string, unknown> {
  return {
    characterName: 'Kael',
    physiology:
      'Lean and wiry, mid-twenties, with calloused hands from manual labor disguising noble bearing. A faded scar across his left palm — a blood oath mark he cannot hide.',
    sociology:
      'Raised as a prince, now posing as a common blacksmith. Educated in court politics but must suppress every learned mannerism. Lives in the lower quarter, surrounded by people he was taught to rule.',
    psychology:
      'Driven by righteous fury masked as patience. Deeply conflicted between noble obligation and growing genuine affection for common people. Hypervigilant, reads rooms for threats. Shame about his deception wars with conviction it serves justice.',
    derivationChain:
      'Super-objective (reclaim throne) + constraint (conceal identity) → sociology (adopted commoner persona as blacksmith) → physiology (calloused hands, suppressed noble bearing) → psychology (shame about deception vs. conviction of justice, growing empathy for commoners challenges original worldview).',
    coreTraits: [
      'Patient fury',
      'Strategic restraint',
      'Class guilt',
      'Hypervigilance',
      'Reluctant deception',
      'Protective instinct',
    ],
    formativeWound: 'Witnessed her village destroyed as a child',
    protectiveMask: 'Projects cold competence to hide vulnerability',
    misbelief: 'Believes strength means never needing anyone',
    credibleSurprises: ['Would sacrifice tactical advantage to protect a child'],
    implausibleMoves: ['Would never abandon a companion in danger'],
    stressTells: ['Clenches jaw', 'Goes unnaturally still'],
    attachmentStyle: 'Avoidant — keeps others at arm length until trust is proven through action',
    traitToSceneAffordances: ['Her stubbornness creates escalation when others push back'],
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

describe('buildCharTridimensionalPrompt', () => {
  it('produces system and user messages with character name and role', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('Kael');
    expect(messages[1].content).toContain('ANTAGONIST');
    expect(messages[1].content).toContain('ROUND');
  });

  it('includes character kernel from Stage 1', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages[1].content).toContain('CHARACTER KERNEL (from Stage 1):');
    expect(messages[1].content).toContain('reclaim the throne');
    expect(messages[1].content).toContain('Infiltrate the court');
    expect(messages[1].content).toContain('current king');
    expect(messages[1].content).toContain('honor and legacy');
    expect(messages[1].content).toContain('conceal his true identity');
    expect(messages[1].content).toContain('sister is held hostage');
  });

  it('includes cast dynamics summary', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages[1].content).toContain(
      'A volatile cast with shifting alliances and deep mistrust.'
    );
  });

  it('includes relationship archetypes when present', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages[1].content).toContain('RELATIONSHIP ARCHETYPES:');
    expect(messages[1].content).toContain('Kael → Mira');
    expect(messages[1].content).toContain('RIVAL');
  });

  it('omits relationship archetypes section when empty', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext({ relationshipArchetypes: [] }),
      characterKernel: createCharacterKernel(),
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages[1].content).not.toContain('RELATIONSHIP ARCHETYPES:');
  });

  it('includes kernel summary when provided', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      kernelSummary: 'A story about power and betrayal.',
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages[1].content).toContain('STORY KERNEL:\nA story about power and betrayal.');
  });

  it('includes concept summary when provided', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      conceptSummary: 'Dark medieval fantasy.',
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages[1].content).toContain('CONCEPT:\nDark medieval fantasy.');
  });

  it('includes user notes when provided', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      userNotes: 'Make him sympathetic.',
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages[1].content).toContain('USER NOTES:\nMake him sympathetic.');
  });

  it('omits optional sections when not provided', () => {
    const context: CharTridimensionalPromptContext = {
      webContext: createWebContext(),
      characterKernel: createCharacterKernel(),
      worldbuilding: '',
    };
    const messages = buildCharTridimensionalPrompt(context);

    expect(messages[1].content).not.toContain('STORY KERNEL:');
    expect(messages[1].content).not.toContain('CONCEPT:');
    expect(messages[1].content).not.toContain('USER NOTES:');
  });
});

describe('CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA', () => {
  it('has correct top-level structure', () => {
    expect(CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA.json_schema.name).toBe(
      'char_tridimensional_generation'
    );
    expect(CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA.json_schema.strict).toBe(true);

    const schema = CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA.json_schema.schema as Record<
      string,
      unknown
    >;
    expect(schema['type']).toBe('object');
    expect(schema['required']).toEqual([
      'characterName',
      'physiology',
      'sociology',
      'psychology',
      'derivationChain',
      'coreTraits',
      'formativeWound',
      'protectiveMask',
      'misbelief',
      'credibleSurprises',
      'implausibleMoves',
      'stressTells',
      'attachmentStyle',
      'traitToSceneAffordances',
    ]);
  });

  it('defines all TridimensionalProfile fields as properties', () => {
    const schema = CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA.json_schema.schema as Record<
      string,
      unknown
    >;
    const properties = schema['properties'] as Record<string, unknown>;

    expect(properties['characterName']).toBeDefined();
    expect(properties['physiology']).toBeDefined();
    expect(properties['sociology']).toBeDefined();
    expect(properties['psychology']).toBeDefined();
    expect(properties['derivationChain']).toBeDefined();
    expect(properties['coreTraits']).toBeDefined();
    expect(properties['formativeWound']).toBeDefined();
    expect(properties['protectiveMask']).toBeDefined();
    expect(properties['misbelief']).toBeDefined();
    expect(properties['credibleSurprises']).toBeDefined();
    expect(properties['implausibleMoves']).toBeDefined();
    expect(properties['stressTells']).toBeDefined();
    expect(properties['attachmentStyle']).toBeDefined();
    expect(properties['traitToSceneAffordances']).toBeDefined();
  });

  it('defines coreTraits as array with string items', () => {
    const schema = CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA.json_schema.schema as Record<
      string,
      unknown
    >;
    const properties = schema['properties'] as Record<string, unknown>;

    const coreTraits = properties['coreTraits'] as Record<string, unknown>;
    expect(coreTraits['type']).toBe('array');
    expect((coreTraits['items'] as Record<string, unknown>)['type']).toBe('string');
  });
});

describe('generateCharTridimensional', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls OpenRouter with correct schema and model', async () => {
    const mockResponse = createMockResponse(validTridimensionalResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await generateCharTridimensional(
      { webContext: createWebContext(), characterKernel: createCharacterKernel(), worldbuilding: '' },
      'test-api-key'
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
    expect(body['response_format']).toEqual(CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA);
    expect(body['messages']).toHaveLength(2);
  });

  it('returns typed CharTridimensionalGenerationResult', async () => {
    const mockResponse = createMockResponse(validTridimensionalResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await generateCharTridimensional(
      {
        webContext: createWebContext(),
        characterKernel: createCharacterKernel(),
        kernelSummary: 'A test kernel',
        worldbuilding: '',
      },
      'test-api-key'
    );

    expect(result.tridimensionalProfile.characterName).toBe('Kael');
    expect(result.tridimensionalProfile.physiology).toContain('Lean and wiry');
    expect(result.tridimensionalProfile.sociology).toContain('prince');
    expect(result.tridimensionalProfile.psychology).toContain('righteous fury');
    expect(result.tridimensionalProfile.derivationChain).toContain('Super-objective');
    expect(result.tridimensionalProfile.coreTraits).toHaveLength(6);
    expect(result.rawResponse).toBeDefined();
  });

  it('rejects response missing characterName', async () => {
    const badPayload = validTridimensionalResponseRaw({ characterName: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharTridimensional(
        { webContext: createWebContext(), characterKernel: createCharacterKernel(), worldbuilding: '' },
        'test-api-key'
      )
    ).rejects.toThrow(/missing characterName/);
  });

  it('rejects response missing physiology', async () => {
    const badPayload = validTridimensionalResponseRaw({ physiology: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharTridimensional(
        { webContext: createWebContext(), characterKernel: createCharacterKernel(), worldbuilding: '' },
        'test-api-key'
      )
    ).rejects.toThrow(/missing physiology/);
  });

  it('rejects response missing sociology', async () => {
    const badPayload = validTridimensionalResponseRaw({ sociology: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharTridimensional(
        { webContext: createWebContext(), characterKernel: createCharacterKernel(), worldbuilding: '' },
        'test-api-key'
      )
    ).rejects.toThrow(/missing sociology/);
  });

  it('rejects response missing psychology', async () => {
    const badPayload = validTridimensionalResponseRaw({ psychology: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharTridimensional(
        { webContext: createWebContext(), characterKernel: createCharacterKernel(), worldbuilding: '' },
        'test-api-key'
      )
    ).rejects.toThrow(/missing psychology/);
  });

  it('rejects response missing derivationChain', async () => {
    const badPayload = validTridimensionalResponseRaw({ derivationChain: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharTridimensional(
        { webContext: createWebContext(), characterKernel: createCharacterKernel(), worldbuilding: '' },
        'test-api-key'
      )
    ).rejects.toThrow(/missing derivationChain/);
  });

  it('rejects response with empty coreTraits', async () => {
    const badPayload = validTridimensionalResponseRaw({ coreTraits: [] });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharTridimensional(
        { webContext: createWebContext(), characterKernel: createCharacterKernel(), worldbuilding: '' },
        'test-api-key'
      )
    ).rejects.toThrow(/missing or empty coreTraits/);
  });

  it('logs prompt via logPrompt with charTridimensional type', async () => {
    const mockResponse = createMockResponse(validTridimensionalResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await generateCharTridimensional(
      { webContext: createWebContext(), characterKernel: createCharacterKernel(), kernelSummary: 'Test', worldbuilding: '' },
      'test-api-key'
    );

    expect(mockLogPrompt).toHaveBeenCalledWith(
      mockLogger,
      'charTridimensional',
      expect.any(Array)
    );
  });

  it('uses charTridimensional stage model', async () => {
    const mockResponse = createMockResponse(validTridimensionalResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await generateCharTridimensional(
      { webContext: createWebContext(), characterKernel: createCharacterKernel(), worldbuilding: '' },
      'test-api-key'
    );

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
    expect(body['model']).toBeDefined();
    expect(typeof body['model']).toBe('string');
  });
});

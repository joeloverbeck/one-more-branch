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
  buildCharKernelPrompt,
  type CharacterDevPromptContext,
} from '../../../src/llm/prompts/char-kernel-prompt';
import { CHAR_KERNEL_GENERATION_SCHEMA } from '../../../src/llm/schemas/char-kernel-schema';
import { generateCharKernel } from '../../../src/llm/char-kernel-generation';
import type { CharacterWebContext } from '../../../src/models/saved-developed-character';
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
      conflictRelationship: 'Directly opposes the protagonist\'s goals.',
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

function validKernelResponseRaw(
  overrides?: Partial<Record<string, unknown>>
): Record<string, unknown> {
  return {
    characterName: 'Kael',
    superObjective: 'To reclaim the throne that was stolen from his bloodline.',
    immediateObjectives: [
      'Infiltrate the court as a commoner',
      'Find allies among the disaffected nobles',
    ],
    primaryOpposition: 'The current king, who murdered Kael\'s father.',
    stakes: [
      'His family\'s honor and legacy',
      'The lives of those who supported his father',
    ],
    constraints: [
      'Must conceal his true identity',
      'Cannot harm innocents in pursuit of his goal',
    ],
    pressurePoint:
      'His sister is held hostage by the king — any overt action risks her life.',
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

describe('buildCharKernelPrompt', () => {
  it('produces system and user messages with character name and role', () => {
    const context: CharacterDevPromptContext = {
      webContext: createWebContext(),
    };
    const messages = buildCharKernelPrompt(context);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('Kael');
    expect(messages[1].content).toContain('ANTAGONIST');
    expect(messages[1].content).toContain('ROUND');
  });

  it('includes cast dynamics summary', () => {
    const context: CharacterDevPromptContext = {
      webContext: createWebContext(),
    };
    const messages = buildCharKernelPrompt(context);

    expect(messages[1].content).toContain(
      'A volatile cast with shifting alliances and deep mistrust.'
    );
  });

  it('includes relationship archetypes when present', () => {
    const context: CharacterDevPromptContext = {
      webContext: createWebContext(),
    };
    const messages = buildCharKernelPrompt(context);

    expect(messages[1].content).toContain('RELATIONSHIP ARCHETYPES:');
    expect(messages[1].content).toContain('Kael → Mira');
    expect(messages[1].content).toContain('RIVAL');
  });

  it('omits relationship archetypes section when empty', () => {
    const context: CharacterDevPromptContext = {
      webContext: createWebContext({ relationshipArchetypes: [] }),
    };
    const messages = buildCharKernelPrompt(context);

    expect(messages[1].content).not.toContain('RELATIONSHIP ARCHETYPES:');
  });

  it('includes kernel summary when provided', () => {
    const context: CharacterDevPromptContext = {
      webContext: createWebContext(),
      kernelSummary: 'A story about power and betrayal.',
    };
    const messages = buildCharKernelPrompt(context);

    expect(messages[1].content).toContain('STORY KERNEL:\nA story about power and betrayal.');
  });

  it('includes concept summary when provided', () => {
    const context: CharacterDevPromptContext = {
      webContext: createWebContext(),
      conceptSummary: 'Dark medieval fantasy.',
    };
    const messages = buildCharKernelPrompt(context);

    expect(messages[1].content).toContain('CONCEPT:\nDark medieval fantasy.');
  });

  it('includes user notes when provided', () => {
    const context: CharacterDevPromptContext = {
      webContext: createWebContext(),
      userNotes: 'Make him sympathetic.',
    };
    const messages = buildCharKernelPrompt(context);

    expect(messages[1].content).toContain('USER NOTES:\nMake him sympathetic.');
  });

  it('omits optional sections when not provided', () => {
    const context: CharacterDevPromptContext = {
      webContext: createWebContext(),
    };
    const messages = buildCharKernelPrompt(context);

    expect(messages[1].content).not.toContain('STORY KERNEL:');
    expect(messages[1].content).not.toContain('CONCEPT:');
    expect(messages[1].content).not.toContain('USER NOTES:');
  });
});

describe('CHAR_KERNEL_GENERATION_SCHEMA', () => {
  it('has correct top-level structure', () => {
    expect(CHAR_KERNEL_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(CHAR_KERNEL_GENERATION_SCHEMA.json_schema.name).toBe('char_kernel_generation');
    expect(CHAR_KERNEL_GENERATION_SCHEMA.json_schema.strict).toBe(true);

    const schema = CHAR_KERNEL_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    expect(schema['type']).toBe('object');
    expect(schema['required']).toEqual([
      'characterName',
      'superObjective',
      'immediateObjectives',
      'primaryOpposition',
      'stakes',
      'constraints',
      'pressurePoint',
    ]);
  });

  it('defines all CharacterKernel fields as properties', () => {
    const schema = CHAR_KERNEL_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    const properties = schema['properties'] as Record<string, unknown>;

    expect(properties['characterName']).toBeDefined();
    expect(properties['superObjective']).toBeDefined();
    expect(properties['immediateObjectives']).toBeDefined();
    expect(properties['primaryOpposition']).toBeDefined();
    expect(properties['stakes']).toBeDefined();
    expect(properties['constraints']).toBeDefined();
    expect(properties['pressurePoint']).toBeDefined();
  });

  it('defines array fields with string items', () => {
    const schema = CHAR_KERNEL_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    const properties = schema['properties'] as Record<string, unknown>;

    const immediateObjectives = properties['immediateObjectives'] as Record<string, unknown>;
    expect(immediateObjectives['type']).toBe('array');
    expect((immediateObjectives['items'] as Record<string, unknown>)['type']).toBe('string');

    const stakes = properties['stakes'] as Record<string, unknown>;
    expect(stakes['type']).toBe('array');
    expect((stakes['items'] as Record<string, unknown>)['type']).toBe('string');

    const constraints = properties['constraints'] as Record<string, unknown>;
    expect(constraints['type']).toBe('array');
    expect((constraints['items'] as Record<string, unknown>)['type']).toBe('string');
  });
});

describe('generateCharKernel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls OpenRouter with correct schema and model', async () => {
    const mockResponse = createMockResponse(validKernelResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await generateCharKernel({ webContext: createWebContext() }, 'test-api-key');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
    expect(body['response_format']).toEqual(CHAR_KERNEL_GENERATION_SCHEMA);
    expect(body['messages']).toHaveLength(2);
  });

  it('returns typed CharKernelGenerationResult', async () => {
    const mockResponse = createMockResponse(validKernelResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await generateCharKernel(
      { webContext: createWebContext(), kernelSummary: 'A test kernel' },
      'test-api-key'
    );

    expect(result.characterKernel.characterName).toBe('Kael');
    expect(result.characterKernel.superObjective).toContain('reclaim the throne');
    expect(result.characterKernel.immediateObjectives).toHaveLength(2);
    expect(result.characterKernel.primaryOpposition).toContain('current king');
    expect(result.characterKernel.stakes).toHaveLength(2);
    expect(result.characterKernel.constraints).toHaveLength(2);
    expect(result.characterKernel.pressurePoint).toContain('sister');
    expect(result.rawResponse).toBeDefined();
  });

  it('rejects response missing characterName', async () => {
    const badPayload = validKernelResponseRaw({ characterName: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharKernel({ webContext: createWebContext() }, 'test-api-key')
    ).rejects.toThrow(/missing characterName/);
  });

  it('rejects response missing superObjective', async () => {
    const badPayload = validKernelResponseRaw({ superObjective: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharKernel({ webContext: createWebContext() }, 'test-api-key')
    ).rejects.toThrow(/missing superObjective/);
  });

  it('rejects response with empty immediateObjectives', async () => {
    const badPayload = validKernelResponseRaw({ immediateObjectives: [] });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharKernel({ webContext: createWebContext() }, 'test-api-key')
    ).rejects.toThrow(/missing or empty immediateObjectives/);
  });

  it('rejects response missing primaryOpposition', async () => {
    const badPayload = validKernelResponseRaw({ primaryOpposition: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharKernel({ webContext: createWebContext() }, 'test-api-key')
    ).rejects.toThrow(/missing primaryOpposition/);
  });

  it('rejects response with empty stakes', async () => {
    const badPayload = validKernelResponseRaw({ stakes: [] });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharKernel({ webContext: createWebContext() }, 'test-api-key')
    ).rejects.toThrow(/missing or empty stakes/);
  });

  it('rejects response with empty constraints', async () => {
    const badPayload = validKernelResponseRaw({ constraints: [] });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharKernel({ webContext: createWebContext() }, 'test-api-key')
    ).rejects.toThrow(/missing or empty constraints/);
  });

  it('rejects response missing pressurePoint', async () => {
    const badPayload = validKernelResponseRaw({ pressurePoint: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(
      generateCharKernel({ webContext: createWebContext() }, 'test-api-key')
    ).rejects.toThrow(/missing pressurePoint/);
  });

  it('logs prompt via logPrompt with charKernel type', async () => {
    const mockResponse = createMockResponse(validKernelResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await generateCharKernel(
      { webContext: createWebContext(), kernelSummary: 'Test' },
      'test-api-key'
    );

    expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'charKernel', expect.any(Array));
  });

  it('uses charKernel stage model', async () => {
    const mockResponse = createMockResponse(validKernelResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await generateCharKernel({ webContext: createWebContext() }, 'test-api-key');

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
    // Model should be set (either from stage config or default)
    expect(body['model']).toBeDefined();
    expect(typeof body['model']).toBe('string');
  });
});

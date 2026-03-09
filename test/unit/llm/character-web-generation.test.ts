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

import { buildCharacterWebPrompt } from '../../../src/llm/prompts/character-web-prompt';
import type { CharacterWebPromptContext } from '../../../src/llm/prompts/character-web-prompt';
import { CHARACTER_WEB_GENERATION_SCHEMA } from '../../../src/llm/schemas/character-web-schema';
import { generateCharacterWeb } from '../../../src/llm/character-web-generation';
import { StoryFunction, CharacterDepth } from '../../../src/models/character-enums';

function validAssignmentRaw(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    characterName: 'Kael',
    isProtagonist: true,
    storyFunction: 'ALLY',
    characterDepth: 'ROUND',
    narrativeRole: 'The protagonist who drives the story.',
    conflictRelationship: 'Faces the antagonist directly.',
    ...overrides,
  };
}

function validRelationshipRaw(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    fromCharacter: 'Kael',
    toCharacter: 'Mira',
    relationshipType: 'RIVAL',
    valence: 'AMBIVALENT',
    essentialTension: 'Both need each other but cannot trust one another.',
    ...overrides,
  };
}

function validWebResponseRaw(
  overrides?: Partial<Record<string, unknown>>
): Record<string, unknown> {
  return {
    assignments: [
      validAssignmentRaw({ isProtagonist: true, storyFunction: 'ALLY' }),
      validAssignmentRaw({
        characterName: 'Mira',
        isProtagonist: false,
        storyFunction: 'ANTAGONIST',
      }),
    ],
    relationshipArchetypes: [validRelationshipRaw()],
    castDynamicsSummary: 'Kael and Mira form the central conflict axis.',
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

describe('buildCharacterWebPrompt', () => {
  it('produces system and user messages with kernel/concept context', () => {
    const context: CharacterWebPromptContext = {
      kernelSummary: 'A story about betrayal.',
      conceptSummary: 'Dark fantasy world.',
      userNotes: 'Include a trickster.',
    };
    const messages = buildCharacterWebPrompt(context);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('A story about betrayal.');
    expect(messages[1].content).toContain('Dark fantasy world.');
    expect(messages[1].content).toContain('Include a trickster.');
  });

  it('handles missing optional inputs gracefully', () => {
    const context: CharacterWebPromptContext = {};
    const messages = buildCharacterWebPrompt(context);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).not.toContain('STORY KERNEL:');
    expect(messages[1].content).not.toContain('CONCEPT:');
    expect(messages[1].content).not.toContain('USER NOTES:');
  });

  it('includes kernel section when provided', () => {
    const messages = buildCharacterWebPrompt({ kernelSummary: 'Test kernel' });
    expect(messages[1].content).toContain('STORY KERNEL:\nTest kernel');
  });

  it('includes concept section when provided', () => {
    const messages = buildCharacterWebPrompt({ conceptSummary: 'Test concept' });
    expect(messages[1].content).toContain('CONCEPT:\nTest concept');
  });
});

describe('CHARACTER_WEB_GENERATION_SCHEMA', () => {
  it('has correct top-level structure', () => {
    expect(CHARACTER_WEB_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(CHARACTER_WEB_GENERATION_SCHEMA.json_schema.name).toBe('character_web_generation');
    expect(CHARACTER_WEB_GENERATION_SCHEMA.json_schema.strict).toBe(true);

    const schema = CHARACTER_WEB_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    expect(schema['type']).toBe('object');
    expect(schema['required']).toEqual([
      'assignments',
      'relationshipArchetypes',
      'castDynamicsSummary',
    ]);
  });

  it('uses anyOf pattern for enum fields (Anthropic compatibility)', () => {
    const schema = CHARACTER_WEB_GENERATION_SCHEMA.json_schema.schema as Record<string, unknown>;
    const properties = schema['properties'] as Record<string, unknown>;
    const assignments = properties['assignments'] as Record<string, unknown>;
    const items = assignments['items'] as Record<string, unknown>;
    const itemProps = items['properties'] as Record<string, unknown>;

    const storyFunction = itemProps['storyFunction'] as Record<string, unknown>;
    expect(storyFunction['anyOf']).toBeDefined();

    const characterDepth = itemProps['characterDepth'] as Record<string, unknown>;
    expect(characterDepth['anyOf']).toBeDefined();
  });
});

describe('generateCharacterWeb', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls OpenRouter with correct schema and model', async () => {
    const mockResponse = createMockResponse(validWebResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await generateCharacterWeb({}, 'test-api-key');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
    expect(body['response_format']).toEqual(CHARACTER_WEB_GENERATION_SCHEMA);
    expect(body['messages']).toHaveLength(2);
  });

  it('returns typed CharacterWebGenerationResult', async () => {
    const mockResponse = createMockResponse(validWebResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const result = await generateCharacterWeb(
      { kernelSummary: 'A test kernel' },
      'test-api-key'
    );

    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].characterName).toBe('Kael');
    expect(result.assignments[0].isProtagonist).toBe(true);
    expect(result.assignments[0].storyFunction).toBe(StoryFunction.ALLY);
    expect(result.assignments[0].characterDepth).toBe(CharacterDepth.ROUND);
    expect(result.relationshipArchetypes).toHaveLength(1);
    expect(result.relationshipArchetypes[0].essentialTension).toBe(
      'Both need each other but cannot trust one another.'
    );
    expect(result.castDynamicsSummary).toBe('Kael and Mira form the central conflict axis.');
    expect(result.rawResponse).toBeDefined();
  });

  it('validates enum values in response — rejects invalid storyFunction', async () => {
    const badPayload = validWebResponseRaw({
      assignments: [validAssignmentRaw({ storyFunction: 'INVALID_FUNCTION' })],
    });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(generateCharacterWeb({}, 'test-api-key')).rejects.toThrow(
      /invalid storyFunction/
    );
  });

  it('validates enum values in response — rejects invalid characterDepth', async () => {
    const badPayload = validWebResponseRaw({
      assignments: [validAssignmentRaw({ characterDepth: 'ULTRA_DEEP' })],
    });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(generateCharacterWeb({}, 'test-api-key')).rejects.toThrow(
      /invalid characterDepth/
    );
  });

  it('validates enum values — rejects invalid relationshipType', async () => {
    const badPayload = validWebResponseRaw({
      relationshipArchetypes: [validRelationshipRaw({ relationshipType: 'BEST_FRIEND' })],
    });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(generateCharacterWeb({}, 'test-api-key')).rejects.toThrow(
      /invalid or has invalid enum values/
    );
  });

  it('validates enum values — rejects invalid valence', async () => {
    const badPayload = validWebResponseRaw({
      relationshipArchetypes: [validRelationshipRaw({ valence: 'SUPER_POSITIVE' })],
    });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(generateCharacterWeb({}, 'test-api-key')).rejects.toThrow(
      /invalid or has invalid enum values/
    );
  });

  it('rejects response missing assignments', async () => {
    const badPayload = {
      relationshipArchetypes: [],
      castDynamicsSummary: 'Summary.',
    };
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(generateCharacterWeb({}, 'test-api-key')).rejects.toThrow(
      /missing assignments/
    );
  });

  it('rejects response with empty assignments', async () => {
    const badPayload = validWebResponseRaw({ assignments: [] });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(generateCharacterWeb({}, 'test-api-key')).rejects.toThrow(
      /at least one assignment/
    );
  });

  it('rejects response missing castDynamicsSummary', async () => {
    const badPayload = validWebResponseRaw({ castDynamicsSummary: '' });
    const mockResponse = createMockResponse(badPayload);
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(generateCharacterWeb({}, 'test-api-key')).rejects.toThrow(
      /missing castDynamicsSummary/
    );
  });

  it('logs prompt via logPrompt', async () => {
    const mockResponse = createMockResponse(validWebResponseRaw());
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await generateCharacterWeb({ kernelSummary: 'Test' }, 'test-api-key');

    expect(mockLogPrompt).toHaveBeenCalledWith(
      mockLogger,
      'characterWeb',
      expect.any(Array)
    );
  });
});

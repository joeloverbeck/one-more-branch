import {
  GenerationResultSchema,
  STORY_GENERATION_SCHEMA,
  isStructuredOutputNotSupported,
  validateGenerationResponse,
} from '../../../src/llm/schemas';
import { generateWithFallback } from '../../../src/llm/generation-strategy';

const VALID_NARRATIVE =
  'You step through the shattered gate and feel the cold wind carry ash across your face as the ruined city groans awake around you. The ancient stones whisper of forgotten wars.';

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function openRouterBodyFromContent(content: string): Response {
  return createJsonResponse(200, {
    id: 'or-schema-pipeline',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('schema pipeline integration', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('full generation flow', () => {
    it('should validate structured output with all fields', () => {
      // Test the schema structure matches expected format
      const schemaProps = STORY_GENERATION_SCHEMA.json_schema.schema as {
        required: string[];
        properties: Record<string, unknown>;
      };

      expect(schemaProps.required).toContain('narrative');
      expect(schemaProps.required).toContain('choices');
      expect(schemaProps.required).toContain('stateChangesAdded');
      expect(schemaProps.required).toContain('stateChangesRemoved');
      expect(schemaProps.required).toContain('newCanonFacts');
      expect(schemaProps.required).toContain('newCharacterCanonFacts');
      expect(schemaProps.required).toContain('inventoryAdded');
      expect(schemaProps.required).toContain('inventoryRemoved');
      expect(schemaProps.required).toContain('isEnding');

      // Validate a response through the full pipeline
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: ['Open the iron door', 'Climb the collapsed tower'],
        stateChangesAdded: ['Entered the ruined keep'],
        stateChangesRemoved: [],
        newCanonFacts: ['The keep was abandoned after the plague'],
        newCharacterCanonFacts: [],
        inventoryAdded: ['Rusty key'],
        inventoryRemoved: [],
        isEnding: false,
        storyArc: 'Survive the plague city and find the cure.',
      };

      const result = validateGenerationResponse(rawJson, JSON.stringify(rawJson));

      expect(result.narrative).toBe(VALID_NARRATIVE);
      expect(result.choices).toHaveLength(2);
      expect(result.stateChangesAdded).toEqual(['Entered the ruined keep']);
      expect(result.newCanonFacts).toEqual(['The keep was abandoned after the plague']);
      expect(result.inventoryAdded).toEqual(['Rusty key']);
      expect(result.inventoryRemoved).toEqual([]);
      expect(result.isEnding).toBe(false);
      expect(result.storyArc).toBe('Survive the plague city and find the cure.');
      expect(result.rawResponse).toBe(JSON.stringify(rawJson));
    });

    it('should transform character canon facts array to record through full flow', () => {
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: ['Speak to the elder', 'Wait in silence'],
        stateChangesAdded: ['Met Elder Varn'],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: 'Elder Varn', facts: ['She is the last of her order', 'She carries an obsidian staff'] },
          { characterName: 'Brother Kael', facts: ['He betrayed the order'] },
        ],
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: false,
      };

      const result = validateGenerationResponse(rawJson, 'raw');

      // Array format should be transformed to Record format
      expect(result.newCharacterCanonFacts).toEqual({
        'Elder Varn': ['She is the last of her order', 'She carries an obsidian staff'],
        'Brother Kael': ['He betrayed the order'],
      });
    });

    it('should merge duplicate character entries in canon facts', () => {
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: ['Follow the clue', 'Ignore it'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: 'Detective Shaw', facts: ['She wears a trench coat'] },
          { characterName: 'Detective Shaw', facts: ['She has a silver badge'] },
        ],
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: false,
      };

      const result = validateGenerationResponse(rawJson, 'raw');

      expect(result.newCharacterCanonFacts).toEqual({
        'Detective Shaw': ['She wears a trench coat', 'She has a silver badge'],
      });
    });

    it('should handle inventory fields through pipeline', async () => {
      const structured = {
        narrative: VALID_NARRATIVE,
        choices: ['Continue forward', 'Turn back'],
        stateChangesAdded: ['Found the hidden cache'],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [],
        inventoryAdded: ['Ancient map', 'Gold coins (50)'],
        inventoryRemoved: ['Lockpick'],
        isEnding: false,
      };

      fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(structured)));

      const result = await generateWithFallback(
        [{ role: 'user', content: 'Test prompt' }],
        { apiKey: 'test-key' },
      );

      expect(result.inventoryAdded).toEqual(['Ancient map', 'Gold coins (50)']);
      expect(result.inventoryRemoved).toEqual(['Lockpick']);
    });

    it('should validate ending page with zero choices', () => {
      const endingJson = {
        narrative: VALID_NARRATIVE,
        choices: [],
        stateChangesAdded: ['The journey ends here'],
        stateChangesRemoved: [],
        newCanonFacts: ['Peace was restored'],
        newCharacterCanonFacts: [],
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: true,
      };

      const result = validateGenerationResponse(endingJson, 'raw');

      expect(result.isEnding).toBe(true);
      expect(result.choices).toHaveLength(0);
    });

    it('should reject ending page with non-zero choices', () => {
      const invalidEndingJson = {
        narrative: VALID_NARRATIVE,
        choices: ['Continue anyway'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [],
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: true,
      };

      expect(() => validateGenerationResponse(invalidEndingJson, 'raw')).toThrow();
    });

    it('should reject non-ending page with zero choices', () => {
      const invalidNonEndingJson = {
        narrative: VALID_NARRATIVE,
        choices: [],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [],
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: false,
      };

      expect(() => validateGenerationResponse(invalidNonEndingJson, 'raw')).toThrow();
    });
  });

  describe('error classification', () => {
    it('should detect structured output not supported and return proper LLMError', async () => {
      fetchMock.mockResolvedValue(
        createJsonResponse(400, {
          error: { message: 'response_format is not supported by this model' },
        }),
      );

      // Attach rejection handler early to prevent unhandled rejection detection
      // 400 errors are non-retryable so no timer advancement needed
      const promise = generateWithFallback(
        [{ role: 'user', content: 'Test prompt' }],
        { apiKey: 'test-key', model: 'unsupported-model' },
      );

      await expect(promise).rejects.toMatchObject({
        code: 'STRUCTURED_OUTPUT_NOT_SUPPORTED',
        retryable: false,
      });
    });

    it('should not trigger fallback for validation errors', () => {
      // Validation error from Zod - NOT a structured output support issue
      const validationError = new Error('Narrative must be at least 50 characters');

      expect(isStructuredOutputNotSupported(validationError)).toBe(false);
    });

    it('should detect various unsupported patterns', () => {
      const unsupportedErrors = [
        'response_format is not supported',
        'json_schema is not supported',
        'structured output is not supported',
        'does not support response_format',
        'unsupported parameter: response_format',
        'model does not support this feature',
        'provider does not support this operation',
      ];

      for (const msg of unsupportedErrors) {
        expect(isStructuredOutputNotSupported(new Error(msg))).toBe(true);
      }
    });
  });

  describe('data transformation', () => {
    it('should trim whitespace through full pipeline', () => {
      const rawJson = {
        narrative: `   ${VALID_NARRATIVE}   `,
        choices: ['  Open the door  ', '  Climb the tower  '],
        stateChangesAdded: ['  Entered the keep  '],
        stateChangesRemoved: [],
        newCanonFacts: ['  The keep is haunted  '],
        newCharacterCanonFacts: [
          { characterName: '  Elder Varn  ', facts: ['  She is wise  '] },
        ],
        inventoryAdded: ['  Ancient key  '],
        inventoryRemoved: ['  Old map  '],
        isEnding: false,
        storyArc: '  Find the truth  ',
      };

      const result = validateGenerationResponse(rawJson, 'raw');

      expect(result.narrative).toBe(VALID_NARRATIVE);
      expect(result.choices).toEqual(['Open the door', 'Climb the tower']);
      expect(result.stateChangesAdded).toEqual(['Entered the keep']);
      expect(result.newCanonFacts).toEqual(['The keep is haunted']);
      expect(result.newCharacterCanonFacts).toEqual({
        'Elder Varn': ['She is wise'],
      });
      expect(result.inventoryAdded).toEqual(['Ancient key']);
      expect(result.inventoryRemoved).toEqual(['Old map']);
      expect(result.storyArc).toBe('Find the truth');
    });

    it('should filter empty strings from arrays', () => {
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: ['Open the door', 'Climb the tower'],
        stateChangesAdded: ['', '  ', 'Entered the keep', '\n'],
        stateChangesRemoved: [],
        newCanonFacts: ['The keep is haunted', '', '   '],
        newCharacterCanonFacts: [
          { characterName: 'Elder Varn', facts: ['She is wise', '', '  '] },
          { characterName: 'Empty', facts: ['', '   '] },
        ],
        inventoryAdded: ['Key', '', '  '],
        inventoryRemoved: ['', 'Old map'],
        isEnding: false,
      };

      const result = validateGenerationResponse(rawJson, 'raw');

      expect(result.stateChangesAdded).toEqual(['Entered the keep']);
      expect(result.newCanonFacts).toEqual(['The keep is haunted']);
      expect(result.newCharacterCanonFacts).toEqual({
        'Elder Varn': ['She is wise'],
      });
      expect(result.inventoryAdded).toEqual(['Key']);
      expect(result.inventoryRemoved).toEqual(['Old map']);
    });
  });

  describe('Zod schema validation', () => {
    it('should parse valid input and apply defaults', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        choices: ['Choice A', 'Choice B'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        isEnding: false,
      };

      const result = GenerationResultSchema.parse(input);

      // Defaults should be applied
      expect(result.inventoryAdded).toEqual([]);
      expect(result.inventoryRemoved).toEqual([]);
      expect(result.storyArc).toBe('');
      expect(result.newCharacterCanonFacts).toEqual({});
    });

    it('should reject invalid narrative length', () => {
      const input = {
        narrative: 'Too short',
        choices: ['Choice A', 'Choice B'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        isEnding: false,
      };

      expect(() => GenerationResultSchema.parse(input)).toThrow();
    });

    it('should reject duplicate choices (case-insensitive)', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        choices: ['Open the door', 'OPEN THE DOOR'],
        stateChangesAdded: [],
        stateChangesRemoved: [],
        newCanonFacts: [],
        isEnding: false,
      };

      expect(() => GenerationResultSchema.parse(input)).toThrow('Choices must be unique');
    });
  });
});

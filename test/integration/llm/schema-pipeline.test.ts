import {
  WRITER_GENERATION_SCHEMA,
  isStructuredOutputNotSupported,
  validateWriterResponse,
} from '../../../src/llm/schemas';
import { WriterResultSchema } from '../../../src/llm/schemas/writer-validation-schema';
import { generateWriterWithFallback } from '../../../src/llm/writer-generation';

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

function isPayloadCompatibleWithWriterSchema(payload: unknown): boolean {
  const schema = WRITER_GENERATION_SCHEMA.json_schema.schema as {
    required: string[];
    properties: Record<string, unknown>;
    additionalProperties: boolean;
  };

  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const record = payload as Record<string, unknown>;
  const allowedKeys = new Set(Object.keys(schema.properties));

  const hasAllRequiredFields = schema.required.every((field) => field in record);
  if (!hasAllRequiredFields) {
    return false;
  }

  if (schema.additionalProperties === false) {
    const hasUnknownFields = Object.keys(record).some((key) => !allowedKeys.has(key));
    if (hasUnknownFields) {
      return false;
    }
  }

  return true;
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
    it('should validate creative-only structured output and return only creative fields', () => {
      // Test the schema structure matches expected format
      const schemaProps = WRITER_GENERATION_SCHEMA.json_schema.schema as {
        required: string[];
        properties: Record<string, unknown>;
      };

      expect(schemaProps.required).toContain('narrative');
      expect(schemaProps.required).toContain('choices');
      expect(schemaProps.required).toContain('protagonistAffect');
      expect(schemaProps.required).toContain('sceneSummary');
      expect(schemaProps.required).toContain('isEnding');
      expect(schemaProps.required).not.toContain('newCanonFacts');
      expect(schemaProps.required).not.toContain('currentLocation');
      expect(schemaProps.required).not.toContain('threatsAdded');

      // Validate a response through the full pipeline
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: [
          {
            text: 'Open the iron door',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: 'Climb the collapsed tower',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        protagonistAffect: {
          primaryEmotion: 'apprehension',
          primaryIntensity: 'moderate',
          primaryCause: 'The ancient ruins groan with instability',
          secondaryEmotions: [{ emotion: 'curiosity', cause: 'Whispers of forgotten knowledge' }],
          dominantMotivation: 'Find the plague archives',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const result = validateWriterResponse(rawJson, JSON.stringify(rawJson));

      expect(result.narrative).toBe(VALID_NARRATIVE);
      expect(result.choices).toHaveLength(2);
      expect(result.isEnding).toBe(false);
      expect(result.rawResponse).toBe(JSON.stringify(rawJson));
      expect('currentLocation' in (result as Record<string, unknown>)).toBe(false);
      expect('threatsAdded' in (result as Record<string, unknown>)).toBe(false);
      expect('threadsAdded' in (result as Record<string, unknown>)).toBe(false);
    });

    it('should reject payloads with legacy state fields at strict schema boundary', () => {
      const payloadWithLegacyStateField = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Move fast', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'Move quietly',
            choiceType: 'AVOIDANCE_RETREAT',
            primaryDelta: 'EXPOSURE_CHANGE',
          },
        ],
        protagonistAffect: {
          primaryEmotion: 'focus',
          primaryIntensity: 'strong',
          primaryCause: 'The mission window is closing',
          secondaryEmotions: [],
          dominantMotivation: 'Get inside before guards rotate',
        },
        sceneSummary: 'You choose a stealthy route while watching guard patterns at the gate.',
        isEnding: false,
        threatsAdded: ['Legacy field should be rejected by strict schema'],
      };

      expect(isPayloadCompatibleWithWriterSchema(payloadWithLegacyStateField)).toBe(false);
    });

    it('should ignore legacy deterministic fields when present in raw payload', () => {
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: [
          {
            text: 'Speak to the elder',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: 'Wait in silence',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        currentLocation: 'The elder council chamber',
        threatsAdded: ['Legacy threat'],
        constraintsAdded: ['Legacy constraint'],
        threadsAdded: [{ text: 'Legacy thread', threadType: 'RELATIONSHIP', urgency: 'MEDIUM' }],
        newCanonFacts: [{ text: 'Legacy canon fact', factType: 'LAW' }],
        protagonistAffect: {
          primaryEmotion: 'reverence',
          primaryIntensity: 'moderate',
          primaryCause: 'Meeting the last of an ancient order',
          secondaryEmotions: [],
          dominantMotivation: 'Learn from the elder',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const result = validateWriterResponse(rawJson, 'raw');

      expect(result.narrative).toBe(VALID_NARRATIVE);
      expect(result.choices).toHaveLength(2);
      expect('currentLocation' in (result as Record<string, unknown>)).toBe(false);
      expect('newCanonFacts' in (result as Record<string, unknown>)).toBe(false);
    });

    it('should parse writer output even when deterministic legacy fields are provided', async () => {
      const structured = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Continue forward', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Turn back', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        currentLocation: 'Hidden cache chamber',
        threatsAdded: [],
        constraintsAdded: [],
        threadsAdded: [
          { text: 'The hidden cache discovery', threadType: 'INFORMATION', urgency: 'MEDIUM' },
        ],
        inventoryAdded: ['Ancient map', 'Gold coins (50)'],
        protagonistAffect: {
          primaryEmotion: 'excitement',
          primaryIntensity: 'strong',
          primaryCause: 'Discovered valuable treasures',
          secondaryEmotions: [],
          dominantMotivation: 'Secure the findings and continue exploring',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(structured)));

      const result = await generateWriterWithFallback([{ role: 'user', content: 'Test prompt' }], {
        apiKey: 'test-key',
      });

      expect(result.choices).toHaveLength(2);
      expect('inventoryAdded' in (result as Record<string, unknown>)).toBe(false);
    });

    it('should validate ending page with zero choices', () => {
      const endingJson = {
        narrative: VALID_NARRATIVE,
        choices: [],
        currentLocation: 'The realm of peace',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: ['td-1'],
        newCanonFacts: [{ text: 'Peace was restored', factType: 'LAW' }],
        newCharacterCanonFacts: [],
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'peace',
          primaryIntensity: 'strong',
          primaryCause: 'The journey has reached its conclusion',
          secondaryEmotions: [{ emotion: 'satisfaction', cause: 'All threads resolved' }],
          dominantMotivation: 'Rest at last',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: true,
      };

      const result = validateWriterResponse(endingJson, 'raw');

      expect(result.isEnding).toBe(true);
      expect(result.choices).toHaveLength(0);
    });

    it('should reject ending page with non-zero choices', () => {
      const invalidEndingJson = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Continue anyway', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        ],
        currentLocation: 'Invalid ending location',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [],
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'confusion',
          primaryIntensity: 'mild',
          primaryCause: 'Invalid state',
          secondaryEmotions: [],
          dominantMotivation: 'Resolve the error',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: true,
      };

      expect(() => validateWriterResponse(invalidEndingJson, 'raw')).toThrow();
    });

    it('should reject non-ending page with zero choices', () => {
      const invalidNonEndingJson = {
        narrative: VALID_NARRATIVE,
        choices: [],
        currentLocation: 'Invalid non-ending location',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [],
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'confusion',
          primaryIntensity: 'mild',
          primaryCause: 'Invalid state',
          secondaryEmotions: [],
          dominantMotivation: 'Resolve the error',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      expect(() => validateWriterResponse(invalidNonEndingJson, 'raw')).toThrow();
    });
  });

  describe('error classification', () => {
    it('should detect structured output not supported and return proper LLMError', async () => {
      fetchMock.mockResolvedValue(
        createJsonResponse(400, {
          error: { message: 'response_format is not supported by this model' },
        })
      );

      // Attach rejection handler early to prevent unhandled rejection detection
      // 400 errors are non-retryable so no timer advancement needed
      const promise = generateWriterWithFallback([{ role: 'user', content: 'Test prompt' }], {
        apiKey: 'test-key',
        model: 'unsupported-model',
      });

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
        choices: [
          {
            text: '  Open the door  ',
            choiceType: 'TACTICAL_APPROACH',
            primaryDelta: 'GOAL_SHIFT',
          },
          {
            text: '  Climb the tower  ',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        protagonistAffect: {
          primaryEmotion: '  determination  ',
          primaryIntensity: 'strong',
          primaryCause: '  Found valuable clues  ',
          secondaryEmotions: [],
          dominantMotivation: '  Decode the ledger  ',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const result = validateWriterResponse(rawJson, 'raw');

      expect(result.narrative).toBe(VALID_NARRATIVE);
      expect(result.choices).toEqual([
        { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        {
          text: 'Climb the tower',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ]);
      expect(result.protagonistAffect.primaryEmotion).toBe('determination');
      expect(result.protagonistAffect.primaryCause).toBe('Found valuable clues');
      expect(result.protagonistAffect.dominantMotivation).toBe('Decode the ledger');
    });

    it('should ignore legacy deterministic arrays while preserving creative output', () => {
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'Climb the tower',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        threatsAdded: ['', '  ', 'Ghostly watcher', '\n'],
        constraintsAdded: ['', 'Locked gate'],
        threadsAdded: [{ text: 'The mystery', threadType: 'MYSTERY', urgency: 'MEDIUM' }],
        newCanonFacts: [{ text: 'The keep is haunted', factType: 'LAW' }],
        inventoryAdded: ['Key', '', '  '],
        protagonistAffect: {
          primaryEmotion: 'caution',
          primaryIntensity: 'moderate',
          primaryCause: 'Entering a dangerous place',
          secondaryEmotions: [],
          dominantMotivation: 'Proceed carefully',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const result = validateWriterResponse(rawJson, 'raw');

      expect(result.narrative).toBe(VALID_NARRATIVE);
      expect(result.choices).toHaveLength(2);
      expect(result.protagonistAffect.primaryEmotion).toBe('caution');
      expect('threatsAdded' in (result as Record<string, unknown>)).toBe(false);
    });
  });

  describe('Zod schema validation', () => {
    it('should parse valid input and apply creative defaults', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Choice A', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Choice B', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const result = WriterResultSchema.parse(input);

      // Creative defaults should be applied
      expect(result.protagonistAffect).toEqual({
        primaryEmotion: 'neutral',
        primaryIntensity: 'mild',
        primaryCause: 'No specific emotional driver',
        secondaryEmotions: [],
        dominantMotivation: 'Continue forward',
      });
    });

    it('should reject invalid narrative length', () => {
      const input = {
        narrative: 'Too short',
        choices: [
          { text: 'Choice A', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Choice B', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      expect(() => WriterResultSchema.parse(input)).toThrow();
    });

    it('should allow narrative longer than 15000 characters', () => {
      const input = {
        narrative: `${'A'.repeat(15001)} This narrative is intentionally long enough to exceed the old cap while still passing minimum-length validation.`,
        choices: [
          { text: 'Choice A', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Choice B', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      expect(() => WriterResultSchema.parse(input)).not.toThrow();
    });

    it('should reject duplicate choices (case-insensitive)', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'OPEN THE DOOR',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      expect(() => WriterResultSchema.parse(input)).toThrow('Choices must be unique');
    });

    it('should ignore legacy string-array threadsAdded', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'Climb the tower',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        threadsAdded: ['legacy-thread-shape'],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const parsed = WriterResultSchema.parse(input);
      expect(parsed).toBeDefined();
      expect('threadsAdded' in (parsed as Record<string, unknown>)).toBe(false);
    });

    it('should ignore legacy removal-id fields at writer-schema stage', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          {
            text: 'Climb the tower',
            choiceType: 'INVESTIGATION',
            primaryDelta: 'INFORMATION_REVEALED',
          },
        ],
        constraintsRemoved: ['th-1'],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const parsed = WriterResultSchema.parse(input);
      expect(parsed).toBeDefined();
      expect('constraintsRemoved' in (parsed as Record<string, unknown>)).toBe(false);
    });
  });
});

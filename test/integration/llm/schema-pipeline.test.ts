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
    it('should validate creative-only structured output and preserve legacy defaults downstream', () => {
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
          { text: 'Open the iron door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Climb the collapsed tower', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
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
      expect(result.currentLocation).toEqual('');
      expect(result.threatsAdded).toEqual([]);
      expect(result.threadsAdded).toEqual([]);
      expect(result.newCanonFacts).toEqual([]);
      expect(result.inventoryAdded).toEqual([]);
      expect(result.inventoryRemoved).toEqual([]);
      expect(result.healthAdded).toEqual([]);
      expect(result.healthRemoved).toEqual([]);
      expect(result.isEnding).toBe(false);
      expect(result.rawResponse).toBe(JSON.stringify(rawJson));
    });

    it('should reject payloads with legacy state fields at strict schema boundary', () => {
      const payloadWithLegacyStateField = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Move fast', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Move quietly', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'EXPOSURE_CHANGE' },
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

    it('should transform character canon facts array to record through full flow', () => {
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Speak to the elder', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Wait in silence', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        currentLocation: 'The elder council chamber',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [{ text: 'Elder Varn encounter', threadType: 'RELATIONSHIP', urgency: 'MEDIUM' }],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: 'Elder Varn', facts: ['She is the last of her order', 'She carries an obsidian staff'] },
          { characterName: 'Brother Kael', facts: ['He betrayed the order'] },
        ],
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
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

      // Array format should be transformed to Record format
      expect(result.newCharacterCanonFacts).toEqual({
        'Elder Varn': ['She is the last of her order', 'She carries an obsidian staff'],
        'Brother Kael': ['He betrayed the order'],
      });
    });

    it('should merge duplicate character entries in canon facts', () => {
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Follow the clue', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Ignore it', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        currentLocation: 'Detective Shaw\'s office',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [
          { characterName: 'Detective Shaw', facts: ['She wears a trench coat'] },
          { characterName: 'Detective Shaw', facts: ['She has a silver badge'] },
        ],
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'intrigue',
          primaryIntensity: 'mild',
          primaryCause: 'The detective seems to know more than she reveals',
          secondaryEmotions: [],
          dominantMotivation: 'Uncover the truth',
        },
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const result = validateWriterResponse(rawJson, 'raw');

      expect(result.newCharacterCanonFacts).toEqual({
        'Detective Shaw': ['She wears a trench coat', 'She has a silver badge'],
      });
    });

    it('should handle inventory fields through pipeline', async () => {
      const structured = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Continue forward', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Turn back', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        currentLocation: 'Hidden cache chamber',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [{ text: 'The hidden cache discovery', threadType: 'INFORMATION', urgency: 'MEDIUM' }],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: [],
        inventoryAdded: ['Ancient map', 'Gold coins (50)'],
        inventoryRemoved: ['inv-1'],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
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

      const result = await generateWriterWithFallback(
        [{ role: 'user', content: 'Test prompt' }],
        { apiKey: 'test-key' },
      );

      expect(result.inventoryAdded).toEqual(['Ancient map', 'Gold coins (50)']);
      expect(result.inventoryRemoved).toEqual(['inv-1']);
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
        newCanonFacts: ['Peace was restored'],
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
        }),
      );

      // Attach rejection handler early to prevent unhandled rejection detection
      // 400 errors are non-retryable so no timer advancement needed
      const promise = generateWriterWithFallback(
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
        choices: [
          { text: '  Open the door  ', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: '  Climb the tower  ', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        currentLocation: '  The haunted keep  ',
        threatsAdded: ['  Ghostly presence  '],
        threatsRemoved: [],
        constraintsAdded: ['  Limited visibility  '],
        constraintsRemoved: [],
        threadsAdded: [{ text: '  The encoded ledger  ', threadType: 'MYSTERY', urgency: 'HIGH' }],
        threadsResolved: [],
        newCanonFacts: ['  The keep is haunted  '],
        newCharacterCanonFacts: [
          { characterName: '  Elder Varn  ', facts: ['  She is wise  '] },
        ],
        inventoryAdded: ['  Ancient key  '],
        inventoryRemoved: ['  inv-9  '],
        healthAdded: ['  Minor wound on left arm  '],
        healthRemoved: ['  hp-5  '],
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
        { text: 'Climb the tower', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ]);
      expect(result.currentLocation).toEqual('The haunted keep');
      expect(result.threatsAdded).toEqual(['Ghostly presence']);
      expect(result.constraintsAdded).toEqual(['Limited visibility']);
      expect(result.threadsAdded).toEqual([
        { text: 'The encoded ledger', threadType: 'MYSTERY', urgency: 'HIGH' },
      ]);
      expect(result.newCanonFacts).toEqual(['The keep is haunted']);
      expect(result.newCharacterCanonFacts).toEqual({
        'Elder Varn': ['She is wise'],
      });
      expect(result.inventoryAdded).toEqual(['Ancient key']);
      expect(result.inventoryRemoved).toEqual(['inv-9']);
      expect(result.healthAdded).toEqual(['Minor wound on left arm']);
      expect(result.healthRemoved).toEqual(['hp-5']);
    });

    it('should filter empty strings from arrays', () => {
      const rawJson = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Climb the tower', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        currentLocation: 'The keep entrance',
        threatsAdded: ['', '  ', 'Ghostly watcher', '\n'],
        threatsRemoved: [],
        constraintsAdded: ['', 'Locked gate'],
        constraintsRemoved: [],
        threadsAdded: [{ text: 'The mystery', threadType: 'MYSTERY', urgency: 'MEDIUM' }],
        threadsResolved: [],
        newCanonFacts: ['The keep is haunted', '', '   '],
        newCharacterCanonFacts: [
          { characterName: 'Elder Varn', facts: ['She is wise', '', '  '] },
          { characterName: 'Empty', facts: ['', '   '] },
        ],
        inventoryAdded: ['Key', '', '  '],
        inventoryRemoved: ['', 'inv-4'],
        healthAdded: ['Bruised ribs', '', '  '],
        healthRemoved: ['', 'hp-2'],
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

      expect(result.threatsAdded).toEqual(['Ghostly watcher']);
      expect(result.constraintsAdded).toEqual(['Locked gate']);
      expect(result.threadsAdded).toEqual([
        { text: 'The mystery', threadType: 'MYSTERY', urgency: 'MEDIUM' },
      ]);
      expect(result.newCanonFacts).toEqual(['The keep is haunted']);
      expect(result.newCharacterCanonFacts).toEqual({
        'Elder Varn': ['She is wise'],
      });
      expect(result.inventoryAdded).toEqual(['Key']);
      expect(result.inventoryRemoved).toEqual(['inv-4']);
      expect(result.healthAdded).toEqual(['Bruised ribs']);
      expect(result.healthRemoved).toEqual(['hp-2']);
    });
  });

  describe('Zod schema validation', () => {
    it('should parse valid input and apply defaults', () => {
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

      // Defaults should be applied
      expect(result.currentLocation).toEqual('');
      expect(result.threatsAdded).toEqual([]);
      expect(result.threatsRemoved).toEqual([]);
      expect(result.constraintsAdded).toEqual([]);
      expect(result.constraintsRemoved).toEqual([]);
      expect(result.threadsAdded).toEqual([]);
      expect(result.threadsResolved).toEqual([]);
      expect(result.newCanonFacts).toEqual([]);
      expect(result.inventoryAdded).toEqual([]);
      expect(result.inventoryRemoved).toEqual([]);
      expect(result.newCharacterCanonFacts).toEqual({});
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
          { text: 'OPEN THE DOOR', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      expect(() => WriterResultSchema.parse(input)).toThrow('Choices must be unique');
    });

    it('should reject legacy string-array threadsAdded', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Climb the tower', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        threadsAdded: ['legacy-thread-shape'],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      expect(() => WriterResultSchema.parse(input)).toThrow();
    });

    it('should allow cross-category removal IDs at writer-schema stage', () => {
      const input = {
        narrative: VALID_NARRATIVE,
        choices: [
          { text: 'Open the door', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
          { text: 'Climb the tower', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        ],
        constraintsRemoved: ['th-1'],
        newCanonFacts: [],
        sceneSummary: 'Test summary of the scene events and consequences.',
        isEnding: false,
      };

      const parsed = WriterResultSchema.parse(input);
      expect(parsed.constraintsRemoved).toEqual(['th-1']);
    });
  });
});

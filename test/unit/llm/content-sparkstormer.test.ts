import { buildSparkstormerPrompt } from '../../../src/llm/prompts/content-sparkstormer-prompt';
import { parseSparkstormerResponse } from '../../../src/llm/content-sparkstormer-generation';
import { buildContentSparkstormerSchema } from '../../../src/llm/schemas/content-sparkstormer-schema';
import type {
  SparkstormerContext,
  TasteProfile,
} from '../../../src/models/content-generation-contracts';

function makeTasteProfile(): TasteProfile {
  return {
    collisionPatterns: ['body horror meets bureaucracy'],
    favoredMechanisms: ['transformation'],
    humanAnchors: ['grieving parent'],
    socialEngines: ['black market for memories'],
    toneBlend: ['dread'],
    sceneAppetites: ['confrontation scenes'],
    antiPatterns: ['chosen one narratives'],
    surfaceDoNotRepeat: ['sentient shadows'],
    riskAppetite: 'HIGH',
    engagementModes: ['puzzle-solving', 'moral dilemma'],
    valueTensions: ['duty vs desire', 'truth vs stability'],
    deepPatterns: ['erosion of certainty', 'institutional betrayal'],
  };
}

function makeContext(overrides: Partial<SparkstormerContext> = {}): SparkstormerContext {
  return {
    tasteProfile: makeTasteProfile(),
    ...overrides,
  };
}

function makeValidSpark(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sparkId: 'spark-01',
    contentKind: 'ENTITY',
    spark: 'A mortician who remembers the last dream of every corpse she embalms.',
    imageSeed: 'formaldehyde-stained dream journal',
    collisionTags: ['death-work', 'memory', 'intimacy'],
    playerRole: 'the mortician who cannot stop inheriting the dead',
    want: 'to keep one dangerous final dream from being sold',
    counterforce: 'grieving families and brokers who treat dreams as property',
    deepPatternRef: 'institutional betrayal',
    ...overrides,
  };
}

describe('buildSparkstormerPrompt', () => {
  it('includes CONTENT_POLICY section in system prompt', () => {
    const messages = buildSparkstormerPrompt(makeContext());
    const systemMessage = messages.find((m) => m.role === 'system');
    expect(systemMessage).toBeDefined();
    expect(systemMessage!.content).toContain('CONTENT GUIDELINES:');
    expect(systemMessage!.content).toContain('NC-21');
  });

  it('injects JSON taste profile into user prompt', () => {
    const profile = makeTasteProfile();
    const messages = buildSparkstormerPrompt(makeContext());
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain('TASTE PROFILE:');
    expect(userMessage!.content).toContain(JSON.stringify(profile, null, 2));
  });

  it('injects optional kernel block when provided', () => {
    const context = makeContext({ kernelBlock: 'A story about grief becoming currency' });
    const messages = buildSparkstormerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).toContain('STORY KERNEL');
    expect(userMessage!.content).toContain('A story about grief becoming currency');
  });

  it('injects optional user content preferences when provided', () => {
    const context = makeContext({ contentPreferences: 'body horror, institutional critique' });
    const messages = buildSparkstormerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).toContain('CONTENT PREFERENCES:');
    expect(userMessage!.content).toContain('body horror, institutional critique');
  });

  it('omits optional sections when not provided', () => {
    const context = makeContext();
    const messages = buildSparkstormerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).not.toContain('STORY KERNEL');
    expect(userMessage!.content).not.toContain('CONTENT PREFERENCES:');
  });

  it('omits optional sections when provided as empty/whitespace strings', () => {
    const context = makeContext({ kernelBlock: '   ', contentPreferences: '' });
    const messages = buildSparkstormerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).not.toContain('STORY KERNEL');
    expect(userMessage!.content).not.toContain('CONTENT PREFERENCES:');
  });

  it('documents the required agency fields in the prompt contract', () => {
    const messages = buildSparkstormerPrompt(makeContext());
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessage = messages.find((m) => m.role === 'user');

    expect(systemMessage!.content).toContain('playerRole');
    expect(systemMessage!.content).toContain('want');
    expect(systemMessage!.content).toContain('counterforce');
    expect(systemMessage!.content).toContain('deepPatternRef');
    expect(userMessage!.content).toContain(
      'Each spark object must have: sparkId, contentKind, spark, imageSeed, collisionTags, playerRole, want, counterforce, deepPatternRef.'
    );
  });

  it('documents portfolio-level diversity constraints to prevent mode collapse', () => {
    const messages = buildSparkstormerPrompt(makeContext());
    const systemMessage = messages.find((m) => m.role === 'system');

    expect(systemMessage!.content).toContain('No more than 4 sparks of the same contentKind');
    expect(systemMessage!.content).toContain('20-30% of sparks should be taste stretch');
    expect(systemMessage!.content).toContain('Spread sparks across multiple deepPatterns');
    expect(systemMessage!.content).toContain(
      'Include a mix of novelty types: combinational, exploratory, and transformational.'
    );
  });
});

describe('parseSparkstormerResponse', () => {
  it('validates each spark has sparkId, contentKind, spark, imageSeed, collisionTags, playerRole, want, counterforce, and deepPatternRef', () => {
    const spark = makeValidSpark();
    const result = parseSparkstormerResponse({ sparks: [spark] });
    expect(result).toHaveLength(1);
    expect(result[0].sparkId).toBe('spark-01');
    expect(result[0].contentKind).toBe('ENTITY');
    expect(result[0].spark).toBe(spark['spark']);
    expect(result[0].imageSeed).toBe(spark['imageSeed']);
    expect(result[0].collisionTags).toEqual(spark['collisionTags']);
    expect(result[0].playerRole).toBe(spark['playerRole']);
    expect(result[0].want).toBe(spark['want']);
    expect(result[0].counterforce).toBe(spark['counterforce']);
    expect(result[0].deepPatternRef).toBe(spark['deepPatternRef']);
  });

  it('validates contentKind against valid ContentKind values', () => {
    for (const validKind of [
      'ENTITY',
      'INSTITUTION',
      'RELATIONSHIP',
      'TRANSFORMATION',
      'WORLD_INTRUSION',
      'RITUAL',
      'POLICY',
      'JOB',
      'SUBCULTURE',
      'ECONOMY',
    ]) {
      const spark = makeValidSpark({ contentKind: validKind });
      expect(() => parseSparkstormerResponse({ sparks: [spark] })).not.toThrow();
    }

    const spark = makeValidSpark({ contentKind: 'INVALID_KIND' });
    expect(() => parseSparkstormerResponse({ sparks: [spark] })).toThrow(
      /contentKind must be a valid ContentKind/
    );
  });

  it('rejects sparks with missing sparkId', () => {
    const spark = makeValidSpark();
    delete spark['sparkId'];
    expect(() => parseSparkstormerResponse({ sparks: [spark] })).toThrow(
      /sparkId must be a non-empty string/
    );
  });

  it('rejects sparks with missing spark text', () => {
    const spark = makeValidSpark();
    delete spark['spark'];
    expect(() => parseSparkstormerResponse({ sparks: [spark] })).toThrow(
      /spark must be a non-empty string/
    );
  });

  it('rejects sparks with missing imageSeed', () => {
    const spark = makeValidSpark();
    delete spark['imageSeed'];
    expect(() => parseSparkstormerResponse({ sparks: [spark] })).toThrow(
      /imageSeed must be a non-empty string/
    );
  });

  it('rejects sparks with empty collisionTags', () => {
    const spark = makeValidSpark({ collisionTags: [] });
    expect(() => parseSparkstormerResponse({ sparks: [spark] })).toThrow(
      /collisionTags must be a non-empty array/
    );
  });

  it('rejects sparks with missing collisionTags', () => {
    const spark = makeValidSpark();
    delete spark['collisionTags'];
    expect(() => parseSparkstormerResponse({ sparks: [spark] })).toThrow(
      /collisionTags must be a non-empty array/
    );
  });

  it.each(['playerRole', 'want', 'counterforce', 'deepPatternRef'])(
    'rejects sparks with missing %s',
    (field) => {
      const spark = makeValidSpark();
      delete spark[field];

      expect(() => parseSparkstormerResponse({ sparks: [spark] })).toThrow(
        new RegExp(`${field} must be a non-empty string`)
      );
    }
  );

  it.each([
    ['playerRole', '   '],
    ['want', ''],
    ['counterforce', ' '],
    ['deepPatternRef', '\n\t'],
  ])('rejects sparks with blank %s', (field, value) => {
    const spark = makeValidSpark({ [field]: value });

    expect(() => parseSparkstormerResponse({ sparks: [spark] })).toThrow(
      new RegExp(`${field} must be a non-empty string`)
    );
  });

  it('rejects empty sparks array', () => {
    expect(() => parseSparkstormerResponse({ sparks: [] })).toThrow(
      /sparks must be a non-empty array/
    );
  });

  it('rejects non-object response', () => {
    expect(() => parseSparkstormerResponse('not an object')).toThrow(/must be an object/);
  });

  it('rejects response missing sparks key', () => {
    expect(() => parseSparkstormerResponse({ notSparks: [] })).toThrow(
      /sparks must be a non-empty array/
    );
  });

  it('parses multiple sparks correctly', () => {
    const sparks = [
      makeValidSpark({ sparkId: 'spark-01' }),
      makeValidSpark({ sparkId: 'spark-02', contentKind: 'RITUAL' }),
      makeValidSpark({ sparkId: 'spark-03', contentKind: 'SUBCULTURE' }),
    ];
    const result = parseSparkstormerResponse({ sparks });
    expect(result).toHaveLength(3);
    expect(result[0].sparkId).toBe('spark-01');
    expect(result[1].sparkId).toBe('spark-02');
    expect(result[1].contentKind).toBe('RITUAL');
    expect(result[2].sparkId).toBe('spark-03');
    expect(result[2].contentKind).toBe('SUBCULTURE');
  });

  it('rejects sparks with duplicate sparkIds', () => {
    const sparks = [
      makeValidSpark({ sparkId: 'spark-01' }),
      makeValidSpark({ sparkId: 'spark-01', contentKind: 'RITUAL' }),
    ];
    expect(() => parseSparkstormerResponse({ sparks })).toThrow(/Duplicate sparkId: spark-01/);
  });
});

describe('buildContentSparkstormerSchema', () => {
  it('matches spec output shape with sparks array', () => {
    const schema = buildContentSparkstormerSchema();
    expect(schema.type).toBe('json_schema');
    expect(schema.json_schema.name).toBe('content_sparkstormer');

    const rootSchema = schema.json_schema.schema as Record<string, unknown>;
    expect(rootSchema['required']).toEqual(['sparks']);

    const properties = rootSchema['properties'] as Record<string, unknown>;
    const sparks = properties['sparks'] as Record<string, unknown>;
    expect(sparks['type']).toBe('array');

    const items = sparks['items'] as Record<string, unknown>;
    expect(items['type']).toBe('object');

    const required = items['required'] as string[];
    expect(required).toContain('sparkId');
    expect(required).toContain('contentKind');
    expect(required).toContain('spark');
    expect(required).toContain('imageSeed');
    expect(required).toContain('collisionTags');
    expect(required).toContain('playerRole');
    expect(required).toContain('want');
    expect(required).toContain('counterforce');
    expect(required).toContain('deepPatternRef');

    const sparkProps = items['properties'] as Record<string, Record<string, unknown>>;
    expect(sparkProps['contentKind']['enum']).toEqual([
      'ENTITY',
      'INSTITUTION',
      'RELATIONSHIP',
      'TRANSFORMATION',
      'WORLD_INTRUSION',
      'RITUAL',
      'POLICY',
      'JOB',
      'SUBCULTURE',
      'ECONOMY',
      'PLACE',
      'SECRET',
    ]);
    expect(sparkProps['playerRole']['type']).toBe('string');
    expect(sparkProps['want']['type']).toBe('string');
    expect(sparkProps['counterforce']['type']).toBe('string');
    expect(sparkProps['deepPatternRef']['type']).toBe('string');
  });
});

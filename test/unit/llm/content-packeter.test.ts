import { buildContentPacketerPrompt } from '../../../src/llm/prompts/content-packeter-prompt';
import { parseContentPacketerResponse } from '../../../src/llm/content-packeter-generation';
import { buildContentPacketerSchema } from '../../../src/llm/schemas/content-packeter-schema';
import type {
  ContentPacketerContext,
  ContentSpark,
  TasteProfile,
} from '../../../src/models/content-packet';

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
  };
}

function makeSpark(overrides: Partial<ContentSpark> = {}): ContentSpark {
  return {
    sparkId: 'spark-01',
    contentKind: 'ENTITY',
    spark: 'A mortician who remembers the last dream of every corpse she embalms.',
    imageSeed: 'formaldehyde-stained dream journal',
    collisionTags: ['death-work', 'memory', 'intimacy'],
    ...overrides,
  };
}

function makeContext(overrides: Partial<ContentPacketerContext> = {}): ContentPacketerContext {
  return {
    tasteProfile: makeTasteProfile(),
    sparks: [makeSpark()],
    ...overrides,
  };
}

function makeValidPacket(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contentId: 'pkt-01',
    sourceSparkIds: ['spark-01'],
    contentKind: 'ENTITY',
    coreAnomaly: 'She cannot forget what the dead dreamed.',
    humanAnchor: 'The weight of inherited grief.',
    socialEngine: 'A black market trades in extracted final dreams.',
    choicePressure: 'Sell the dreams or carry the burden.',
    signatureImage: 'A jar of iridescent fluid labeled with a dead name.',
    escalationPath: 'The dreams start bleeding into her waking life.',
    wildnessInvariant: 'The intimacy of knowing a stranger through their last dream.',
    dullCollapse: 'Generic ghost story with no personal stakes.',
    interactionVerbs: ['extract', 'trade', 'confront', 'mourn'],
    ...overrides,
  };
}

describe('buildContentPacketerPrompt', () => {
  it('includes CONTENT_POLICY section in system prompt', () => {
    const messages = buildContentPacketerPrompt(makeContext());
    const systemMessage = messages.find((m) => m.role === 'system');
    expect(systemMessage).toBeDefined();
    expect(systemMessage!.content).toContain('CONTENT GUIDELINES:');
    expect(systemMessage!.content).toContain('NC-21');
  });

  it('injects taste profile into user prompt', () => {
    const profile = makeTasteProfile();
    const messages = buildContentPacketerPrompt(makeContext());
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain('TASTE PROFILE:');
    expect(userMessage!.content).toContain(JSON.stringify(profile, null, 2));
  });

  it('injects sparks array into user prompt', () => {
    const sparks = [makeSpark()];
    const messages = buildContentPacketerPrompt(makeContext({ sparks }));
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain('SPARKS:');
    expect(userMessage!.content).toContain(JSON.stringify(sparks, null, 2));
  });

  it('injects optional kernel block when provided', () => {
    const context = makeContext({ kernelBlock: 'A story about grief becoming currency' });
    const messages = buildContentPacketerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).toContain('STORY KERNEL');
    expect(userMessage!.content).toContain('A story about grief becoming currency');
  });

  it('omits kernel block when not provided', () => {
    const messages = buildContentPacketerPrompt(makeContext());
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).not.toContain('STORY KERNEL');
  });

  it('omits kernel block when provided as whitespace', () => {
    const context = makeContext({ kernelBlock: '   ' });
    const messages = buildContentPacketerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).not.toContain('STORY KERNEL');
  });
});

describe('parseContentPacketerResponse', () => {
  it('validates all required packet fields', () => {
    const packet = makeValidPacket();
    const result = parseContentPacketerResponse({ packets: [packet] });
    expect(result).toHaveLength(1);
    expect(result[0].contentId).toBe('pkt-01');
    expect(result[0].sourceSparkIds).toEqual(['spark-01']);
    expect(result[0].contentKind).toBe('ENTITY');
    expect(result[0].coreAnomaly).toBe(packet['coreAnomaly']);
    expect(result[0].humanAnchor).toBe(packet['humanAnchor']);
    expect(result[0].socialEngine).toBe(packet['socialEngine']);
    expect(result[0].choicePressure).toBe(packet['choicePressure']);
    expect(result[0].signatureImage).toBe(packet['signatureImage']);
    expect(result[0].escalationPath).toBe(packet['escalationPath']);
    expect(result[0].wildnessInvariant).toBe(packet['wildnessInvariant']);
    expect(result[0].dullCollapse).toBe(packet['dullCollapse']);
    expect(result[0].interactionVerbs).toEqual(packet['interactionVerbs']);
  });

  it('validates interactionVerbs has 4-6 items', () => {
    const tooFew = makeValidPacket({ interactionVerbs: ['a', 'b', 'c'] });
    expect(() => parseContentPacketerResponse({ packets: [tooFew] })).toThrow(
      /interactionVerbs must be an array of 4-6/,
    );

    const tooMany = makeValidPacket({
      interactionVerbs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    expect(() => parseContentPacketerResponse({ packets: [tooMany] })).toThrow(
      /interactionVerbs must be an array of 4-6/,
    );

    const justRight4 = makeValidPacket({ interactionVerbs: ['a', 'b', 'c', 'd'] });
    expect(() => parseContentPacketerResponse({ packets: [justRight4] })).not.toThrow();

    const justRight6 = makeValidPacket({
      interactionVerbs: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(() => parseContentPacketerResponse({ packets: [justRight6] })).not.toThrow();
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
      const packet = makeValidPacket({ contentKind: validKind });
      expect(() => parseContentPacketerResponse({ packets: [packet] })).not.toThrow();
    }

    const packet = makeValidPacket({ contentKind: 'INVALID_KIND' });
    expect(() => parseContentPacketerResponse({ packets: [packet] })).toThrow(
      /contentKind must be a valid ContentKind/,
    );
  });

  it('rejects packets with missing required fields', () => {
    const requiredStringFields = [
      'contentId',
      'coreAnomaly',
      'humanAnchor',
      'socialEngine',
      'choicePressure',
      'signatureImage',
      'escalationPath',
      'wildnessInvariant',
      'dullCollapse',
    ];

    for (const field of requiredStringFields) {
      const packet = makeValidPacket();
      delete packet[field];
      expect(() => parseContentPacketerResponse({ packets: [packet] })).toThrow(
        new RegExp(`${field} must be a non-empty string`),
      );
    }
  });

  it('rejects packets with missing sourceSparkIds', () => {
    const packet = makeValidPacket();
    delete packet['sourceSparkIds'];
    expect(() => parseContentPacketerResponse({ packets: [packet] })).toThrow(
      /sourceSparkIds must be a non-empty array/,
    );
  });

  it('rejects packets with empty sourceSparkIds', () => {
    const packet = makeValidPacket({ sourceSparkIds: [] });
    expect(() => parseContentPacketerResponse({ packets: [packet] })).toThrow(
      /sourceSparkIds must be a non-empty array/,
    );
  });

  it('rejects empty packets array', () => {
    expect(() => parseContentPacketerResponse({ packets: [] })).toThrow(
      /packets must be a non-empty array/,
    );
  });

  it('rejects non-object response', () => {
    expect(() => parseContentPacketerResponse('not an object')).toThrow(/must be an object/);
  });

  it('rejects response missing packets key', () => {
    expect(() => parseContentPacketerResponse({ notPackets: [] })).toThrow(
      /packets must be a non-empty array/,
    );
  });

  it('parses multiple packets correctly', () => {
    const packets = [
      makeValidPacket({ contentId: 'pkt-01' }),
      makeValidPacket({ contentId: 'pkt-02', contentKind: 'RITUAL' }),
      makeValidPacket({ contentId: 'pkt-03', contentKind: 'SUBCULTURE' }),
    ];
    const result = parseContentPacketerResponse({ packets });
    expect(result).toHaveLength(3);
    expect(result[0].contentId).toBe('pkt-01');
    expect(result[1].contentId).toBe('pkt-02');
    expect(result[1].contentKind).toBe('RITUAL');
    expect(result[2].contentId).toBe('pkt-03');
    expect(result[2].contentKind).toBe('SUBCULTURE');
  });
});

describe('buildContentPacketerSchema', () => {
  it('matches spec output shape with packets array', () => {
    const schema = buildContentPacketerSchema();
    expect(schema.type).toBe('json_schema');
    expect(schema.json_schema.name).toBe('content_packeter');

    const rootSchema = schema.json_schema.schema as Record<string, unknown>;
    expect(rootSchema['required']).toEqual(['packets']);

    const properties = rootSchema['properties'] as Record<string, unknown>;
    const packets = properties['packets'] as Record<string, unknown>;
    expect(packets['type']).toBe('array');

    const items = packets['items'] as Record<string, unknown>;
    expect(items['type']).toBe('object');

    const required = items['required'] as string[];
    expect(required).toContain('contentId');
    expect(required).toContain('sourceSparkIds');
    expect(required).toContain('contentKind');
    expect(required).toContain('coreAnomaly');
    expect(required).toContain('humanAnchor');
    expect(required).toContain('socialEngine');
    expect(required).toContain('choicePressure');
    expect(required).toContain('signatureImage');
    expect(required).toContain('escalationPath');
    expect(required).toContain('wildnessInvariant');
    expect(required).toContain('dullCollapse');
    expect(required).toContain('interactionVerbs');

    const packetProps = items['properties'] as Record<string, Record<string, unknown>>;
    expect(packetProps['contentKind']['enum']).toEqual([
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
    ]);
  });
});

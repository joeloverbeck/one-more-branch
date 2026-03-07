import { buildContentOneShotPrompt } from '../../../src/llm/prompts/content-one-shot-prompt';
import { parseContentOneShotResponse } from '../../../src/llm/content-one-shot-generation';
import { buildContentOneShotSchema } from '../../../src/llm/schemas/content-one-shot-schema';
import type { ContentOneShotContext } from '../../../src/models/content-packet';

function makeValidPacket(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'The Grief Dentist',
    contentKind: 'JOB',
    coreAnomaly: 'A dentist who extracts memories from molars',
    humanAnchor: 'A widow who wants to forget her husband',
    socialEngine: 'A black market for extracted memories',
    choicePressure: 'Keep the memory or sell it to survive',
    signatureImage: 'A jar of glowing teeth on a nightstand',
    escalationHint: 'The memories start leaking into other patients',
    wildnessInvariant: 'Memories are physically stored in teeth',
    dullCollapse: 'Generic amnesia thriller',
    ...overrides,
  };
}

function makeContext(overrides: Partial<ContentOneShotContext> = {}): ContentOneShotContext {
  return {
    exemplarIdeas: ['A city where shadows are sentient', 'Grief that grows into a parasite'],
    ...overrides,
  };
}

describe('buildContentOneShotPrompt', () => {
  it('includes CONTENT_POLICY section in system prompt', () => {
    const messages = buildContentOneShotPrompt(makeContext());
    const systemMessage = messages.find((m) => m.role === 'system');
    expect(systemMessage).toBeDefined();
    expect(systemMessage!.content).toContain('CONTENT GUIDELINES:');
    expect(systemMessage!.content).toContain('NC-21');
  });

  it('injects exemplar ideas into user prompt', () => {
    const context = makeContext({
      exemplarIdeas: ['Idea Alpha', 'Idea Beta'],
    });
    const messages = buildContentOneShotPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain('1. Idea Alpha');
    expect(userMessage!.content).toContain('2. Idea Beta');
  });

  it('injects optional genre vibes, mood keywords, and kernel block when provided', () => {
    const context = makeContext({
      genreVibes: 'cosmic horror',
      moodKeywords: 'dread, longing',
      kernelBlock: 'dramaticThesis: Power corrupts',
    });
    const messages = buildContentOneShotPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).toContain('Genre vibes: cosmic horror');
    expect(userMessage!.content).toContain('Mood keywords: dread, longing');
    expect(userMessage!.content).toContain('KERNEL:\ndramaticThesis: Power corrupts');
  });

  it('omits optional sections when not provided', () => {
    const context = makeContext();
    const messages = buildContentOneShotPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).not.toContain('Genre vibes:');
    expect(userMessage!.content).not.toContain('Mood keywords:');
    expect(userMessage!.content).not.toContain('KERNEL:');
  });
});

describe('parseContentOneShotResponse', () => {
  it('validates all required packet fields', () => {
    const result = parseContentOneShotResponse({
      packets: [makeValidPacket()],
    });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('The Grief Dentist');
    expect(result[0].contentKind).toBe('JOB');
    expect(result[0].coreAnomaly).toBe('A dentist who extracts memories from molars');
    expect(result[0].humanAnchor).toBe('A widow who wants to forget her husband');
    expect(result[0].socialEngine).toBe('A black market for extracted memories');
    expect(result[0].choicePressure).toBe('Keep the memory or sell it to survive');
    expect(result[0].signatureImage).toBe('A jar of glowing teeth on a nightstand');
    expect(result[0].escalationHint).toBe('The memories start leaking into other patients');
    expect(result[0].wildnessInvariant).toBe('Memories are physically stored in teeth');
    expect(result[0].dullCollapse).toBe('Generic amnesia thriller');
  });

  it('rejects packets with invalid contentKind values', () => {
    expect(() =>
      parseContentOneShotResponse({
        packets: [makeValidPacket({ contentKind: 'INVALID_KIND' })],
      }),
    ).toThrow(/invalid contentKind/);
  });

  it('rejects responses with fewer than 1 packet', () => {
    expect(() =>
      parseContentOneShotResponse({ packets: [] }),
    ).toThrow(/at least 1 packet/);
  });

  it('rejects packets with missing required fields', () => {
    const { title: _, ...missingTitle } = makeValidPacket();
    void _;
    expect(() =>
      parseContentOneShotResponse({ packets: [missingTitle] }),
    ).toThrow(/missing or empty required field: title/);
  });

  it('rejects packets with empty string fields', () => {
    expect(() =>
      parseContentOneShotResponse({
        packets: [makeValidPacket({ coreAnomaly: '  ' })],
      }),
    ).toThrow(/missing or empty required field: coreAnomaly/);
  });

  it('rejects non-object responses', () => {
    expect(() => parseContentOneShotResponse('not an object')).toThrow(/must be an object/);
  });

  it('rejects responses missing packets array', () => {
    expect(() => parseContentOneShotResponse({ notPackets: [] })).toThrow(
      /missing packets array/,
    );
  });
});

describe('buildContentOneShotSchema', () => {
  it('defines packets array with correct property types and required fields', () => {
    const schema = buildContentOneShotSchema();
    expect(schema.type).toBe('json_schema');
    expect(schema.json_schema.name).toBe('content_one_shot');

    const rootSchema = schema.json_schema.schema as Record<string, unknown>;
    expect(rootSchema['required']).toEqual(['packets']);

    const properties = rootSchema['properties'] as Record<string, unknown>;
    const packets = properties['packets'] as Record<string, unknown>;
    expect(packets['type']).toBe('array');

    const items = packets['items'] as Record<string, unknown>;
    const itemRequired = items['required'] as string[];
    expect(itemRequired).toContain('title');
    expect(itemRequired).toContain('contentKind');
    expect(itemRequired).toContain('coreAnomaly');
    expect(itemRequired).toContain('humanAnchor');
    expect(itemRequired).toContain('socialEngine');
    expect(itemRequired).toContain('choicePressure');
    expect(itemRequired).toContain('signatureImage');
    expect(itemRequired).toContain('escalationHint');
    expect(itemRequired).toContain('wildnessInvariant');
    expect(itemRequired).toContain('dullCollapse');

    const itemProps = items['properties'] as Record<string, Record<string, unknown>>;
    expect(itemProps['title']['type']).toBe('string');
    expect(itemProps['contentKind']['type']).toBe('string');
    expect(itemProps['contentKind']['enum']).toBeDefined();
  });
});

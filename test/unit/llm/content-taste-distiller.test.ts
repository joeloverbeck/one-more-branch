import { buildContentTasteDistillerPrompt } from '../../../src/llm/prompts/content-taste-distiller-prompt';
import { parseTasteDistillerResponse } from '../../../src/llm/content-taste-distiller-generation';
import { buildContentTasteDistillerSchema } from '../../../src/llm/schemas/content-taste-distiller-schema';
import type { TasteDistillerContext } from '../../../src/models/content-packet';

function makeValidTasteProfile(): Record<string, unknown> {
  return {
    collisionPatterns: ['body horror meets bureaucracy', 'intimacy as weapon'],
    favoredMechanisms: ['transformation', 'policy enforcement'],
    humanAnchors: ['grieving parent', 'ambitious bureaucrat'],
    socialEngines: ['black market for memories', 'grief industry'],
    toneBlend: ['dread', 'dark comedy'],
    sceneAppetites: ['confrontation scenes', 'ritual sequences'],
    antiPatterns: ['chosen one narratives', 'generic dystopia'],
    surfaceDoNotRepeat: ['sentient shadows', 'grief parasites'],
    riskAppetite: 'HIGH',
  };
}

function makeContext(overrides: Partial<TasteDistillerContext> = {}): TasteDistillerContext {
  return {
    exemplarIdeas: ['A city where shadows are sentient', 'Grief that grows into a parasite'],
    ...overrides,
  };
}

describe('buildContentTasteDistillerPrompt', () => {
  it('includes CONTENT_POLICY section in system prompt', () => {
    const messages = buildContentTasteDistillerPrompt(makeContext());
    const systemMessage = messages.find((m) => m.role === 'system');
    expect(systemMessage).toBeDefined();
    expect(systemMessage!.content).toContain('CONTENT GUIDELINES:');
    expect(systemMessage!.content).toContain('NC-21');
  });

  it('injects exemplar ideas into user prompt', () => {
    const context = makeContext({
      exemplarIdeas: ['Idea Alpha', 'Idea Beta', 'Idea Gamma'],
    });
    const messages = buildContentTasteDistillerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage).toBeDefined();
    expect(userMessage!.content).toContain('1. Idea Alpha');
    expect(userMessage!.content).toContain('2. Idea Beta');
    expect(userMessage!.content).toContain('3. Idea Gamma');
  });

  it('injects optional mood/genre/content preference block when provided', () => {
    const context = makeContext({
      moodOrGenre: 'cosmic horror',
      contentPreferences: 'body horror, institutional critique',
    });
    const messages = buildContentTasteDistillerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).toContain('Mood / genre: cosmic horror');
    expect(userMessage!.content).toContain(
      'Content preferences: body horror, institutional critique',
    );
  });

  it('omits optional sections when not provided', () => {
    const context = makeContext();
    const messages = buildContentTasteDistillerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).not.toContain('Mood / genre:');
    expect(userMessage!.content).not.toContain('Content preferences:');
  });

  it('omits optional sections when provided as empty/whitespace strings', () => {
    const context = makeContext({
      moodOrGenre: '   ',
      contentPreferences: '',
    });
    const messages = buildContentTasteDistillerPrompt(context);
    const userMessage = messages.find((m) => m.role === 'user');
    expect(userMessage!.content).not.toContain('Mood / genre:');
    expect(userMessage!.content).not.toContain('Content preferences:');
  });
});

describe('parseTasteDistillerResponse', () => {
  it('validates tasteProfile has all 9 required fields', () => {
    const profile = makeValidTasteProfile();
    const result = parseTasteDistillerResponse({ tasteProfile: profile });
    expect(result.collisionPatterns).toEqual(profile['collisionPatterns']);
    expect(result.favoredMechanisms).toEqual(profile['favoredMechanisms']);
    expect(result.humanAnchors).toEqual(profile['humanAnchors']);
    expect(result.socialEngines).toEqual(profile['socialEngines']);
    expect(result.toneBlend).toEqual(profile['toneBlend']);
    expect(result.sceneAppetites).toEqual(profile['sceneAppetites']);
    expect(result.antiPatterns).toEqual(profile['antiPatterns']);
    expect(result.surfaceDoNotRepeat).toEqual(profile['surfaceDoNotRepeat']);
    expect(result.riskAppetite).toBe('HIGH');
  });

  it('validates riskAppetite is one of LOW/MEDIUM/HIGH/MAXIMAL', () => {
    for (const valid of ['LOW', 'MEDIUM', 'HIGH', 'MAXIMAL']) {
      const profile = makeValidTasteProfile();
      profile['riskAppetite'] = valid;
      expect(() => parseTasteDistillerResponse({ tasteProfile: profile })).not.toThrow();
    }
    const profile = makeValidTasteProfile();
    profile['riskAppetite'] = 'EXTREME';
    expect(() => parseTasteDistillerResponse({ tasteProfile: profile })).toThrow(
      /riskAppetite must be one of/,
    );
  });

  it('validates string arrays have 1+ items each', () => {
    const profile = makeValidTasteProfile();
    profile['collisionPatterns'] = [];
    expect(() => parseTasteDistillerResponse({ tasteProfile: profile })).toThrow(
      /collisionPatterns must be a non-empty array/,
    );
  });

  it('rejects string arrays containing empty strings', () => {
    const profile = makeValidTasteProfile();
    profile['humanAnchors'] = ['valid', '  '];
    expect(() => parseTasteDistillerResponse({ tasteProfile: profile })).toThrow(
      /humanAnchors must be a non-empty array of non-empty strings/,
    );
  });

  it('rejects missing fields', () => {
    const profile = makeValidTasteProfile();
    delete profile['toneBlend'];
    expect(() => parseTasteDistillerResponse({ tasteProfile: profile })).toThrow(
      /toneBlend must be a non-empty array/,
    );
  });

  it('rejects non-object response', () => {
    expect(() => parseTasteDistillerResponse('not an object')).toThrow(/must be an object/);
  });

  it('rejects response missing tasteProfile', () => {
    expect(() => parseTasteDistillerResponse({ notTasteProfile: {} })).toThrow(
      /missing tasteProfile object/,
    );
  });

  it('rejects tasteProfile that is not an object', () => {
    expect(() => parseTasteDistillerResponse({ tasteProfile: 'string' })).toThrow(
      /missing tasteProfile object/,
    );
  });
});

describe('buildContentTasteDistillerSchema', () => {
  it('matches spec output shape with all 9 required fields', () => {
    const schema = buildContentTasteDistillerSchema();
    expect(schema.type).toBe('json_schema');
    expect(schema.json_schema.name).toBe('content_taste_distiller');

    const rootSchema = schema.json_schema.schema as Record<string, unknown>;
    expect(rootSchema['required']).toEqual(['tasteProfile']);

    const properties = rootSchema['properties'] as Record<string, unknown>;
    const tasteProfile = properties['tasteProfile'] as Record<string, unknown>;
    expect(tasteProfile['type']).toBe('object');

    const required = tasteProfile['required'] as string[];
    expect(required).toHaveLength(9);
    expect(required).toContain('collisionPatterns');
    expect(required).toContain('favoredMechanisms');
    expect(required).toContain('humanAnchors');
    expect(required).toContain('socialEngines');
    expect(required).toContain('toneBlend');
    expect(required).toContain('sceneAppetites');
    expect(required).toContain('antiPatterns');
    expect(required).toContain('surfaceDoNotRepeat');
    expect(required).toContain('riskAppetite');

    const profileProps = tasteProfile['properties'] as Record<string, Record<string, unknown>>;
    expect(profileProps['riskAppetite']['type']).toBe('string');
    expect(profileProps['riskAppetite']['enum']).toEqual(['LOW', 'MEDIUM', 'HIGH', 'MAXIMAL']);

    for (const arrayField of [
      'collisionPatterns',
      'favoredMechanisms',
      'humanAnchors',
      'socialEngines',
      'toneBlend',
      'sceneAppetites',
      'antiPatterns',
      'surfaceDoNotRepeat',
    ]) {
      expect(profileProps[arrayField]['type']).toBe('array');
      expect((profileProps[arrayField]['items'] as Record<string, unknown>)['type']).toBe('string');
    }
  });
});

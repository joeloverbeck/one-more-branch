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
}));

jest.mock('../../../src/llm/retry.js', () => ({
  withRetry: <T>(fn: () => Promise<T>): Promise<T> => fn(),
}));

import { getConfig } from '../../../src/config/index';
import { ENTITY_DECOMPOSITION_SCHEMA } from '../../../src/llm/schemas/entity-decomposer-schema';
import { decomposeEntities } from '../../../src/llm/entity-decomposer';
import type { EntityDecomposerContext } from '../../../src/llm/entity-decomposer-types';

interface CharacterPayload {
  name: string;
  speechFingerprint: {
    catchphrases: string[];
    vocabularyProfile: string;
    sentencePatterns: string;
    verbalTics: string[];
    dialogueSamples: string[];
  };
  coreTraits: string[];
  motivations: string;
  relationships: string[];
  knowledgeBoundaries: string;
  appearance: string;
}

interface WorldFactPayload {
  domain: string;
  fact: string;
  scope: string;
}

function createValidPayload(): { characters: CharacterPayload[]; worldFacts: WorldFactPayload[] } {
  return {
    characters: [
      {
        name: 'Kael',
        speechFingerprint: {
          catchphrases: ['Steel remembers'],
          vocabularyProfile: 'Terse military vocabulary, clipped sentences',
          sentencePatterns: 'Short declarative statements, rarely questions',
          verbalTics: ['clicks tongue when thinking'],
          dialogueSamples: ['Steel remembers what flesh forgets.', 'Move. Now.'],
        },
        coreTraits: ['stoic', 'loyal', 'haunted'],
        motivations: 'Seeks redemption for a betrayal that cost lives',
        relationships: ['Former commander of the Iron Guard', 'Distrusts the tribunal'],
        knowledgeBoundaries: 'Knows military tactics but ignorant of court politics',
        appearance: 'Tall, scarred face, missing two fingers on left hand',
      },
      {
        name: 'Mirela',
        speechFingerprint: {
          catchphrases: ['The cards never lie, darling'],
          vocabularyProfile: 'Flowery, theatrical, uses endearments',
          sentencePatterns: 'Long winding sentences with dramatic pauses',
          verbalTics: ['hums before delivering bad news'],
          dialogueSamples: [
            'The cards never lie, darling... though they do enjoy a riddle.',
            'Oh, sweetling, you have no idea.',
          ],
        },
        coreTraits: ['cunning', 'theatrical', 'compassionate'],
        motivations: 'Protect her travelling troupe from the war',
        relationships: ['Romantic tension with Kael', 'Secretly works for the resistance'],
        knowledgeBoundaries: 'Knows underground networks but not military strategy',
        appearance: 'Dark curly hair, colorful scarves, bright eyes',
      },
    ],
    worldFacts: [
      {
        domain: 'society',
        fact: 'The tribunal controls all justice in the city',
        scope: 'Capital city',
      },
      {
        domain: 'magic',
        fact: 'Blood runes can bind oaths that kill the oath-breaker',
        scope: 'Worldwide',
      },
      {
        domain: 'geography',
        fact: 'The Ashfen marshes surround the eastern approach to the capital',
        scope: 'Eastern region',
      },
    ],
  };
}

function createMinimalContext(): EntityDecomposerContext {
  return {
    characterConcept: 'A disgraced guard seeking redemption.',
    worldbuilding: 'A dark fantasy city ruled by a corrupt tribunal.',
    tone: 'Grimdark fantasy',
    npcs: [{ name: 'Mirela', description: 'A fortune teller with secrets.' }],
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

describe('decomposeEntities', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends correct request structure to OpenRouter', async () => {
    const payload = createValidPayload();
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const context = createMinimalContext();
    await decomposeEntities(context, 'test-key');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (globalThis.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('openrouter');

    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body['response_format']).toEqual(ENTITY_DECOMPOSITION_SCHEMA);
    expect(body['model']).toBe(getConfig().llm.defaultModel);
    expect(options.headers).toHaveProperty('Authorization', 'Bearer test-key');
  });

  it('parses a valid response into DecomposedCharacter[] and DecomposedWorld', async () => {
    const payload = createValidPayload();
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const context = createMinimalContext();
    const result = await decomposeEntities(context, 'test-key');

    expect(result.decomposedCharacters).toHaveLength(2);

    const protagonist = result.decomposedCharacters[0]!;
    expect(protagonist.name).toBe('Kael');
    expect(protagonist.rawDescription).toBe(context.characterConcept);
    expect(protagonist.speechFingerprint.catchphrases).toEqual(['Steel remembers']);
    expect(protagonist.speechFingerprint.vocabularyProfile).toBe(
      'Terse military vocabulary, clipped sentences'
    );
    expect(protagonist.coreTraits).toEqual(['stoic', 'loyal', 'haunted']);

    const npc = result.decomposedCharacters[1]!;
    expect(npc.name).toBe('Mirela');
    expect(npc.rawDescription).toBe('A fortune teller with secrets.');

    expect(result.decomposedWorld.facts).toHaveLength(3);
    expect(result.decomposedWorld.facts[0]!.domain).toBe('society');
    expect(result.decomposedWorld.rawWorldbuilding).toBe(context.worldbuilding);
  });

  it('maps rawDescription from characterConcept for protagonist (index 0)', async () => {
    const payload = createValidPayload();
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const context = createMinimalContext();
    const result = await decomposeEntities(context, 'test-key');

    expect(result.decomposedCharacters[0]!.rawDescription).toBe(context.characterConcept);
  });

  it('maps rawDescription from NPC description for index > 0', async () => {
    const payload = createValidPayload();
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const context = createMinimalContext();
    const result = await decomposeEntities(context, 'test-key');

    expect(result.decomposedCharacters[1]!.rawDescription).toBe('A fortune teller with secrets.');
  });

  it('defaults invalid world fact domains to custom', async () => {
    const payload = createValidPayload();
    payload.worldFacts[0]!.domain = 'INVALID_DOMAIN';
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedWorld.facts[0]!.domain).toBe('custom');
  });

  it('skips world facts with empty fact text', async () => {
    const payload = createValidPayload();
    payload.worldFacts.push({ domain: 'history', fact: '', scope: 'Everywhere' });
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    // Original 3 facts, the empty one is skipped
    expect(result.decomposedWorld.facts).toHaveLength(3);
  });

  it('handles missing optional speech fingerprint arrays gracefully', async () => {
    const payload = createValidPayload();
    // Remove optional arrays from first character's speech fingerprint
    const fp = payload.characters[0]!.speechFingerprint;
    (fp as Record<string, unknown>)['catchphrases'] = undefined;
    (fp as Record<string, unknown>)['verbalTics'] = undefined;
    (fp as Record<string, unknown>)['dialogueSamples'] = undefined;
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    const speech = result.decomposedCharacters[0]!.speechFingerprint;
    expect(speech.catchphrases).toEqual([]);
    expect(speech.verbalTics).toEqual([]);
    expect(speech.dialogueSamples).toEqual([]);
  });

  it('throws on empty characters array', async () => {
    const payload = { characters: [], worldFacts: [] };
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    await expect(decomposeEntities(createMinimalContext(), 'test-key')).rejects.toThrow(
      /at least the protagonist/
    );
  });

  it('throws on character without name', async () => {
    const payload = createValidPayload();
    (payload.characters[0] as unknown as Record<string, unknown>)['name'] = '';
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    await expect(decomposeEntities(createMinimalContext(), 'test-key')).rejects.toThrow(
      /missing name/
    );
  });

  it('throws on HTTP error', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Internal error' } }),
      text: () => Promise.resolve('Internal error'),
    });

    await expect(decomposeEntities(createMinimalContext(), 'test-key')).rejects.toThrow();
  });

  it('includes rawResponse in result', async () => {
    const payload = createValidPayload();
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.rawResponse).toBeTruthy();
    expect(typeof result.rawResponse).toBe('string');
  });
});

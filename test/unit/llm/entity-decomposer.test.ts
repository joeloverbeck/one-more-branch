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
    metaphorFrames: string;
    antiExamples: string[];
    discourseMarkers: string[];
    registerShifts: string;
  };
  coreTraits: string[];
  motivations: string;
  relationships: string[];
  knowledgeBoundaries: string;
  appearance: string;
  decisionPattern: string;
  coreBeliefs: string[];
  conflictPriority: string;
  falseBeliefs: string[];
  secretsKept: string[];
}

interface WorldFactPayload {
  domain: string;
  fact: string;
  scope: string;
  factType?: string;
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
          metaphorFrames: 'Treats conflict as siegecraft where patience buys advantage.',
          antiExamples: ['My dearest, let us muse on destiny together.'],
          discourseMarkers: ['Look,', 'Bottom line:'],
          registerShifts: 'Stays clipped in public, becomes blunt profanity under stress.',
        },
        coreTraits: ['stoic', 'loyal', 'haunted'],
        motivations: 'Seeks redemption for a betrayal that cost lives',
        relationships: ['Former commander of the Iron Guard', 'Distrusts the tribunal'],
        knowledgeBoundaries: 'Knows military tactics but ignorant of court politics',
        appearance: 'Tall, scarred face, missing two fingers on left hand',
        decisionPattern: 'Delays commitment until data is sufficient, then executes decisively.',
        coreBeliefs: ['Mercy without leverage is suicide', 'Promises outlive people'],
        conflictPriority: 'Protect civilians over reputation.',
        falseBeliefs: ['Believes the old commander died honorably'],
        secretsKept: ['Knows the location of the hidden armory'],
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
          metaphorFrames: 'Sees social life as theater and secrets as currency.',
          antiExamples: ['Proceed to objective point alpha.'],
          discourseMarkers: ['Anyway,', 'No, wait-'],
          registerShifts: 'Performs in crowds, speaks quietly and directly in private.',
        },
        coreTraits: ['cunning', 'theatrical', 'compassionate'],
        motivations: 'Protect her travelling troupe from the war',
        relationships: ['Romantic tension with Kael', 'Secretly works for the resistance'],
        knowledgeBoundaries: 'Knows underground networks but not military strategy',
        appearance: 'Dark curly hair, colorful scarves, bright eyes',
        decisionPattern: 'Runs social probes first, commits after reading room dynamics.',
        coreBeliefs: ['Information is safer than steel', 'Debt is a leash'],
        conflictPriority: 'Protect the troupe above political outcomes.',
        falseBeliefs: [],
        secretsKept: ['Secretly works for the resistance'],
      },
    ],
    worldFacts: [
      {
        domain: 'society',
        fact: 'The tribunal controls all justice in the city',
        scope: 'Capital city',
        factType: 'LAW',
      },
      {
        domain: 'magic',
        fact: 'Blood runes can bind oaths that kill the oath-breaker',
        scope: 'Worldwide',
        factType: 'LAW',
      },
      {
        domain: 'geography',
        fact: 'The Ashfen marshes surround the eastern approach to the capital',
        scope: 'Eastern region',
        factType: 'LAW',
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
    expect(protagonist.speechFingerprint.metaphorFrames).toContain('siegecraft');
    expect(protagonist.speechFingerprint.antiExamples).toHaveLength(1);
    expect(protagonist.speechFingerprint.discourseMarkers).toContain('Look,');
    expect(protagonist.speechFingerprint.registerShifts).toContain('public');
    expect(protagonist.coreTraits).toEqual(['stoic', 'loyal', 'haunted']);
    expect(protagonist.decisionPattern).toContain('decisively');
    expect(protagonist.coreBeliefs).toContain('Promises outlive people');
    expect(protagonist.conflictPriority).toContain('civilians');

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

  it('defaults invalid world fact domains to culture', async () => {
    const payload = createValidPayload();
    payload.worldFacts[0]!.domain = 'INVALID_DOMAIN';
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedWorld.facts[0]!.domain).toBe('culture');
  });

  it('accepts custom domain from existing stories (backward compat)', async () => {
    const payload = createValidPayload();
    payload.worldFacts[0]!.domain = 'custom';
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedWorld.facts[0]!.domain).toBe('custom');
  });

  it.each([
    'ecology',
    'culture',
    'religion',
    'governance',
    'economy',
    'language',
  ])('parses new domain %s correctly', async (newDomain) => {
    const payload = createValidPayload();
    payload.worldFacts[0]!.domain = newDomain;
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedWorld.facts[0]!.domain).toBe(newDomain);
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
    (fp as Record<string, unknown>)['antiExamples'] = undefined;
    (fp as Record<string, unknown>)['discourseMarkers'] = undefined;
    (fp as Record<string, unknown>)['metaphorFrames'] = undefined;
    (fp as Record<string, unknown>)['registerShifts'] = undefined;
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    const speech = result.decomposedCharacters[0]!.speechFingerprint;
    expect(speech.catchphrases).toEqual([]);
    expect(speech.verbalTics).toEqual([]);
    expect(speech.dialogueSamples).toEqual([]);
    expect(speech.antiExamples).toEqual([]);
    expect(speech.discourseMarkers).toEqual([]);
    expect(speech.metaphorFrames).toBe('');
    expect(speech.registerShifts).toBe('');
  });

  it('parses new voice and agency fields from valid payloads', async () => {
    const payload = createValidPayload();
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    const speech = result.decomposedCharacters[0]!.speechFingerprint;

    expect(speech.metaphorFrames).toBe(
      'Treats conflict as siegecraft where patience buys advantage.'
    );
    expect(speech.antiExamples).toEqual(['My dearest, let us muse on destiny together.']);
    expect(speech.discourseMarkers).toEqual(['Look,', 'Bottom line:']);
    expect(speech.registerShifts).toBe('Stays clipped in public, becomes blunt profanity under stress.');
    expect(result.decomposedCharacters[0]!.decisionPattern).toContain('Delays commitment');
    expect(result.decomposedCharacters[0]!.coreBeliefs).toEqual([
      'Mercy without leverage is suicide',
      'Promises outlive people',
    ]);
    expect(result.decomposedCharacters[0]!.conflictPriority).toBe('Protect civilians over reputation.');
  });

  it('parses falseBeliefs and secretsKept from valid payloads', async () => {
    const payload = createValidPayload();
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    const protagonist = result.decomposedCharacters[0]!;
    expect(protagonist.falseBeliefs).toEqual(['Believes the old commander died honorably']);
    expect(protagonist.secretsKept).toEqual(['Knows the location of the hidden armory']);

    const npc = result.decomposedCharacters[1]!;
    expect(npc.falseBeliefs).toEqual([]);
    expect(npc.secretsKept).toEqual(['Secretly works for the resistance']);
  });

  it('defaults falseBeliefs and secretsKept to [] when missing from LLM response', async () => {
    const payload = createValidPayload();
    const firstChar = payload.characters[0] as unknown as Record<string, unknown>;
    delete firstChar['falseBeliefs'];
    delete firstChar['secretsKept'];
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedCharacters[0]!.falseBeliefs).toEqual([]);
    expect(result.decomposedCharacters[0]!.secretsKept).toEqual([]);
  });

  it('defaults falseBeliefs and secretsKept to [] when malformed', async () => {
    const payload = createValidPayload();
    const firstChar = payload.characters[0] as unknown as Record<string, unknown>;
    firstChar['falseBeliefs'] = 'not an array';
    firstChar['secretsKept'] = 42;
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedCharacters[0]!.falseBeliefs).toEqual([]);
    expect(result.decomposedCharacters[0]!.secretsKept).toEqual([]);
  });

  it('defaults new fields when malformed values are returned by the LLM', async () => {
    const payload = createValidPayload();
    const firstCharacter = payload.characters[0] as unknown as Record<string, unknown>;
    const speech = firstCharacter['speechFingerprint'] as Record<string, unknown>;
    speech['metaphorFrames'] = 99;
    speech['antiExamples'] = 'invalid';
    speech['discourseMarkers'] = { bad: true };
    speech['registerShifts'] = false;
    firstCharacter['decisionPattern'] = ['invalid'];
    firstCharacter['coreBeliefs'] = 'invalid';
    firstCharacter['conflictPriority'] = { nope: true };

    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    const parsed = result.decomposedCharacters[0]!;

    expect(parsed.speechFingerprint.metaphorFrames).toBe('');
    expect(parsed.speechFingerprint.antiExamples).toEqual([]);
    expect(parsed.speechFingerprint.discourseMarkers).toEqual([]);
    expect(parsed.speechFingerprint.registerShifts).toBe('');
    expect(parsed.decisionPattern).toBe('');
    expect(parsed.coreBeliefs).toEqual([]);
    expect(parsed.conflictPriority).toBe('');
  });

  it('parses valid factType values from world facts', async () => {
    const payload = createValidPayload();
    payload.worldFacts = [
      { domain: 'magic', fact: 'Iron disrupts magical fields', scope: 'Worldwide', factType: 'LAW' },
      { domain: 'religion', fact: 'The northern clans believe the old gods sleep', scope: 'North', factType: 'BELIEF' },
      { domain: 'society', fact: 'Tavern talk claims the duke poisoned his brother', scope: 'Capital', factType: 'RUMOR' },
      { domain: 'history', fact: 'No one knows what lies beyond the Veil', scope: 'Worldwide', factType: 'MYSTERY' },
      { domain: 'culture', fact: 'Merchants bow before entering the Exchange', scope: 'Trade district', factType: 'NORM' },
      { domain: 'history', fact: 'Historians disagree on the Sundering cause', scope: 'Worldwide', factType: 'DISPUTED' },
    ];
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedWorld.facts[0]!.factType).toBe('LAW');
    expect(result.decomposedWorld.facts[1]!.factType).toBe('BELIEF');
    expect(result.decomposedWorld.facts[2]!.factType).toBe('RUMOR');
    expect(result.decomposedWorld.facts[3]!.factType).toBe('MYSTERY');
    expect(result.decomposedWorld.facts[4]!.factType).toBe('NORM');
    expect(result.decomposedWorld.facts[5]!.factType).toBe('DISPUTED');
  });

  it('omits factType when missing from LLM response (backward compat)', async () => {
    const payload = createValidPayload();
    payload.worldFacts = [
      { domain: 'society', fact: 'Old fact without type', scope: 'General' },
    ];
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedWorld.facts[0]!.factType).toBeUndefined();
  });

  it('omits factType when invalid value is returned by LLM', async () => {
    const payload = createValidPayload();
    payload.worldFacts = [
      { domain: 'society', fact: 'Fact with bad type', scope: 'General', factType: 'INVALID' },
    ];
    globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(payload));

    const result = await decomposeEntities(createMinimalContext(), 'test-key');
    expect(result.decomposedWorld.facts[0]!.factType).toBeUndefined();
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

import { generateOpeningPage } from '../../../src/llm/client';

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
    id: 'or-integration',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('llm client integration (mocked fetch)', () => {
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

  it('should generate opening page with structured output', async () => {
    const structured = {
      narrative:
        'You step into the observatory and frozen constellations begin to move as though the sky has noticed your arrival and now waits for your command.',
      choices: ['Consult the brass star map', 'Climb to the highest platform'],
      stateChangesAdded: ['Entered the abandoned observatory'],
      stateChangesRemoved: [],
      newCanonFacts: ['The observatory responds to bloodline magic'],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      beatConcluded: false,
      beatResolution: '',
    };

    fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(structured)));

    const result = await generateOpeningPage(
      {
        characterConcept: 'A disgraced astronomer',
        worldbuilding: 'A city where the night sky has stopped moving',
        tone: 'mythic science fantasy',
      },
      { apiKey: 'test-key' },
    );

    expect(result.narrative.length).toBeGreaterThan(100);
    expect(result.choices.length).toBeGreaterThanOrEqual(2);
    expect(result.choices.length).toBeLessThanOrEqual(5);
    expect(result.isEnding).toBe(false);
    expect(result.beatConcluded).toBe(false);
    expect(result.beatResolution).toBe('');
  });

  it('should enforce choice constraints via Zod validation', async () => {
    const invalidStructured = {
      narrative:
        'You step into the observatory and frozen constellations begin to move as though the sky has noticed your arrival and now waits for your command.',
      choices: ['Consult the brass star map', 'consult the brass star map'],
      stateChangesAdded: ['Entered the abandoned observatory'],
      stateChangesRemoved: [],
      newCanonFacts: ['The observatory responds to bloodline magic'],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      isEnding: false,
      beatConcluded: false,
      beatResolution: '',
    };

    fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(invalidStructured)));

    const promise = generateOpeningPage(
      {
        characterConcept: 'A disgraced astronomer',
        worldbuilding: 'A city where the night sky has stopped moving',
        tone: 'mythic science fantasy',
      },
      { apiKey: 'test-key' },
    );

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    // Advance through retry delays: 1000ms then 2000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
  });
});

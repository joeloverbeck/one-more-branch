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
}));

import { generateAccountantWithFallback } from '../../../src/llm/accountant-generation';
import type { ChatMessage } from '../../../src/llm/llm-client-types';

const accountantMessages: ChatMessage[] = [
  {
    role: 'system',
    content: 'You are an accountant.',
  },
  {
    role: 'user',
    content: 'Return valid state intents.',
  },
];

const validAccountantPayload = {
  stateIntents: {
    currentLocation: 'Archive access corridor',
    threats: {
      add: [{ text: 'A patrol rounds the corridor.', threatType: 'HOSTILE_AGENT' }],
      removeIds: [],
    },
    constraints: {
      add: [{ text: 'Lantern oil is almost gone.', constraintType: 'ENVIRONMENTAL' }],
      removeIds: [],
    },
    threads: {
      add: [
        {
          text: 'Reach the archive door before lockout.',
          threadType: 'QUEST',
          urgency: 'HIGH',
        },
      ],
      resolveIds: [],
    },
    inventory: { add: ['A bent lockpick'], removeIds: [] },
    health: { add: ['A fresh bruise on the shoulder'], removeIds: [] },
    characterState: {
      add: [{ characterName: 'Mara', states: ['Focused under pressure'] }],
      removeIds: [],
    },
    canon: { worldAdd: ['The archive lockout triggers at moonset.'], characterAdd: [] },
  },
};

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('accountant-generation', () => {
  const fetchMock: jest.MockedFunction<typeof fetch> = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    mockLogger.error.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function responseWithStructuredContent(content: string): Response {
    return createJsonResponse(200, {
      id: 'or-1',
      choices: [{ message: { content }, finish_reason: 'stop' }],
    });
  }

  it('calls OpenRouter with accountant response format and returns a validated result', async () => {
    fetchMock.mockResolvedValue(
      responseWithStructuredContent(JSON.stringify(validAccountantPayload))
    );

    const result = await generateAccountantWithFallback(accountantMessages, {
      apiKey: 'test-key',
    });

    expect(result.stateIntents.currentLocation).toBe('Archive access corridor');
    expect(result.stateIntents.threads.add).toHaveLength(1);
    const firstCall = fetchMock.mock.calls[0];
    const init = firstCall?.[1];
    const body =
      typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    const responseFormat = body['response_format'] as { json_schema?: { name?: string } };
    expect(responseFormat.json_schema?.name).toBe('state_accountant');
  });
});

/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import type { Request, Response } from 'express';

const mockChatService = {
  listChats: jest.fn(),
  createChat: jest.fn(),
  resumeChat: jest.fn(),
  sendTurn: jest.fn(),
  deleteChat: jest.fn(),
};

const mockGenerationProgressService = {
  start: jest.fn(),
  markStageStarted: jest.fn(),
  markStageCompleted: jest.fn(),
  complete: jest.fn(),
  fail: jest.fn(),
};

jest.mock('@/server/services', () => ({
  chatService: mockChatService,
  generationProgressService: mockGenerationProgressService,
}));

jest.mock('@/logging', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { LLMError } from '@/llm';
import { chatRoutes } from '@/server/routes/chat';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post' | 'delete',
  path: string
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (chatRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method]
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found`);
  }

  return handler;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function createSession(): Record<string, unknown> {
  return {
    id: 'chat-1',
    createdAt: '2026-03-27T09:00:00.000Z',
    updatedAt: '2026-03-27T09:02:00.000Z',
    targetCharacterId: 'target-1',
    interlocutorCharacterId: 'interlocutor-1',
    targetCharacterName: 'Mara',
    interlocutorCharacterName: 'Iven',
    physicalContext: {
      location: 'Archive',
      microLocation: 'Reading alcove',
      timeOfDay: 'EVENING',
      privacy: 'PRIVATE',
      distanceBand: 'CONVERSATIONAL',
      characterActivity: 'Cataloguing ledgers',
      interactableObjects: ['ledger'],
      ambientConditions: ['rain'],
    },
    leadInContext: {
      leadInSummary: 'They meet after the raid.',
      recentEvents: ['A witness vanished.'],
      whyNow: 'The ledger must be found before dawn.',
    },
    chatBible: null,
    turnCount: 2,
    rollingSummary: null,
    relationshipState: {
      dynamic: 'strained allies',
      valence: -1,
      tension: 6,
      leverage: 'Shared guilt',
    },
    knowledgeState: {
      knownFacts: [],
      suspicions: [],
      falseBeliefs: [],
      secretsRevealed: [],
    },
  };
}

function createCharacterTurn(): Record<string, unknown> {
  return {
    turnNumber: 2,
    speaker: 'CHARACTER' as const,
    blocks: [{ type: 'SPEECH' as const, text: 'You already know enough.' }],
    turnMeta: {
      expectsReply: true,
      endsWithQuestion: false,
      visibleEmotion: 'guarded',
      finalPressure: null,
    },
    plannerOutput: {
      internalSelfCheck: {
        whatDoIWant: 'Keep control.',
        whatDoIKnow: 'Enough.',
        whatAmIHiding: 'The copy.',
        howHonestAmI: 'Partially.',
      },
      responseGoal: 'Deflect.',
      speechAct: 'DEFLECT' as const,
      honestyMode: 'PARTIAL' as const,
      surfaceEmotion: 'calm',
      suppressedEmotion: 'fear',
      subtext: 'Back off.',
      mustAddress: ['The ledger'],
      mustAvoid: ['The copy'],
      blockPlan: ['SPEECH'] as const,
      actionPlan: [],
      questionBack: null,
      targetLength: 'SHORT' as const,
      expectedImpact: {
        relationshipDeltaHint: 0,
        tensionDeltaHint: 1,
        revealsSecret: false,
      },
    },
    stateUpdate: {
      summaryDelta: 'The tension rises.',
      relationshipShifts: [],
      knowledgeChanges: {
        newKnownFacts: [],
        newSuspicions: ['He is still hiding something.'],
        falseBeliefsCorrected: [],
        secretsRevealed: [],
      },
      conversationUpdate: {
        commitmentsMade: [],
        threatsMade: [],
        questionsOpened: ['Who moved the ledger?'],
        questionsResolved: [],
      },
      physicalStateUpdate: {
        locationChanged: false,
        newLocation: null,
        newMicroLocation: null,
        newDistanceBand: null,
        objectStateChanges: [],
      },
      shouldRefreshChatBible: false,
      shouldTriggerSummary: false,
    },
    timestamp: '2026-03-27T09:02:00.000Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockChatService.listChats.mockResolvedValue([]);
  mockChatService.createChat.mockResolvedValue(createSession());
  mockChatService.resumeChat.mockResolvedValue({
    session: createSession(),
    turns: [
      {
        turnNumber: 1,
        speaker: 'USER',
        blocks: [{ type: 'SPEECH', text: 'Tell me what happened.' }],
        rawText: 'Tell me what happened.',
        timestamp: '2026-03-27T09:01:00.000Z',
      },
      createCharacterTurn(),
    ],
  });
  mockChatService.sendTurn.mockResolvedValue({
    characterTurn: createCharacterTurn(),
    updatedSession: createSession(),
    bibleWasRefreshed: false,
    summaryWasGenerated: false,
  });
  mockChatService.deleteChat.mockResolvedValue(undefined);
});

describe('chat routes', () => {
  it('GET / renders the chat list page with chats', async () => {
    const chats = [
      {
        id: 'chat-1',
        targetCharacterName: 'Mara',
        interlocutorCharacterName: 'Iven',
        turnCount: 2,
        updatedAt: '2026-03-27T09:02:00.000Z',
        location: 'Archive',
      },
    ];
    mockChatService.listChats.mockResolvedValue(chats);

    const handler = getRouteHandler('get', '/');
    const res = mockRes();

    void handler(mockReq(), res);
    await flushPromises();

    expect(mockChatService.listChats).toHaveBeenCalledTimes(1);
    expect(res.render).toHaveBeenCalledWith('pages/chat-list', {
      title: 'Character Chats - One More Branch',
      chats,
    });
  });

  it('GET /new renders the chat setup page shell', async () => {
    const handler = getRouteHandler('get', '/new');
    const res = mockRes();

    void handler(mockReq(), res);
    await flushPromises();

    expect(res.render).toHaveBeenCalledWith('pages/chat-new', {
      title: 'New Character Chat - One More Branch',
    });
  });

  it('POST / normalizes form data into createChat params and redirects', async () => {
    const handler = getRouteHandler('post', '/');
    const req = mockReq({
      body: {
        targetCharacterId: ' target-1 ',
        interlocutorCharacterId: ' interlocutor-1 ',
        location: ' Archive ',
        microLocation: ' Reading alcove ',
        timeOfDay: 'EVENING',
        privacy: 'PRIVATE',
        distanceBand: 'CONVERSATIONAL',
        characterActivity: ' Cataloguing ledgers ',
        interactableObjects: ' ledger, lamp ',
        ambientConditions: ' rain, dust ',
        leadInSummary: ' They meet after the raid. ',
        recentEvents: 'A witness vanished.\nThe gate stayed open.',
        whyNow: ' The ledger must be found before dawn. ',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockChatService.createChat).toHaveBeenCalledWith({
      targetCharacterId: 'target-1',
      interlocutorCharacterId: 'interlocutor-1',
      physicalContext: {
        location: 'Archive',
        microLocation: 'Reading alcove',
        timeOfDay: 'EVENING',
        privacy: 'PRIVATE',
        distanceBand: 'CONVERSATIONAL',
        characterActivity: 'Cataloguing ledgers',
        interactableObjects: ['ledger', 'lamp'],
        ambientConditions: ['rain', 'dust'],
      },
      leadInContext: {
        leadInSummary: 'They meet after the raid.',
        recentEvents: ['A witness vanished.', 'The gate stayed open.'],
        whyNow: 'The ledger must be found before dawn.',
      },
    });
    expect(res.redirect).toHaveBeenCalledWith('/chat/chat-1');
  });

  it('POST / returns a rendered validation error when required create fields are missing', async () => {
    const handler = getRouteHandler('post', '/');
    const req = mockReq({
      body: {
        interlocutorCharacterId: 'interlocutor-1',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockChatService.createChat).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith('pages/error', {
      title: 'Error',
      message: 'targetCharacterId is required',
    });
  });

  it('GET /:chatId renders the chat page with session and turns', async () => {
    const handler = getRouteHandler('get', '/:chatId');
    const req = mockReq({ params: { chatId: 'chat-1' } });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockChatService.resumeChat).toHaveBeenCalledWith('chat-1');
    expect(res.render).toHaveBeenCalledWith(
      'pages/chat',
      expect.objectContaining({
        title: 'Chat with Mara - One More Branch',
        session: expect.objectContaining({ id: 'chat-1' }),
        turns: expect.any(Array),
      })
    );
  });

  it('GET /:chatId renders a 404 error page when the chat is missing', async () => {
    mockChatService.resumeChat.mockRejectedValue(new Error('Chat not found: missing-chat'));

    const handler = getRouteHandler('get', '/:chatId');
    const req = mockReq({ params: { chatId: 'missing-chat' } });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('pages/error', {
      title: 'Error',
      message: 'Chat not found: missing-chat',
    });
  });

  it('POST /:chatId/turn rejects empty messages', async () => {
    const handler = getRouteHandler('post', '/:chatId/turn');
    const req = mockReq({
      params: { chatId: 'chat-1' },
      body: { message: '   ', apiKey: 'valid-api-key-12345' },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockChatService.sendTurn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'message is required' });
  });

  it('POST /:chatId/turn rejects messages longer than 2000 characters', async () => {
    const handler = getRouteHandler('post', '/:chatId/turn');
    const req = mockReq({
      params: { chatId: 'chat-1' },
      body: { message: 'x'.repeat(2001), apiKey: 'valid-api-key-12345' },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockChatService.sendTurn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'message must be 2000 characters or fewer',
    });
  });

  it('POST /:chatId/turn rejects a missing or trivial API key', async () => {
    const handler = getRouteHandler('post', '/:chatId/turn');
    const req = mockReq({
      params: { chatId: 'chat-1' },
      body: { message: 'Tell me what happened.', apiKey: 'short' },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockChatService.sendTurn).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'OpenRouter API key is required',
    });
  });

  it('POST /:chatId/turn wires shared progress and returns the pipeline result', async () => {
    const handler = getRouteHandler('post', '/:chatId/turn');
    const req = mockReq({
      params: { chatId: 'chat-1' },
      body: {
        message: ' Tell me what happened. ',
        apiKey: ' valid-api-key-12345 ',
        progressId: ' chat-progress-1 ',
        isSessionResume: 'true',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockGenerationProgressService.start).toHaveBeenCalledWith(
      'chat-progress-1',
      'chat-turn-generation'
    );
    expect(mockChatService.sendTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 'chat-1',
        userMessage: 'Tell me what happened.',
        apiKey: 'valid-api-key-12345',
        isSessionResume: true,
        onGenerationStage: expect.any(Function),
      })
    );
    expect(mockGenerationProgressService.complete).toHaveBeenCalledWith('chat-progress-1');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        progressId: 'chat-progress-1',
        characterTurn: expect.any(Object),
        updatedSession: expect.any(Object),
      })
    );
  });

  it('POST /:chatId/turn maps missing chats to 404 and fails progress', async () => {
    mockChatService.sendTurn.mockRejectedValue(new Error('Chat not found: missing-chat'));

    const handler = getRouteHandler('post', '/:chatId/turn');
    const req = mockReq({
      params: { chatId: 'missing-chat' },
      body: {
        message: 'Tell me what happened.',
        apiKey: 'valid-api-key-12345',
        progressId: 'chat-progress-404',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockGenerationProgressService.fail).toHaveBeenCalledWith(
      'chat-progress-404',
      'Chat not found: missing-chat'
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Chat not found: missing-chat',
    });
  });

  it('POST /:chatId/turn maps LLM failures to the standard route payload', async () => {
    mockChatService.sendTurn.mockRejectedValue(
      new LLMError('Model failed', 'MODEL_FAILURE', true)
    );

    const handler = getRouteHandler('post', '/:chatId/turn');
    const req = mockReq({
      params: { chatId: 'chat-1' },
      body: {
        message: 'Tell me what happened.',
        apiKey: 'valid-api-key-12345',
        progressId: 'chat-progress-500',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockGenerationProgressService.fail).toHaveBeenCalledWith(
      'chat-progress-500',
      'API error: Model failed'
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'API error: Model failed',
      })
    );
  });

  it('DELETE /:chatId deletes the chat and returns success JSON', async () => {
    const handler = getRouteHandler('delete', '/:chatId');
    const req = mockReq({ params: { chatId: 'chat-1' } });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(mockChatService.deleteChat).toHaveBeenCalledWith('chat-1');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('registers the full chat route surface through wrapAsyncRoute handlers', () => {
    const routeLayers = (chatRoutes.stack as unknown as RouteLayer[]).filter((layer) => layer.route);
    expect(routeLayers.length).toBe(6);
  });
});

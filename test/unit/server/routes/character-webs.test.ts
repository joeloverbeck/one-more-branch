/* eslint-disable @typescript-eslint/unbound-method */
import type { Request, Response } from 'express';

import { EngineError } from '@/engine/types';

jest.mock('@/server/services', () => ({
  characterWebService: {
    listWebs: jest.fn(),
    loadWeb: jest.fn(),
    createWeb: jest.fn(),
    generateWeb: jest.fn(),
    regenerateWeb: jest.fn(),
    deleteWeb: jest.fn(),
    listCharactersForWeb: jest.fn(),
    initializeCharacter: jest.fn(),
    generateCharacterStage: jest.fn(),
    regenerateCharacterStage: jest.fn(),
    loadCharacter: jest.fn(),
    deleteCharacter: jest.fn(),
  },
  generationProgressService: {
    start: jest.fn(),
    markStageStarted: jest.fn(),
    markStageCompleted: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
  },
}));

jest.mock('@/logging', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logPrompt: jest.fn(),
  logResponse: jest.fn(),
}));

import { LLMError } from '@/llm/llm-client-types';
import type {
  CastPipelineInputs,
  CastRoleAssignment,
  RelationshipArchetype,
} from '@/models/character-pipeline-types';
import type { SavedCharacterWeb } from '@/models/saved-character-web';
import type { SavedDevelopedCharacter } from '@/models/saved-developed-character';
import { characterWebRoutes } from '@/server/routes/character-webs';
import { characterWebService, generationProgressService } from '@/server/services';

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
  const layer = (characterWebRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method]
  );
  const handler = layer?.route?.stack?.[0]?.handle;
  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found`);
  }
  return handler;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
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
    end: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function createInputs(overrides: Partial<CastPipelineInputs> = {}): CastPipelineInputs {
  return {
    kernelSummary: 'A revenge story about inherited guilt.',
    conceptSummary: 'A fugitive captain leads an impossible expedition.',
    userNotes: 'Keep everyone dangerous.',
    ...overrides,
  };
}

function createAssignment(overrides: Partial<CastRoleAssignment> = {}): CastRoleAssignment {
  return {
    characterName: 'Iria Vale',
    isProtagonist: true,
    storyFunction: 'CATALYST',
    characterDepth: 'ROUND',
    narrativeRole: 'A disgraced navigator chasing a vanished map.',
    conflictRelationship: 'Needs allies but distrusts every dependency.',
    ...overrides,
  } as CastRoleAssignment;
}

function createArchetypes(
  overrides: Partial<RelationshipArchetype> = {}
): readonly RelationshipArchetype[] {
  return [
    {
      fromCharacter: 'Iria Vale',
      toCharacter: 'Mara Voss',
      relationshipType: 'RIVAL',
      valence: 'AMBIVALENT',
      essentialTension: 'They need each other to survive, but neither can stand surrender.',
      ...overrides,
    } as RelationshipArchetype,
  ];
}

function createWeb(overrides: Partial<SavedCharacterWeb> = {}): SavedCharacterWeb {
  return {
    id: 'web-1',
    name: 'Shattered Compass',
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:00.000Z',
    sourceConceptId: 'concept-1',
    protagonistName: 'Iria Vale',
    inputs: createInputs(),
    assignments: [createAssignment()],
    relationshipArchetypes: createArchetypes(),
    castDynamicsSummary: 'Trust is survival and poison in equal measure.',
    ...overrides,
  };
}

function createCharacter(
  overrides: Partial<SavedDevelopedCharacter> = {}
): SavedDevelopedCharacter {
  return {
    id: 'char-1',
    characterName: 'Iria Vale',
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:00.000Z',
    sourceWebId: 'web-1',
    sourceWebName: 'Shattered Compass',
    webContext: {
      assignment: createAssignment(),
      protagonistName: 'Iria Vale',
      relationshipArchetypes: createArchetypes(),
      castDynamicsSummary: 'Trust is survival and poison in equal measure.',
    },
    characterKernel: null,
    tridimensionalProfile: null,
    agencyModel: null,
    deepRelationships: null,
    textualPresentation: null,
    completedStages: [],
    ...overrides,
  };
}

describe('character-web routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET / renders the character-webs page shell', async () => {
    const handler = getRouteHandler('get', '/');
    const req = mockReq();
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.render).toHaveBeenCalledWith('pages/character-webs', {
      title: 'Character Webs - One More Branch',
      currentPath: '/character-webs',
    });
  });

  it('GET /api/list returns saved webs', async () => {
    (characterWebService.listWebs as jest.Mock).mockResolvedValue([createWeb()]);

    const handler = getRouteHandler('get', '/api/list');
    const req = mockReq();
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(characterWebService.listWebs).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ success: true, webs: [createWeb()] });
  });

  it('GET /api/:webId returns the web with its current developed characters', async () => {
    const web = createWeb();
    const character = createCharacter();
    (characterWebService.loadWeb as jest.Mock).mockResolvedValue(web);
    (characterWebService.listCharactersForWeb as jest.Mock).mockResolvedValue([character]);

    const handler = getRouteHandler('get', '/api/:webId');
    const req = mockReq({ params: { webId: 'web-1' } });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(characterWebService.loadWeb).toHaveBeenCalledWith('web-1');
    expect(characterWebService.listCharactersForWeb).toHaveBeenCalledWith('web-1');
    expect(res.json).toHaveBeenCalledWith({ success: true, web, characters: [character] });
  });

  it('GET /api/:webId returns 404 when the web is missing', async () => {
    (characterWebService.loadWeb as jest.Mock).mockResolvedValue(null);

    const handler = getRouteHandler('get', '/api/:webId');
    const req = mockReq({ params: { webId: 'missing-web' } });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Character web not found: missing-web',
    });
  });

  it('POST /api/create creates a metadata-only web with sourceConceptId', async () => {
    const web = createWeb();
    (characterWebService.createWeb as jest.Mock).mockResolvedValue(web);

    const handler = getRouteHandler('post', '/api/create');
    const req = mockReq({
      body: {
        name: '  Shattered Compass  ',
        sourceConceptId: '  concept-1  ',
        userNotes: '  Keep everyone dangerous.  ',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(characterWebService.createWeb).toHaveBeenCalledWith(
      'Shattered Compass',
      'concept-1',
      'Keep everyone dangerous.',
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, web });
  });

  it('POST /api/create returns 400 when sourceConceptId is missing', async () => {
    const handler = getRouteHandler('post', '/api/create');
    const req = mockReq({
      body: { name: 'Test Web' },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(characterWebService.createWeb).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'sourceConceptId is required',
    });
  });

  it('POST /api/:webId/generate rejects missing API keys before touching progress tracking', async () => {
    const handler = getRouteHandler('post', '/api/:webId/generate');
    const req = mockReq({
      params: { webId: 'web-1' },
      body: { apiKey: 'short', progressId: 'progress-1' },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(generationProgressService.start).not.toHaveBeenCalled();
    expect(characterWebService.generateWeb).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'OpenRouter API key is required',
    });
  });

  it('POST /api/:webId/generate passes progress callbacks through the service and completes the flow', async () => {
    const web = createWeb();
    (characterWebService.generateWeb as jest.Mock).mockImplementation(
      (_webId: string, _apiKey: string, onGenerationStage?: (event: unknown) => void) => {
        onGenerationStage?.({
          stage: 'GENERATING_CHARACTER_WEB',
          status: 'started',
          attempt: 1,
        });
        onGenerationStage?.({
          stage: 'GENERATING_CHARACTER_WEB',
          status: 'completed',
          attempt: 1,
          durationMs: 250,
        });
        return Promise.resolve(web);
      }
    );

    const handler = getRouteHandler('post', '/api/:webId/generate');
    const req = mockReq({
      params: { webId: 'web-1' },
      body: { apiKey: 'valid-api-key-12345', progressId: ' progress-1 ' },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(generationProgressService.start).toHaveBeenCalledWith(
      'progress-1',
      'character-web-generation'
    );
    expect(generationProgressService.markStageStarted).toHaveBeenCalledWith(
      'progress-1',
      'GENERATING_CHARACTER_WEB',
      1
    );
    expect(generationProgressService.markStageCompleted).toHaveBeenCalledWith(
      'progress-1',
      'GENERATING_CHARACTER_WEB',
      1,
      250
    );
    expect(generationProgressService.complete).toHaveBeenCalledWith('progress-1');
    expect(characterWebService.generateWeb).toHaveBeenCalledWith(
      'web-1',
      'valid-api-key-12345',
      expect.any(Function)
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, web });
  });

  it('POST /api/:webId/generate maps LLMError to structured JSON and fails progress with the public message', async () => {
    const error = new LLMError('Provider timeout', 'HTTP_503', true, {
      httpStatus: 503,
      model: 'openrouter/test-model',
      rawErrorBody: '{"error":"timeout"}',
    });
    (characterWebService.generateWeb as jest.Mock).mockRejectedValue(error);

    const handler = getRouteHandler('post', '/api/:webId/generate');
    const req = mockReq({
      params: { webId: 'web-1' },
      body: { apiKey: 'valid-api-key-12345', progressId: 'progress-llm' },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(generationProgressService.start).toHaveBeenCalledWith(
      'progress-llm',
      'character-web-generation'
    );
    expect(generationProgressService.fail).toHaveBeenCalledWith(
      'progress-llm',
      'OpenRouter service is temporarily unavailable. Please try again later.'
    );
    expect(res.status).toHaveBeenCalledWith(500);
    const jsonCalls = (res.json as jest.Mock).mock.calls as Array<[unknown]>;
    const jsonCall = jsonCalls[0]?.[0] as
      | {
          success: boolean;
          error: string;
          code: string;
          retryable: boolean;
          debug?: {
            httpStatus?: number;
            model?: string;
            rawError?: string;
          };
        }
      | undefined;
    expect(jsonCall).toEqual(
      expect.objectContaining({
        success: false,
        error: 'OpenRouter service is temporarily unavailable. Please try again later.',
        code: 'HTTP_503',
        retryable: true,
      })
    );
    expect(jsonCall?.debug).toEqual(
      expect.objectContaining({
        httpStatus: 503,
        model: 'openrouter/test-model',
        rawError: '{"error":"timeout"}',
      })
    );
  });

  it('POST /api/:webId/characters/init returns 400 for duplicate developed characters', async () => {
    (characterWebService.initializeCharacter as jest.Mock).mockRejectedValue(
      new EngineError(
        'Developed character already exists for Iria Vale in character web web-1',
        'RESOURCE_CONFLICT'
      )
    );

    const handler = getRouteHandler('post', '/api/:webId/characters/init');
    const req = mockReq({
      params: { webId: 'web-1' },
      body: { characterName: 'Iria Vale' },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Developed character already exists for Iria Vale in character web web-1',
    });
  });

  it('POST /api/characters/:charId/generate maps EngineError RESOURCE_NOT_FOUND to 404', async () => {
    (characterWebService.generateCharacterStage as jest.Mock).mockRejectedValue(
      new EngineError('Developed character not found: missing-char', 'RESOURCE_NOT_FOUND')
    );

    const handler = getRouteHandler('post', '/api/characters/:charId/generate');
    const req = mockReq({
      params: { charId: 'missing-char' },
      body: {
        stage: 1,
        apiKey: 'valid-api-key-12345',
        progressId: 'missing-stage-progress',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(generationProgressService.fail).toHaveBeenCalledWith(
      'missing-stage-progress',
      'Developed character not found: missing-char'
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Developed character not found: missing-char',
    });
  });

  it('POST /api/characters/:charId/generate parses string stages and uses character-stage progress flow', async () => {
    const character = createCharacter({ completedStages: [1] });
    (characterWebService.generateCharacterStage as jest.Mock).mockResolvedValue(character);

    const handler = getRouteHandler('post', '/api/characters/:charId/generate');
    const req = mockReq({
      params: { charId: 'char-1' },
      body: {
        stage: '2',
        apiKey: 'valid-api-key-12345',
        progressId: ' stage-progress-1 ',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(generationProgressService.start).toHaveBeenCalledWith(
      'stage-progress-1',
      'character-stage-generation'
    );
    expect(characterWebService.generateCharacterStage).toHaveBeenCalledWith(
      'char-1',
      2,
      'valid-api-key-12345',
      expect.any(Function)
    );
    expect(generationProgressService.complete).toHaveBeenCalledWith('stage-progress-1');
    expect(res.json).toHaveBeenCalledWith({ success: true, character });
  });

  it('POST /api/characters/:charId/generate rejects invalid stage numbers', async () => {
    const handler = getRouteHandler('post', '/api/characters/:charId/generate');
    const req = mockReq({
      params: { charId: 'char-1' },
      body: {
        stage: 6,
        apiKey: 'valid-api-key-12345',
      },
    });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(characterWebService.generateCharacterStage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Character stage must be an integer from 1 to 5',
    });
  });

  it('GET /api/characters/:charId returns 404 when the character is missing', async () => {
    (characterWebService.loadCharacter as jest.Mock).mockResolvedValue(null);

    const handler = getRouteHandler('get', '/api/characters/:charId');
    const req = mockReq({ params: { charId: 'missing-char' } });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Developed character not found: missing-char',
    });
  });

  it('DELETE endpoints return 204 after delegating to the service', async () => {
    const deleteWebHandler = getRouteHandler('delete', '/api/:webId');
    const deleteCharacterHandler = getRouteHandler('delete', '/api/characters/:charId');
    const webRes = mockRes();
    const characterRes = mockRes();

    void deleteWebHandler(mockReq({ params: { webId: 'web-1' } }), webRes);
    await flushPromises();
    void deleteCharacterHandler(mockReq({ params: { charId: 'char-1' } }), characterRes);
    await flushPromises();

    expect(characterWebService.deleteWeb).toHaveBeenCalledWith('web-1');
    expect(characterWebService.deleteCharacter).toHaveBeenCalledWith('char-1');
    expect(webRes.status).toHaveBeenCalledWith(204);
    expect(characterRes.status).toHaveBeenCalledWith(204);
    expect(webRes.end).toHaveBeenCalledTimes(1);
    expect(characterRes.end).toHaveBeenCalledTimes(1);
  });

  it('registers the full character-web API surface through wrapAsyncRoute handlers', () => {
    const routeLayers = (characterWebRoutes.stack as unknown as RouteLayer[]).filter(
      (layer) => layer.route
    );

    expect(routeLayers.length).toBe(14);
  });
});

const mockListConcepts = jest.fn();
const mockLoadConcept = jest.fn();
const mockLoadKernel = jest.fn();
const mockListWorldbuildings = jest.fn();
const mockLoadWorldbuildingById = jest.fn();
const mockListCharacterWebs = jest.fn();
const mockListDevelopedCharactersByWebId = jest.fn();
const mockGenerateCharacterBrainstorm = jest.fn();

jest.mock('../../../../src/persistence/concept-repository', () => ({
  get listConcepts(): typeof mockListConcepts {
    return mockListConcepts;
  },
  get loadConcept(): typeof mockLoadConcept {
    return mockLoadConcept;
  },
}));

jest.mock('../../../../src/persistence/kernel-repository', () => ({
  get loadKernel(): typeof mockLoadKernel {
    return mockLoadKernel;
  },
}));

jest.mock('../../../../src/services/worldbuilding-service', () => ({
  get listWorldbuildings(): typeof mockListWorldbuildings {
    return mockListWorldbuildings;
  },
  get loadWorldbuildingById(): typeof mockLoadWorldbuildingById {
    return mockLoadWorldbuildingById;
  },
}));

jest.mock('../../../../src/persistence/character-web-repository', () => ({
  get listCharacterWebs(): typeof mockListCharacterWebs {
    return mockListCharacterWebs;
  },
}));

jest.mock('../../../../src/persistence/developed-character-repository', () => ({
  get listDevelopedCharactersByWebId(): typeof mockListDevelopedCharactersByWebId {
    return mockListDevelopedCharactersByWebId;
  },
}));

jest.mock('../../../../src/llm/character-brainstormer-generation', () => ({
  get generateCharacterBrainstorm(): typeof mockGenerateCharacterBrainstorm {
    return mockGenerateCharacterBrainstorm;
  },
}));

jest.mock('../../../../src/logging/index', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../../src/server/routes/generation-progress-route', () => ({
  createRouteGenerationProgress: jest.fn().mockReturnValue({
    onGenerationStage: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
  }),
}));

import type { Request, Response } from 'express';
import { characterBrainstormerRoutes } from '../../../../src/server/routes/character-brainstormer';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getHandler(
  path: string,
  method: 'get' | 'post'
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (characterBrainstormerRoutes.stack as unknown as RouteLayer[]).find(
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

function mockRes(): { status: jest.Mock; json: jest.Mock; render: jest.Mock } {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    render: jest.fn(),
  };
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListConcepts.mockResolvedValue([]);
  mockListWorldbuildings.mockResolvedValue([]);
  mockListCharacterWebs.mockResolvedValue([]);
  mockListDevelopedCharactersByWebId.mockResolvedValue([]);
});

describe('GET /', () => {
  it('renders pages/character-brainstormer with concepts and worldbuildings', async () => {
    const concepts = [{ id: 'c1', name: 'Concept 1' }];
    const worldbuildings = [{ id: 'w1', name: 'World 1' }];
    mockListConcepts.mockResolvedValue(concepts);
    mockListWorldbuildings.mockResolvedValue(worldbuildings);

    const res = mockRes();
    void getHandler('/', 'get')({} as Request, res as unknown as Response);
    await flushPromises();

    expect(res.render).toHaveBeenCalledWith('pages/character-brainstormer', {
      title: 'Brainstorm Characters - One More Branch',
      concepts,
      worldbuildings,
    });
  });
});

describe('POST /api/generate', () => {
  const validBody = {
    conceptId: 'concept-1',
    worldbuildingId: 'wb-1',
    apiKey: 'test-key',
    userNotes: 'some notes',
  };

  const mockConcept = {
    id: 'concept-1',
    sourceKernelId: 'kernel-1',
    evaluatedConcept: {
      concept: { oneLineHook: 'test hook' },
    },
  };

  const mockKernel = {
    id: 'kernel-1',
    evaluatedKernel: {
      kernel: { dramaticThesis: 'test thesis' },
    },
  };

  const mockWorldbuilding = {
    id: 'wb-1',
    decomposedWorld: { facts: [], rawWorldbuilding: '' },
    rawWorldMarkdown: 'raw world text',
  };

  const mockResult = {
    characters: [{ name: 'Test' }],
    diversityNote: 'note',
    rawResponse: '{}',
  };

  it('returns 400 when conceptId is missing', async () => {
    const res = mockRes();
    const req = { body: { ...validBody, conceptId: undefined } } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'conceptId is required' })
    );
  });

  it('returns 400 when worldbuildingId is missing', async () => {
    const res = mockRes();
    const req = { body: { ...validBody, worldbuildingId: undefined } } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'worldbuildingId is required' })
    );
  });

  it('returns 400 when apiKey is missing', async () => {
    const res = mockRes();
    const req = { body: { ...validBody, apiKey: undefined } } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'apiKey is required' })
    );
  });

  it('returns 404 when concept not found', async () => {
    mockLoadConcept.mockResolvedValue(null);
    mockLoadWorldbuildingById.mockResolvedValue(mockWorldbuilding);

    const res = mockRes();
    const req = { body: validBody } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when kernel not found', async () => {
    mockLoadConcept.mockResolvedValue(mockConcept);
    mockLoadWorldbuildingById.mockResolvedValue(mockWorldbuilding);
    mockLoadKernel.mockResolvedValue(null);

    const res = mockRes();
    const req = { body: validBody } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('calls generateCharacterBrainstorm with correct context and returns result', async () => {
    mockLoadConcept.mockResolvedValue(mockConcept);
    mockLoadKernel.mockResolvedValue(mockKernel);
    mockLoadWorldbuildingById.mockResolvedValue(mockWorldbuilding);
    mockGenerateCharacterBrainstorm.mockResolvedValue(mockResult);

    const res = mockRes();
    const req = { body: validBody } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(mockGenerateCharacterBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({
        conceptSpec: mockConcept.evaluatedConcept.concept,
        storyKernel: mockKernel.evaluatedKernel.kernel,
        decomposedWorld: mockWorldbuilding.decomposedWorld,
        userNotes: 'some notes',
      }),
      'test-key'
    );
    expect(res.json).toHaveBeenCalledWith({ success: true, result: mockResult });
  });

  it('collects existing character summaries from character webs', async () => {
    mockLoadConcept.mockResolvedValue(mockConcept);
    mockLoadKernel.mockResolvedValue(mockKernel);
    mockLoadWorldbuildingById.mockResolvedValue(mockWorldbuilding);
    mockGenerateCharacterBrainstorm.mockResolvedValue(mockResult);
    mockListCharacterWebs.mockResolvedValue([
      {
        id: 'web-1',
        sourceConceptId: 'concept-1',
        assignments: [
          { characterName: 'Kael', storyFunction: 'ANTAGONIST', narrativeRole: 'The villain' },
        ],
      },
    ]);
    mockListDevelopedCharactersByWebId.mockResolvedValue([
      { characterName: 'Kael', characterKernel: { superObjective: 'Dominate the world' } },
    ]);

    const res = mockRes();
    const req = { body: validBody } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(mockGenerateCharacterBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({
        existingCharacterNames: [
          {
            name: 'Kael',
            storyFunction: 'ANTAGONIST',
            narrativeRole: 'The villain',
            superObjective: 'Dominate the world',
          },
        ],
      }),
      'test-key'
    );
  });

  it('passes empty userNotes when omitted', async () => {
    mockLoadConcept.mockResolvedValue(mockConcept);
    mockLoadKernel.mockResolvedValue(mockKernel);
    mockLoadWorldbuildingById.mockResolvedValue(mockWorldbuilding);
    mockGenerateCharacterBrainstorm.mockResolvedValue(mockResult);

    const res = mockRes();
    const req = { body: { ...validBody, userNotes: undefined } } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(mockGenerateCharacterBrainstorm).toHaveBeenCalledWith(
      expect.objectContaining({ userNotes: '' }),
      'test-key'
    );
  });

  it('returns error on generation failure', async () => {
    mockLoadConcept.mockResolvedValue(mockConcept);
    mockLoadKernel.mockResolvedValue(mockKernel);
    mockLoadWorldbuildingById.mockResolvedValue(mockWorldbuilding);
    mockGenerateCharacterBrainstorm.mockRejectedValue(new Error('Generation failed'));

    const res = mockRes();
    const req = { body: validBody } as unknown as Request;
    void getHandler('/api/generate', 'post')(req, res as unknown as Response);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Generation failed' })
    );
  });
});

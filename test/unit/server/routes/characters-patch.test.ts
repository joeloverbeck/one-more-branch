/* eslint-disable @typescript-eslint/unbound-method */
import type { Request, Response } from 'express';
import type { StandaloneDecomposedCharacter } from '../../../../src/models/standalone-decomposed-character.js';

jest.mock('../../../../src/persistence/character-repository.js', () => ({
  saveCharacter: jest.fn().mockResolvedValue(undefined),
  loadCharacter: jest.fn(),
  listCharacters: jest.fn().mockResolvedValue([]),
  deleteCharacter: jest.fn().mockResolvedValue(undefined),
  updateCharacter: jest.fn(),
}));

jest.mock('../../../../src/llm/character-decomposer.js', () => ({
  decomposeCharacter: jest.fn(),
}));

jest.mock('../../../../src/logging', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logPrompt: jest.fn(),
  logResponse: jest.fn(),
}));

import { characterRoutes } from '../../../../src/server/routes/characters.js';
import { updateCharacter } from '../../../../src/persistence/character-repository.js';

const mockedUpdateCharacter = updateCharacter as jest.MockedFunction<typeof updateCharacter>;

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (characterRoutes.stack as unknown as RouteLayer[]).find(
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

function mockRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function mockReq(body: Record<string, unknown>, params: Record<string, string> = {}): Request {
  return {
    body,
    params,
  } as unknown as Request;
}

function makeCharacter(
  overrides: Partial<StandaloneDecomposedCharacter> = {}
): StandaloneDecomposedCharacter {
  return {
    id: 'char-1',
    name: 'Test Character',
    rawDescription: 'A test character description',
    speechFingerprint: {
      catchphrases: [],
      vocabularyProfile: 'standard',
      sentencePatterns: 'short',
      verbalTics: [],
      dialogueSamples: [],
      metaphorFrames: 'nature',
      antiExamples: [],
      discourseMarkers: [],
      registerShifts: 'none',
    },
    coreTraits: ['brave'],
    knowledgeBoundaries: 'limited',
    decisionPattern: 'impulsive',
    coreBeliefs: ['justice'],
    conflictPriority: 'survival',
    appearance: 'tall',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('PATCH /api/:characterId', () => {
  const handler = getRouteHandler('patch', '/api/:characterId');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 400 when fieldPath is missing', async () => {
    const req = mockReq({ value: 'test' }, { characterId: 'char-1' });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ error: expect.stringContaining('fieldPath is required') })
    );
  });

  it('returns 400 for non-editable field', async () => {
    const req = mockReq({ fieldPath: 'id', value: 'new-id' }, { characterId: 'char-1' });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ error: expect.stringContaining('not editable') })
    );
  });

  it('returns 400 for wrong value type', async () => {
    const req = mockReq({ fieldPath: 'name', value: 42 }, { characterId: 'char-1' });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ error: expect.stringContaining('Expected string') })
    );
  });

  it('returns 404 when character not found', async () => {
    mockedUpdateCharacter.mockRejectedValue(new Error('Character not found: char-999'));
    const req = mockReq({ fieldPath: 'name', value: 'New Name' }, { characterId: 'char-999' });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ error: expect.stringContaining('not found') })
    );
  });

  it('returns 200 with updated character on success', async () => {
    const updated = makeCharacter({ name: 'Updated Name' });
    mockedUpdateCharacter.mockResolvedValue(updated);
    const req = mockReq({ fieldPath: 'name', value: 'Updated Name' }, { characterId: 'char-1' });
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        character: expect.objectContaining({ name: 'Updated Name' }),
      })
    );
  });

  it('returns success for array field updates', async () => {
    const updated = makeCharacter({ coreTraits: ['cunning', 'wise'] });
    mockedUpdateCharacter.mockResolvedValue(updated);
    const req = mockReq(
      { fieldPath: 'coreTraits', value: ['cunning', 'wise'] },
      { characterId: 'char-1' }
    );
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        character: expect.objectContaining({ coreTraits: ['cunning', 'wise'] }),
      })
    );
  });

  it('returns success for nested field updates', async () => {
    const updated = makeCharacter();
    mockedUpdateCharacter.mockResolvedValue(updated);
    const req = mockReq(
      { fieldPath: 'speechFingerprint.vocabularyProfile', value: 'elevated' },
      { characterId: 'char-1' }
    );
    const res = mockRes();

    void handler(req, res);
    await flushPromises();

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockedUpdateCharacter).toHaveBeenCalled();
  });
});

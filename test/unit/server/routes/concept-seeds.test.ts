import type { Request, Response } from 'express';

jest.mock('../../../../src/persistence/concept-seed-repository.js', () => ({
  seedExists: jest.fn(),
  updateSeed: jest.fn(),
  listSeeds: jest.fn().mockResolvedValue([]),
  loadSeed: jest.fn(),
  saveSeed: jest.fn(),
  deleteSeed: jest.fn(),
}));
jest.mock('../../../../src/persistence/kernel-repository.js', () => ({
  loadKernel: jest.fn(),
}));
jest.mock('../../../../src/server/services/index.js', () => ({
  conceptService: { ideateConcepts: jest.fn() },
}));
jest.mock('../../../../src/logging/index.js', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { seedExists, updateSeed } from '../../../../src/persistence/concept-seed-repository.js';
import type { ConceptSeed } from '../../../../src/models/concept-seed.js';
import { conceptSeedRoutes } from '../../../../src/server/routes/concept-seeds.js';

const seedExistsMock = seedExists as jest.Mock;
const updateSeedMock = updateSeed as jest.Mock;

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (conceptSeedRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method]
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found`);
  }

  return handler;
}

function makeSeed(overrides: Partial<ConceptSeed> = {}): ConceptSeed {
  return {
    id: 'seed-1',
    name: 'Test Seed',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    sourceKernelId: 'kernel-1',
    protagonistDetails: 'A protagonist',
    oneLineHook: 'A hook',
    genreFrame: 'FANTASY' as ConceptSeed['genreFrame'],
    genreSubversion: 'Subversion',
    conflictAxis: 'POWER_VS_MORALITY' as ConceptSeed['conflictAxis'],
    conflictType: 'PERSON_VS_SELF' as ConceptSeed['conflictType'],
    whatIfQuestion: 'What if?',
    playerFantasy: 'Fantasy',
    protagonistRole: 'Warrior',
    coreCompetence: 'Swordsmanship',
    coreFlaw: 'Arrogance',
    actionVerbs: ['fight', 'defend', 'conquer', 'charge', 'rally', 'endure'],
    coreConflictLoop: 'Loop',
    settingAxioms: ['Axiom 1', 'Axiom 2'],
    constraintSet: ['Constraint 1', 'Constraint 2'],
    keyInstitutions: ['Institution 1', 'Institution 2'],
    settingScale: 'LOCAL' as ConceptSeed['settingScale'],
    ...overrides,
  };
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('PUT /concept-seeds/api/:seedId', () => {
  let handler: (req: Request, res: Response) => Promise<void> | void;
  let res: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = getRouteHandler('put', '/api/:seedId');
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('returns 404 when seed does not exist', async () => {
    seedExistsMock.mockResolvedValue(false);
    const req = {
      params: { seedId: 'missing' },
      body: { fieldPath: 'name', value: 'New' },
    } as unknown as Request;
    handler(req, res as unknown as Response);
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns 400 for invalid fieldPath', async () => {
    seedExistsMock.mockResolvedValue(true);
    const req = {
      params: { seedId: 'seed-1' },
      body: { fieldPath: 'id', value: 'hack' },
    } as unknown as Request;
    handler(req, res as unknown as Response);
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for missing fieldPath', async () => {
    seedExistsMock.mockResolvedValue(true);
    const req = { params: { seedId: 'seed-1' }, body: {} } as unknown as Request;
    handler(req, res as unknown as Response);
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for invalid value type', async () => {
    seedExistsMock.mockResolvedValue(true);
    const req = {
      params: { seedId: 'seed-1' },
      body: { fieldPath: 'name', value: 42 },
    } as unknown as Request;
    handler(req, res as unknown as Response);
    await flushPromises();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updates a string field and returns updated seed', async () => {
    const seed = makeSeed();
    seedExistsMock.mockResolvedValue(true);
    updateSeedMock.mockImplementation((_id: string, fn: (s: ConceptSeed) => ConceptSeed) =>
      Promise.resolve(fn(seed))
    );
    const req = {
      params: { seedId: 'seed-1' },
      body: { fieldPath: 'name', value: 'Updated Name' },
    } as unknown as Request;
    handler(req, res as unknown as Response);
    await flushPromises();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        seed: expect.objectContaining({ name: 'Updated Name' }),
      })
    );
  });

  it('updates an array field and returns updated seed', async () => {
    const seed = makeSeed();
    seedExistsMock.mockResolvedValue(true);
    updateSeedMock.mockImplementation((_id: string, fn: (s: ConceptSeed) => ConceptSeed) =>
      Promise.resolve(fn(seed))
    );
    const req = {
      params: { seedId: 'seed-1' },
      body: { fieldPath: 'settingAxioms', value: ['New Axiom'] },
    } as unknown as Request;
    handler(req, res as unknown as Response);
    await flushPromises();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        seed: expect.objectContaining({ settingAxioms: ['New Axiom'] }),
      })
    );
  });
});

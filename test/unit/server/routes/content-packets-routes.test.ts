/* eslint-disable @typescript-eslint/unbound-method */
import type { Request, Response } from 'express';
import type { ContentPacket, ContentEvaluation } from '@/models/content-packet';
import type { SavedContentPacket } from '@/models/saved-content-packet';

jest.mock('@/persistence/content-packet-repository', () => ({
  listContentPackets: jest.fn().mockResolvedValue([]),
  loadContentPacket: jest.fn(),
  saveContentPacket: jest.fn().mockResolvedValue(undefined),
  updateContentPacket: jest.fn(),
  deleteContentPacket: jest.fn().mockResolvedValue(undefined),
  contentPacketExists: jest.fn(),
}));

jest.mock('@/persistence/taste-profile-repository', () => ({
  listTasteProfiles: jest.fn().mockResolvedValue([]),
  saveTasteProfile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/server/services/content-service', () => ({
  contentService: {
    generateContentQuick: jest.fn(),
    generateContentPipeline: jest.fn(),
    distillTaste: jest.fn(),
  },
  createContentService: jest.fn(),
}));

jest.mock('@/logging', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logPrompt: jest.fn(),
  logResponse: jest.fn(),
}));

import {
  listContentPackets,
  loadContentPacket,
  saveContentPacket,
  updateContentPacket,
  deleteContentPacket,
  contentPacketExists,
} from '@/persistence/content-packet-repository';
import { listTasteProfiles, saveTasteProfile } from '@/persistence/taste-profile-repository';
import { contentService } from '@/server/services/content-service';
import { contentPacketRoutes } from '@/server/routes/content-packets';

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
  const layer = (contentPacketRoutes.stack as unknown as RouteLayer[]).find(
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
    render: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    ...overrides,
  } as unknown as Request;
}

function makeContentPacket(overrides: Partial<ContentPacket> = {}): ContentPacket {
  return {
    contentId: 'pkt-01',
    contentKind: 'ENTITY',
    coreAnomaly: 'Test anomaly',
    humanAnchor: 'Human anchor',
    socialEngine: 'Social engine',
    choicePressure: 'Choice pressure',
    signatureImage: 'Signature image',
    escalationPath: 'Escalation path',
    wildnessInvariant: 'Wildness invariant',
    dullCollapse: 'Dull collapse',
    interactionVerbs: ['observe', 'trade', 'rupture', 'escalate'],
    ...overrides,
  };
}

function makeEvaluation(overrides: Partial<ContentEvaluation> = {}): ContentEvaluation {
  return {
    contentId: 'pkt-01',
    scores: {
      imageCharge: 8,
      humanAche: 7,
      socialLoadBearing: 9,
      branchingPressure: 6,
      antiGenericity: 8,
      sceneBurst: 7,
      structuralIrony: 8,
      conceptUtility: 9,
    },
    strengths: ['Strong image'],
    weaknesses: ['Minor weakness'],
    recommendedRole: 'PRIMARY_SEED',
    ...overrides,
  };
}

function makeSavedPacket(overrides: Partial<SavedContentPacket> = {}): SavedContentPacket {
  return {
    id: 'p1',
    createdAt: '2026-03-19T10:00:00.000Z',
    updatedAt: '2026-03-19T10:00:00.000Z',
    pinned: false,
    packet: makeContentPacket(),
    ...overrides,
  };
}

describe('content-packets routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('renders content-packets page with grouped card view models from repository', async () => {
      const packets = [makeSavedPacket({ evaluation: makeEvaluation() })];
      (listContentPackets as jest.Mock).mockResolvedValue(packets);

      const handler = getRouteHandler('get', '/');
      const req = mockReq();
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(listContentPackets).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalled();

      const renderCall = ((res.render as jest.Mock).mock.calls as unknown[])[0] as [
        string,
        {
          title: string;
          hasSavedPackets: boolean;
          contentKindGroups: Array<{
            kind: string;
            displayLabel: string;
            cards: Array<{
              id: string;
              pinned: boolean;
              details: Array<{ key: string; value: string | readonly string[] }>;
              metaDetails: Array<{ key: string; value: string | readonly string[] }>;
            }>;
          }>;
        },
      ];

      expect(renderCall[0]).toBe('pages/content-packets');
      expect(renderCall[1].title).toBe('Content Packets - One More Branch');
      expect(renderCall[1].hasSavedPackets).toBe(true);
      expect(renderCall[1].contentKindGroups).toHaveLength(1);
      expect(renderCall[1].contentKindGroups[0]).toMatchObject({
        kind: 'ENTITY',
        displayLabel: 'ENTITY',
      });
      expect(renderCall[1].contentKindGroups[0]?.cards[0]).toMatchObject({
        id: 'p1',
        pinned: false,
      });
      expect(renderCall[1].contentKindGroups[0]?.cards[0]?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'contentId', value: 'pkt-01' }),
          expect.objectContaining({ key: 'coreAnomaly', value: 'Test anomaly' }),
        ])
      );
      expect(renderCall[1].contentKindGroups[0]?.cards[0]?.metaDetails).toEqual([
        expect.objectContaining({ key: 'recommendedRole', value: 'PRIMARY_SEED' }),
      ]);
    });
  });

  describe('GET /api/:packetId', () => {
    it('returns packet when found', async () => {
      const packet = makeSavedPacket({
        packet: makeContentPacket({ coreAnomaly: 'Found' }),
      });
      (loadContentPacket as jest.Mock).mockResolvedValue(packet);

      const handler = getRouteHandler('get', '/api/:packetId');
      const req = mockReq({ params: { packetId: 'p1' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(loadContentPacket).toHaveBeenCalledWith('p1');
      expect(res.json).toHaveBeenCalledWith({ success: true, packet });
    });

    it('returns 404 for nonexistent ID', async () => {
      (loadContentPacket as jest.Mock).mockResolvedValue(null);

      const handler = getRouteHandler('get', '/api/:packetId');
      const req = mockReq({ params: { packetId: 'nope' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Content packet not found',
      });
    });
  });

  describe('POST /api/generate', () => {
    it('calls generateContentQuick by default', async () => {
      const quickResult = {
        packets: [makeContentPacket()],
        rawResponse: '{}',
      };
      (contentService.generateContentQuick as jest.Mock).mockResolvedValue(quickResult);

      const handler = getRouteHandler('post', '/api/generate');
      const req = mockReq({
        body: {
          exemplarIdeas: ['idea one'],
          apiKey: 'sk-or-test-key-1234567890',
        },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(contentService.generateContentQuick).toHaveBeenCalled();
      expect(contentService.generateContentPipeline).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();

      const jsonCall = ((res.json as jest.Mock).mock.calls as unknown[])[0] as [
        {
          success: boolean;
          packets: ContentPacket[];
          packetCards: Array<{
            id: string;
            details: Array<{ key: string; value: string | readonly string[] }>;
          }>;
        },
      ];

      expect(jsonCall[0].success).toBe(true);
      expect(jsonCall[0].packets).toEqual(quickResult.packets);
      expect(jsonCall[0].packetCards[0]).toMatchObject({ id: 'pkt-01' });
      expect(jsonCall[0].packetCards[0]?.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'contentKind', value: 'ENTITY' }),
          expect.objectContaining({ key: 'contentId', value: 'pkt-01' }),
        ])
      );
    });

    it('calls generateContentPipeline when pipeline=true', async () => {
      const pipelineResult = {
        tasteProfile: { collisionPatterns: [] },
        sparks: [],
        packets: [makeContentPacket({ contentId: 'pkt-02', coreAnomaly: 'pipeline-test' })],
        evaluations: [makeEvaluation({ contentId: 'pkt-02', recommendedRole: 'SECONDARY_MUTAGEN' })],
      };
      (contentService.generateContentPipeline as jest.Mock).mockResolvedValue(pipelineResult);

      const handler = getRouteHandler('post', '/api/generate');
      const req = mockReq({
        body: {
          exemplarIdeas: ['idea one'],
          apiKey: 'sk-or-test-key-1234567890',
          pipeline: true,
        },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(contentService.generateContentPipeline).toHaveBeenCalled();
      expect(contentService.generateContentQuick).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        packets: pipelineResult.packets,
        packetCards: [
          expect.objectContaining({
            id: 'pkt-02',
            metaDetails: [
              expect.objectContaining({ key: 'recommendedRole', value: 'SECONDARY_MUTAGEN' }),
            ],
          }),
        ],
        evaluations: pipelineResult.evaluations,
        tasteProfile: pipelineResult.tasteProfile,
        sparks: pipelineResult.sparks,
      });
    });

    it('requires apiKey', async () => {
      const handler = getRouteHandler('post', '/api/generate');
      const req = mockReq({
        body: { exemplarIdeas: ['idea'], apiKey: '' },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'OpenRouter API key is required',
      });
    });

    it('requires exemplar ideas', async () => {
      const handler = getRouteHandler('post', '/api/generate');
      const req = mockReq({
        body: { apiKey: 'sk-or-test-key-1234567890' },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'At least one exemplar idea is required',
      });
    });

    it('rejects empty exemplar ideas after trimming', async () => {
      const handler = getRouteHandler('post', '/api/generate');
      const req = mockReq({
        body: {
          exemplarIdeas: ['  ', ''],
          apiKey: 'sk-or-test-key-1234567890',
        },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'At least one non-empty exemplar idea is required',
      });
    });
  });

  describe('POST /api/:packetId/save', () => {
    it('persists packet to repository', async () => {
      const handler = getRouteHandler('post', '/api/:packetId/save');
      const req = mockReq({
        params: { packetId: 'new-p1' },
        body: {
          packet: {
            contentId: 'pkt-01',
            contentKind: 'ENTITY',
            coreAnomaly: 'test anomaly',
            humanAnchor: 'anchor',
            socialEngine: 'engine',
            choicePressure: 'pressure',
            signatureImage: 'image',
            escalationPath: 'path',
            wildnessInvariant: 'invariant',
            dullCollapse: 'collapse',
            interactionVerbs: ['verb1', 'verb2', 'verb3', 'verb4'],
          },
        },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(saveContentPacket).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-p1',
          pinned: false,
          provenance: { generationMode: 'quick' },
        })
      );
      const saveCalls = (saveContentPacket as jest.Mock).mock.calls as Array<
        [
          {
            packet: { contentId: string; contentKind: string; coreAnomaly: string };
          },
        ]
      >;
      const savedArtifact = saveCalls[0]?.[0] as {
        packet: { contentId: string; contentKind: string; coreAnomaly: string };
      };
      expect(savedArtifact.packet).toEqual(
        expect.objectContaining({
          contentId: 'pkt-01',
          contentKind: 'ENTITY',
          coreAnomaly: 'test anomaly',
        })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('rejects packets that do not match the canonical packet contract', async () => {
      const handler = getRouteHandler('post', '/api/:packetId/save');
      const req = mockReq({
        params: { packetId: 'new-p1' },
        body: {
          packet: {
            contentKind: 'ENTITY',
            coreAnomaly: 'test anomaly',
          },
        },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(saveContentPacket).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Packet data must match the canonical content packet contract',
      });
    });
  });

  describe('PATCH /api/:packetId/pin', () => {
    it('toggles pinned state', async () => {
      (contentPacketExists as jest.Mock).mockResolvedValue(true);
      const updated = { id: 'p1', pinned: true };
      (updateContentPacket as jest.Mock).mockResolvedValue(updated);

      const handler = getRouteHandler('patch', '/api/:packetId/pin');
      const req = mockReq({ params: { packetId: 'p1' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(contentPacketExists).toHaveBeenCalledWith('p1');
      expect(updateContentPacket).toHaveBeenCalledWith('p1', expect.any(Function));
      expect(res.json).toHaveBeenCalledWith({ success: true, packet: updated });
    });

    it('returns 404 for nonexistent packet', async () => {
      (contentPacketExists as jest.Mock).mockResolvedValue(false);

      const handler = getRouteHandler('patch', '/api/:packetId/pin');
      const req = mockReq({ params: { packetId: 'nope' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /api/:packetId', () => {
    it('removes packet from repository', async () => {
      (contentPacketExists as jest.Mock).mockResolvedValue(true);

      const handler = getRouteHandler('delete', '/api/:packetId');
      const req = mockReq({ params: { packetId: 'p1' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(deleteContentPacket).toHaveBeenCalledWith('p1');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 404 for nonexistent packet', async () => {
      (contentPacketExists as jest.Mock).mockResolvedValue(false);

      const handler = getRouteHandler('delete', '/api/:packetId');
      const req = mockReq({ params: { packetId: 'nope' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('GET /taste-profiles/api/list', () => {
    it('returns list of taste profiles', async () => {
      const profiles = [{ id: 'tp1', name: 'Profile 1' }];
      (listTasteProfiles as jest.Mock).mockResolvedValue(profiles);

      const handler = getRouteHandler('get', '/taste-profiles/api/list');
      const req = mockReq();
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(listTasteProfiles).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, profiles });
    });
  });

  describe('POST /taste-profiles/api/generate', () => {
    it('generates and saves a taste profile', async () => {
      const tasteResult = {
        tasteProfile: {
          collisionPatterns: ['pattern1'],
          favoredMechanisms: ['mech1'],
          humanAnchors: ['anchor1'],
          socialEngines: ['engine1'],
          toneBlend: ['tone1'],
          sceneAppetites: ['scene1'],
          antiPatterns: ['anti1'],
          surfaceDoNotRepeat: ['surface1'],
          riskAppetite: 'HIGH',
        },
      };
      (contentService.distillTaste as jest.Mock).mockResolvedValue(tasteResult);

      const handler = getRouteHandler('post', '/taste-profiles/api/generate');
      const req = mockReq({
        body: {
          exemplarIdeas: ['idea one'],
          apiKey: 'sk-or-test-key-1234567890',
        },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(contentService.distillTaste).toHaveBeenCalled();
      expect(saveTasteProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          collisionPatterns: ['pattern1'],
          riskAppetite: 'HIGH',
        })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('requires apiKey for taste profile generation', async () => {
      const handler = getRouteHandler('post', '/taste-profiles/api/generate');
      const req = mockReq({
        body: { exemplarIdeas: ['idea'], apiKey: 'short' },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'OpenRouter API key is required',
      });
    });
  });

  describe('route registration', () => {
    it('all routes use wrapAsyncRoute (handler count matches expectations)', () => {
      const routeLayers = (contentPacketRoutes.stack as unknown as RouteLayer[]).filter(
        (layer) => layer.route
      );
      // 8 routes: GET /, GET /api/list, GET /api/:packetId, POST /api/generate,
      // POST /api/:packetId/save, PATCH /api/:packetId/pin, DELETE /api/:packetId,
      // GET /taste-profiles/api/list, POST /taste-profiles/api/generate
      expect(routeLayers.length).toBe(9);
    });
  });
});

/* eslint-disable @typescript-eslint/unbound-method */
import type { NextFunction, Request, Response } from 'express';
import type { ConceptSeedPacket } from '@/models/concept-seed-packet';
import type {
  ContentEvaluation,
  GeneratedContentPacket,
} from '@/models/content-generation-contracts';
import type { SavedContentPacket } from '@/models/saved-content-packet';

jest.mock('@/persistence/saved-content-packet-repository', () => ({
  listSavedContentPackets: jest.fn().mockResolvedValue([]),
  loadSavedContentPacket: jest.fn(),
  saveSavedContentPacket: jest.fn().mockResolvedValue(undefined),
  updateSavedContentPacket: jest.fn(),
  deleteSavedContentPacket: jest.fn().mockResolvedValue(undefined),
  savedContentPacketExists: jest.fn(),
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
  deleteSavedContentPacket,
  listSavedContentPackets,
  loadSavedContentPacket,
  saveSavedContentPacket,
  savedContentPacketExists,
  updateSavedContentPacket,
} from '@/persistence/saved-content-packet-repository';
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
): (req: Request, res: Response, next: NextFunction) => Promise<void> | void {
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

function makeConceptSeedPacket(overrides: Partial<ConceptSeedPacket> = {}): ConceptSeedPacket {
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

function makeGeneratedPacket(
  overrides: Partial<GeneratedContentPacket> = {}
): GeneratedContentPacket {
  return {
    packet: makeConceptSeedPacket(),
    context: {
      premiseSummary: 'A premise summary',
      situationFrame: 'A situation frame',
      worldState: 'A world state',
    },
    origin: {
      generationMode: 'quick',
      sourceArtifacts: [
        {
          artifactType: 'EXEMPLAR',
          sourceId: 'exemplar-01',
          summary: 'An exemplar summary',
        },
      ],
    },
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
    assetVersion: 2,
    packet: makeConceptSeedPacket(),
    context: {
      premiseSummary: 'A premise summary',
      situationFrame: 'A situation frame',
      worldState: 'A world state',
    },
    origin: {
      generationMode: 'quick',
      sourceArtifacts: [
        {
          artifactType: 'EXEMPLAR',
          sourceId: 'exemplar-01',
          contentKind: 'ENTITY',
          summary: 'An exemplar summary',
        },
      ],
    },
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
      (listSavedContentPackets as jest.Mock).mockResolvedValue(packets);

      const handler = getRouteHandler('get', '/');
      const req = mockReq();
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(listSavedContentPackets).toHaveBeenCalled();
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
              contextDetails: Array<{ key: string; value: string | readonly string[] }>;
              packetDetails: Array<{ key: string; value: string | readonly string[] }>;
              originDetails: Array<{ key: string; value: string | readonly string[] }>;
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
      expect(renderCall[1].contentKindGroups[0]?.cards[0]?.contextDetails).toEqual([
        expect.objectContaining({ key: 'premiseSummary', value: 'A premise summary' }),
        expect.objectContaining({ key: 'situationFrame', value: 'A situation frame' }),
        expect.objectContaining({ key: 'worldState', value: 'A world state' }),
      ]);
      expect(renderCall[1].contentKindGroups[0]?.cards[0]?.packetDetails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'contentId', value: 'pkt-01' }),
          expect.objectContaining({ key: 'coreAnomaly', value: 'Test anomaly' }),
        ])
      );
      expect(renderCall[1].contentKindGroups[0]?.cards[0]?.originDetails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'generationMode', value: 'quick' }),
          expect.objectContaining({ key: 'sourceArtifact-1' }),
        ])
      );
      expect(renderCall[1].contentKindGroups[0]?.cards[0]?.metaDetails).toEqual([
        expect.objectContaining({ key: 'recommendedRole', value: 'PRIMARY_SEED' }),
      ]);
    });
  });

  describe('GET /api/list', () => {
    it('forwards repository validation failures to next', async () => {
      const error = new Error('Invalid SavedContentPacket payload at /tmp/legacy.json');
      (listSavedContentPackets as jest.Mock).mockRejectedValue(error);

      const handler = getRouteHandler('get', '/api/list');
      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      void handler(req, res, next);
      await flushPromises();

      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/:packetId', () => {
    it('returns packet when found', async () => {
      const packet = makeSavedPacket({
        packet: makeConceptSeedPacket({ coreAnomaly: 'Found' }),
      });
      (loadSavedContentPacket as jest.Mock).mockResolvedValue(packet);

      const handler = getRouteHandler('get', '/api/:packetId');
      const req = mockReq({ params: { packetId: 'p1' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(loadSavedContentPacket).toHaveBeenCalledWith('p1');
      expect(res.json).toHaveBeenCalledWith({ success: true, packet });
    });

    it('returns 404 for nonexistent ID', async () => {
      (loadSavedContentPacket as jest.Mock).mockResolvedValue(null);

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
        packets: [makeGeneratedPacket()],
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
          packets: GeneratedContentPacket[];
          packetCards: Array<{
            id: string;
            contextDetails: Array<{ key: string; value: string | readonly string[] }>;
            packetDetails: Array<{ key: string; value: string | readonly string[] }>;
            originDetails: Array<{ key: string; value: string | readonly string[] }>;
          }>;
        },
      ];

      expect(jsonCall[0].success).toBe(true);
      expect(jsonCall[0].packets).toEqual(quickResult.packets);
      expect(jsonCall[0].packetCards[0]).toMatchObject({ id: 'pkt-01' });
      expect(jsonCall[0].packets[0]?.packet).toEqual(
        expect.objectContaining({ contentId: 'pkt-01' })
      );
      expect(jsonCall[0].packets[0]?.context).toEqual(
        expect.objectContaining({ premiseSummary: 'A premise summary' })
      );
      expect(jsonCall[0].packets[0]?.origin).toEqual(
        expect.objectContaining({
          generationMode: 'quick',
          sourceArtifacts: [
            expect.objectContaining({
              artifactType: 'EXEMPLAR',
              sourceId: 'exemplar-01',
              summary: 'An exemplar summary',
            }),
          ],
        })
      );
      expect(jsonCall[0].packetCards[0]?.contextDetails).toEqual([
        expect.objectContaining({ key: 'premiseSummary', value: 'A premise summary' }),
        expect.objectContaining({ key: 'situationFrame', value: 'A situation frame' }),
        expect.objectContaining({ key: 'worldState', value: 'A world state' }),
      ]);
      expect(jsonCall[0].packetCards[0]?.packetDetails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'contentKind', value: 'ENTITY' }),
          expect.objectContaining({ key: 'contentId', value: 'pkt-01' }),
        ])
      );
      expect(jsonCall[0].packetCards[0]?.originDetails).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'generationMode', value: 'quick' }),
          expect.objectContaining({
            key: 'sourceArtifact-1',
            value: ['Type: EXEMPLAR', 'Source ID: exemplar-01', 'Summary: An exemplar summary'],
          }),
        ])
      );
    });

    it('calls generateContentPipeline when pipeline=true', async () => {
      const pipelineResult = {
        tasteProfile: { collisionPatterns: [] },
        sparks: [],
        packets: [
          makeGeneratedPacket({
            packet: makeConceptSeedPacket({ contentId: 'pkt-02', coreAnomaly: 'pipeline-test' }),
            origin: {
              generationMode: 'pipeline',
              sourceArtifacts: [
                {
                  artifactType: 'SPARK',
                  sourceId: 'spark-01',
                  contentKind: 'ENTITY',
                  summary: 'Pipeline spark summary',
                  imageSeed: 'Pipeline spark image',
                  collisionTags: ['collision-a'],
                },
              ],
            },
          }),
        ],
        evaluations: [
          makeEvaluation({ contentId: 'pkt-02', recommendedRole: 'SECONDARY_MUTAGEN' }),
        ],
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
            contextDetails: [
              expect.objectContaining({ key: 'premiseSummary', value: 'A premise summary' }),
              expect.objectContaining({ key: 'situationFrame', value: 'A situation frame' }),
              expect.objectContaining({ key: 'worldState', value: 'A world state' }),
            ],
            originDetails: [
              expect.objectContaining({ key: 'generationMode', value: 'pipeline' }),
              expect.objectContaining({
                key: 'sourceArtifact-1',
                value: [
                  'Type: SPARK',
                  'Source ID: spark-01',
                  'Kind: ENTITY',
                  'Summary: Pipeline spark summary',
                  'Image Seed: Pipeline spark image',
                  'Collision Tags: collision-a',
                ],
              }),
            ],
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
    it('rejects packet-only legacy payloads', async () => {
      const handler = getRouteHandler('post', '/api/:packetId/save');
      const req = mockReq({
        params: { packetId: 'new-p1' },
        body: {
          candidate: makeConceptSeedPacket(),
        },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(saveSavedContentPacket).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Save candidate must include packet, context, and origin artifacts',
      });
    });

    it('rejects requests without a generated save candidate', async () => {
      const handler = getRouteHandler('post', '/api/:packetId/save');
      const req = mockReq({
        params: { packetId: 'new-p1' },
        body: {},
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(saveSavedContentPacket).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Generated save candidate is required',
      });
    });

    it('persists a full v2 saved asset when given a valid candidate and evaluation', async () => {
      const handler = getRouteHandler('post', '/api/:packetId/save');
      const candidate = makeGeneratedPacket({
        packet: makeConceptSeedPacket({ contentId: 'pkt-77' }),
      });
      const evaluation = makeEvaluation({ contentId: 'pkt-77' });
      const req = mockReq({
        params: { packetId: 'new-p1' },
        body: {
          candidate,
          evaluation,
        },
      });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(saveSavedContentPacket).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-p1',
          assetVersion: 2,
          pinned: false,
          packet: candidate.packet,
          context: candidate.context,
          origin: candidate.origin,
          evaluation,
        })
      );
      const jsonCall = ((res.json as jest.Mock).mock.calls as unknown[])[0] as [
        { success: boolean; packet: SavedContentPacket },
      ];
      expect(jsonCall[0].success).toBe(true);
      expect(jsonCall[0].packet).toMatchObject({
        id: 'new-p1',
        assetVersion: 2,
        packet: candidate.packet,
      });
    });
  });

  describe('PATCH /api/:packetId/pin', () => {
    it('toggles pinned state', async () => {
      (savedContentPacketExists as jest.Mock).mockResolvedValue(true);
      const updated = { id: 'p1', pinned: true };
      (updateSavedContentPacket as jest.Mock).mockResolvedValue(updated);

      const handler = getRouteHandler('patch', '/api/:packetId/pin');
      const req = mockReq({ params: { packetId: 'p1' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(savedContentPacketExists).toHaveBeenCalledWith('p1');
      expect(updateSavedContentPacket).toHaveBeenCalledWith('p1', expect.any(Function));
      expect(res.json).toHaveBeenCalledWith({ success: true, packet: updated });
    });

    it('returns 404 for nonexistent packet', async () => {
      (savedContentPacketExists as jest.Mock).mockResolvedValue(false);

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
      (savedContentPacketExists as jest.Mock).mockResolvedValue(true);

      const handler = getRouteHandler('delete', '/api/:packetId');
      const req = mockReq({ params: { packetId: 'p1' } });
      const res = mockRes();

      void handler(req, res);
      await flushPromises();

      expect(deleteSavedContentPacket).toHaveBeenCalledWith('p1');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 404 for nonexistent packet', async () => {
      (savedContentPacketExists as jest.Mock).mockResolvedValue(false);

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
          engagementModes: ['mode1'],
          valueTensions: ['tension1'],
          deepPatterns: ['pattern1'],
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

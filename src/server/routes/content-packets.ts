import { randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type { ContentPacket, ContentOneShotPacket } from '../../models/content-packet.js';
import type { SavedContentPacket } from '../../models/saved-content-packet.js';
import {
  contentPacketExists,
  deleteContentPacket,
  listContentPackets,
  loadContentPacket,
  saveContentPacket,
  updateContentPacket,
} from '../../persistence/content-packet-repository.js';
import {
  listTasteProfiles,
  saveTasteProfile,
} from '../../persistence/taste-profile-repository.js';
import type { SavedTasteProfile } from '../../models/saved-content-packet.js';
import { contentService } from '../services/index.js';
import { buildLlmRouteErrorResult, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const contentPacketRoutes = Router();

// --- GET / --- List all saved content packets
contentPacketRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const packets = await listContentPackets();
    return res.render('pages/content-packets', {
      title: 'Content Packets - One More Branch',
      packets,
    });
  }),
);

// --- GET /api/list --- JSON list of all content packets
contentPacketRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const packets = await listContentPackets();
    return res.json({ success: true, packets });
  }),
);

// --- GET /api/:packetId --- Load single content packet
contentPacketRoutes.get(
  '/api/:packetId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { packetId } = req.params;
    const packet = await loadContentPacket(packetId as string);
    if (!packet) {
      return res.status(404).json({ success: false, error: 'Content packet not found' });
    }
    return res.json({ success: true, packet });
  }),
);

// --- POST /api/generate --- Generate content packets (quick or pipeline)
contentPacketRoutes.post(
  '/api/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      exemplarIdeas?: unknown;
      genreVibes?: string;
      moodKeywords?: string;
      contentPreferences?: string;
      kernelBlock?: string;
      moodOrGenre?: string;
      pipeline?: boolean;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    if (!Array.isArray(body.exemplarIdeas) || body.exemplarIdeas.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'At least one exemplar idea is required' });
    }

    const exemplarIdeas = (body.exemplarIdeas as unknown[])
      .filter((idea): idea is string => typeof idea === 'string')
      .map((idea) => idea.trim())
      .filter((idea) => idea.length > 0);

    if (exemplarIdeas.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'At least one non-empty exemplar idea is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'content-generation');

    try {
      if (body.pipeline) {
        const result = await contentService.generateContentPipeline({
          exemplarIdeas,
          moodOrGenre: body.moodOrGenre?.trim() ?? undefined,
          contentPreferences: body.contentPreferences?.trim() ?? undefined,
          kernelBlock: body.kernelBlock?.trim() ?? undefined,
          apiKey,
          onGenerationStage: progress.onGenerationStage,
        });

        progress.complete();

        return res.json({
          success: true,
          packets: result.packets,
          evaluations: result.evaluations,
          tasteProfile: result.tasteProfile,
          sparks: result.sparks,
        });
      }

      const result = await contentService.generateContentQuick({
        exemplarIdeas,
        genreVibes: body.genreVibes?.trim() ?? undefined,
        moodKeywords: body.moodKeywords?.trim() ?? undefined,
        contentPreferences: body.contentPreferences?.trim() ?? undefined,
        kernelBlock: body.kernelBlock?.trim() ?? undefined,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();

      return res.json({
        success: true,
        packets: result.packets,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logger.error('LLM error during content generation', {
          code: error.code,
          stage: error.context?.['stage'],
          model: error.context?.['model'],
          retryable: error.retryable,
        });
        const { publicMessage, response } = buildLlmRouteErrorResult(error);
        progress.fail(publicMessage);
        return res.status(500).json(response);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      progress.fail(err.message);
      logger.error('Error during content generation:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  }),
);

// --- POST /api/:packetId/save --- Save a generated packet
contentPacketRoutes.post(
  '/api/:packetId/save',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { packetId } = req.params;
    const body = req.body as {
      packet?: ContentPacket | ContentOneShotPacket;
      name?: string;
      evaluation?: unknown;
    };

    if (!body.packet || typeof body.packet !== 'object') {
      return res.status(400).json({ success: false, error: 'Packet data is required' });
    }

    const now = new Date().toISOString();
    const packet = body.packet;

    const saved: SavedContentPacket = {
      id: packetId as string,
      name: body.name?.trim() ?? ('title' in packet ? (packet as { title: string }).title : 'Untitled Packet'),
      createdAt: now,
      updatedAt: now,
      contentKind: packet.contentKind,
      coreAnomaly: packet.coreAnomaly,
      humanAnchor: packet.humanAnchor,
      socialEngine: packet.socialEngine,
      choicePressure: packet.choicePressure,
      signatureImage: packet.signatureImage,
      escalationPath: 'escalationPath' in packet
        ? (packet as { escalationPath: string }).escalationPath
        : (packet as { escalationHint: string }).escalationHint,
      wildnessInvariant: packet.wildnessInvariant,
      dullCollapse: packet.dullCollapse,
      interactionVerbs: 'interactionVerbs' in packet
        ? [...(packet as unknown as { interactionVerbs: readonly string[] }).interactionVerbs]
        : [],
      pinned: false,
      recommendedRole: 'PRIMARY_SEED' as const,
      evaluation: body.evaluation as SavedContentPacket['evaluation'],
    };

    await saveContentPacket(saved);
    return res.json({ success: true, packet: saved });
  }),
);

// --- PATCH /api/:packetId/pin --- Toggle pinned state
contentPacketRoutes.patch(
  '/api/:packetId/pin',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { packetId } = req.params;

    if (!(await contentPacketExists(packetId as string))) {
      return res.status(404).json({ success: false, error: 'Content packet not found' });
    }

    const updated = await updateContentPacket(packetId as string, (existing) => ({
      ...existing,
      pinned: !existing.pinned,
      updatedAt: new Date().toISOString(),
    }));

    return res.json({ success: true, packet: updated });
  }),
);

// --- DELETE /api/:packetId --- Delete a packet
contentPacketRoutes.delete(
  '/api/:packetId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { packetId } = req.params;

    if (!(await contentPacketExists(packetId as string))) {
      return res.status(404).json({ success: false, error: 'Content packet not found' });
    }

    await deleteContentPacket(packetId as string);
    return res.json({ success: true });
  }),
);

// --- GET /taste-profiles/api/list --- List taste profiles
contentPacketRoutes.get(
  '/taste-profiles/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const profiles = await listTasteProfiles();
    return res.json({ success: true, profiles });
  }),
);

// --- POST /taste-profiles/api/generate --- Generate a taste profile
contentPacketRoutes.post(
  '/taste-profiles/api/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      exemplarIdeas?: unknown;
      moodOrGenre?: string;
      contentPreferences?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    if (!Array.isArray(body.exemplarIdeas) || body.exemplarIdeas.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'At least one exemplar idea is required' });
    }

    const exemplarIdeas = (body.exemplarIdeas as unknown[])
      .filter((idea): idea is string => typeof idea === 'string')
      .map((idea) => idea.trim())
      .filter((idea) => idea.length > 0);

    if (exemplarIdeas.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'At least one non-empty exemplar idea is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'content-generation');

    try {
      const result = await contentService.distillTaste({
        exemplarIdeas,
        moodOrGenre: body.moodOrGenre?.trim() ?? undefined,
        contentPreferences: body.contentPreferences?.trim() ?? undefined,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();

      const now = new Date().toISOString();
      const saved: SavedTasteProfile = {
        id: randomUUID(),
        name: `Taste Profile ${now}`,
        createdAt: now,
        updatedAt: now,
        ...result.tasteProfile,
      };

      await saveTasteProfile(saved);

      return res.json({ success: true, profile: saved });
    } catch (error) {
      if (error instanceof LLMError) {
        logger.error('LLM error during taste profile generation', {
          code: error.code,
          stage: error.context?.['stage'],
          model: error.context?.['model'],
          retryable: error.retryable,
        });
        const { publicMessage, response } = buildLlmRouteErrorResult(error);
        progress.fail(publicMessage);
        return res.status(500).json(response);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      progress.fail(err.message);
      logger.error('Error during taste profile generation:', {
        error: err.message,
        stack: err.stack,
      });
      return res.status(500).json({ success: false, error: err.message });
    }
  }),
);

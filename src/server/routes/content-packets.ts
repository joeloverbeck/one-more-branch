import { randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import {
  deleteSavedContentPacket,
  listSavedContentPackets,
  loadSavedContentPacket,
  saveSavedContentPacket,
  savedContentPacketExists,
  updateSavedContentPacket,
} from '../../persistence/saved-content-packet-repository.js';
import { listTasteProfiles, saveTasteProfile } from '../../persistence/taste-profile-repository.js';
import type { SavedContentPacket, SavedTasteProfile } from '../../models/saved-content-packet.js';
import { createSavedContentPacketArtifact } from '../services/saved-content-packet-artifact.js';
import { contentService } from '../services/index.js';
import {
  buildGeneratedContentPacketCardViewModel,
  buildSavedContentPacketCardWithRecommendedRole,
} from '../presenters/content-packet-card.js';
import { buildLlmRouteErrorResult, wrapAsyncRoute } from '../utils/index.js';
import { groupSavedContentPacketsByKind } from '../utils/group-saved-content-packets-by-kind.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const contentPacketRoutes = Router();

// --- GET / --- List all saved content packets
contentPacketRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const packets = await listSavedContentPackets();
    const contentKindGroups = groupSavedContentPacketsByKind(packets).map((group) => ({
      kind: group.kind,
      displayLabel: group.displayLabel,
      cards: group.packets.map(buildSavedContentPacketCardWithRecommendedRole),
    }));
    return res.render('pages/content-packets', {
      title: 'Content Packets - One More Branch',
      hasSavedPackets: packets.length > 0,
      contentKindGroups,
    });
  })
);

// --- GET /api/list --- JSON list of all content packets
contentPacketRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const packets = await listSavedContentPackets();
    return res.json({ success: true, packets });
  })
);

// --- GET /api/:packetId --- Load single content packet
contentPacketRoutes.get(
  '/api/:packetId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { packetId } = req.params;
    const packet = await loadSavedContentPacket(packetId as string);
    if (!packet) {
      return res.status(404).json({ success: false, error: 'Content packet not found' });
    }
    return res.json({ success: true, packet });
  })
);

// --- POST /api/generate --- Generate content packets via the pipeline
contentPacketRoutes.post(
  '/api/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      exemplarIdeas?: unknown;
      contentPreferences?: string;
      kernelBlock?: string;
      moodOrGenre?: string;
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
      const result = await contentService.generateContentPipeline({
        exemplarIdeas,
        moodOrGenre: body.moodOrGenre?.trim() ?? undefined,
        contentPreferences: body.contentPreferences?.trim() ?? undefined,
        kernelBlock: body.kernelBlock?.trim() ?? undefined,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();

      const evaluationByContentId = new Map(
        result.evaluations.map((evaluation) => [evaluation.contentId, evaluation])
      );

      return res.json({
        success: true,
        packets: result.packets,
        packetCards: result.packets.map((generatedPacket) =>
          buildGeneratedContentPacketCardViewModel(generatedPacket, {
            includeContentKind: true,
            evaluation: evaluationByContentId.get(generatedPacket.packet.contentId),
          })
        ),
        evaluations: result.evaluations,
        tasteProfile: result.tasteProfile,
        sparks: result.sparks,
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
  })
);

// --- POST /api/:packetId/save --- Save a generated packet
contentPacketRoutes.post(
  '/api/:packetId/save',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { packetId } = req.params;
    const body = req.body as {
      candidate?: unknown;
      evaluation?: unknown;
    };

    if (!body.candidate || typeof body.candidate !== 'object') {
      return res
        .status(400)
        .json({ success: false, error: 'Generated save candidate is required' });
    }

    let saved: SavedContentPacket;
    try {
      saved = createSavedContentPacketArtifact({
        id: packetId as string,
        now: new Date().toISOString(),
        candidate: body.candidate,
        evaluation: body.evaluation,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid packet data';
      return res.status(400).json({ success: false, error: message });
    }

    await saveSavedContentPacket(saved);
    return res.json({ success: true, packet: saved });
  })
);

// --- PATCH /api/:packetId/pin --- Toggle pinned state
contentPacketRoutes.patch(
  '/api/:packetId/pin',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { packetId } = req.params;

    if (!(await savedContentPacketExists(packetId as string))) {
      return res.status(404).json({ success: false, error: 'Content packet not found' });
    }

    const updated = await updateSavedContentPacket(packetId as string, (existing) => ({
      ...existing,
      pinned: !existing.pinned,
      updatedAt: new Date().toISOString(),
    }));

    return res.json({ success: true, packet: updated });
  })
);

// --- DELETE /api/:packetId --- Delete a packet
contentPacketRoutes.delete(
  '/api/:packetId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { packetId } = req.params;

    if (!(await savedContentPacketExists(packetId as string))) {
      return res.status(404).json({ success: false, error: 'Content packet not found' });
    }

    await deleteSavedContentPacket(packetId as string);
    return res.json({ success: true });
  })
);

// --- GET /taste-profiles/api/list --- List taste profiles
contentPacketRoutes.get(
  '/taste-profiles/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const profiles = await listTasteProfiles();
    return res.json({ success: true, profiles });
  })
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
  })
);

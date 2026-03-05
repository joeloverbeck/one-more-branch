import { randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type { ConceptCharacterWorldFields, ConceptSeedFields } from '../../models/index.js';
import { GENRE_FRAMES, MIN_UNBANNED_GENRES, isGenreFrame } from '../../models/index.js';
import type { GenreFrame } from '../../models/concept-generator.js';
import type { ConceptSeed } from '../../models/concept-seed.js';
import {
  deleteSeed,
  listSeeds,
  loadSeed,
  saveSeed,
  seedExists,
  updateSeed,
} from '../../persistence/concept-seed-repository.js';
import { loadKernel } from '../../persistence/kernel-repository.js';
import { conceptService } from '../services/index.js';
import { buildLlmRouteErrorResult, groupSeedsByGenre, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const conceptSeedRoutes = Router();

function hasAtLeastOneConceptSeed(body: {
  genreVibes?: string;
  moodKeywords?: string;
  contentPreferences?: string;
}): boolean {
  return [body.genreVibes, body.moodKeywords, body.contentPreferences].some((value) =>
    value?.trim(),
  );
}

function parseExcludedGenres(input: unknown): GenreFrame[] | null {
  if (input === undefined || input === null) {
    return [];
  }
  if (!Array.isArray(input)) {
    return null;
  }
  const maxExcluded = GENRE_FRAMES.length - MIN_UNBANNED_GENRES;
  if (input.length > maxExcluded) {
    return null;
  }
  const validated: GenreFrame[] = [];
  for (const item of input) {
    if (!isGenreFrame(item)) {
      return null;
    }
    validated.push(item);
  }
  return validated;
}

conceptSeedRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const seeds = await listSeeds();
    const genreGroups = groupSeedsByGenre(seeds);
    return res.render('pages/concept-seeds', {
      title: 'Concept Seeds - One More Branch',
      seeds,
      genreGroups,
      genreFrames: GENRE_FRAMES,
    });
  }),
);

conceptSeedRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const seeds = await listSeeds();
    return res.json({ success: true, seeds });
  }),
);

conceptSeedRoutes.get(
  '/api/:seedId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { seedId } = req.params;
    const seed = await loadSeed(seedId as string);
    if (!seed) {
      return res.status(404).json({ success: false, error: 'Seed not found' });
    }
    return res.json({ success: true, seed });
  }),
);

conceptSeedRoutes.post(
  '/api/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      protagonistDetails?: string;
      genreVibes?: string;
      moodKeywords?: string;
      contentPreferences?: string;
      excludedGenres?: unknown;
      kernelId?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const protagonistDetails = body.protagonistDetails?.trim();
    if (!protagonistDetails || protagonistDetails.length === 0) {
      return res.status(400).json({ success: false, error: 'Protagonist details are required' });
    }

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    if (!hasAtLeastOneConceptSeed(body)) {
      return res
        .status(400)
        .json({ success: false, error: 'At least one concept seed field is required' });
    }

    const kernelId = body.kernelId?.trim();
    if (!kernelId) {
      return res.status(400).json({ success: false, error: 'Kernel selection is required' });
    }

    const savedKernel = await loadKernel(kernelId);
    if (!savedKernel) {
      return res.status(400).json({ success: false, error: 'Selected kernel was not found' });
    }

    const excludedGenres = parseExcludedGenres(body.excludedGenres);
    if (excludedGenres === null) {
      return res.status(400).json({
        success: false,
        error: `excludedGenres must be an array of valid genre values with at most ${GENRE_FRAMES.length - MIN_UNBANNED_GENRES} entries`,
      });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'concept-generation');

    try {
      const result = await conceptService.ideateConcepts({
        protagonistDetails,
        genreVibes: body.genreVibes,
        moodKeywords: body.moodKeywords,
        contentPreferences: body.contentPreferences,
        excludedGenres: excludedGenres.length > 0 ? excludedGenres : undefined,
        kernel: savedKernel.evaluatedKernel.kernel,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();

      return res.json({
        success: true,
        seeds: result.seeds,
        characterWorlds: result.characterWorlds,
        kernelId,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logger.error('LLM error during seed generation', {
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
      logger.error('Error during seed generation:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  }),
);

conceptSeedRoutes.post(
  '/api/save',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      seed?: ConceptSeedFields;
      characterWorld?: ConceptCharacterWorldFields;
      sourceKernelId?: string;
      protagonistDetails?: string;
      genreVibes?: string;
      moodKeywords?: string;
      contentPreferences?: string;
      excludedGenres?: GenreFrame[];
    };

    if (!body.seed || typeof body.seed !== 'object') {
      return res.status(400).json({ success: false, error: 'Seed data is required' });
    }
    if (!body.characterWorld || typeof body.characterWorld !== 'object') {
      return res.status(400).json({ success: false, error: 'Character world data is required' });
    }

    const sourceKernelId = body.sourceKernelId?.trim();
    if (!sourceKernelId) {
      return res.status(400).json({ success: false, error: 'Source kernel ID is required' });
    }

    const protagonistDetails = body.protagonistDetails?.trim() ?? '';

    const now = new Date().toISOString();
    const id = randomUUID();

    const conceptSeed: ConceptSeed = {
      id,
      name: body.seed.oneLineHook ?? 'Untitled Seed',
      createdAt: now,
      updatedAt: now,
      sourceKernelId,
      protagonistDetails,
      genreVibes: body.genreVibes?.trim() || undefined,
      moodKeywords: body.moodKeywords?.trim() || undefined,
      contentPreferences: body.contentPreferences?.trim() || undefined,
      excludedGenres: body.excludedGenres,
      oneLineHook: body.seed.oneLineHook,
      genreFrame: body.seed.genreFrame,
      genreSubversion: body.seed.genreSubversion,
      conflictAxis: body.seed.conflictAxis,
      conflictType: body.seed.conflictType,
      whatIfQuestion: body.seed.whatIfQuestion,
      playerFantasy: body.seed.playerFantasy,
      protagonistRole: body.characterWorld.protagonistRole,
      coreCompetence: body.characterWorld.coreCompetence,
      coreFlaw: body.characterWorld.coreFlaw,
      actionVerbs: [...body.characterWorld.actionVerbs],
      coreConflictLoop: body.characterWorld.coreConflictLoop,
      settingAxioms: [...body.characterWorld.settingAxioms],
      constraintSet: [...body.characterWorld.constraintSet],
      keyInstitutions: [...body.characterWorld.keyInstitutions],
      settingScale: body.characterWorld.settingScale,
    };

    await saveSeed(conceptSeed);
    return res.json({ success: true, seed: conceptSeed });
  }),
);

conceptSeedRoutes.put(
  '/api/:seedId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { seedId } = req.params;
    const body = req.body as { name?: string };

    if (!(await seedExists(seedId as string))) {
      return res.status(404).json({ success: false, error: 'Seed not found' });
    }

    const updated = await updateSeed(seedId as string, (existing) => {
      const now = new Date().toISOString();
      const trimmed = body.name?.trim();
      const updatedName = trimmed && trimmed.length > 0 ? trimmed : existing.name;
      return { ...existing, name: updatedName, updatedAt: now };
    });

    return res.json({ success: true, seed: updated });
  }),
);

conceptSeedRoutes.delete(
  '/api/:seedId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { seedId } = req.params;

    if (!(await seedExists(seedId as string))) {
      return res.status(404).json({ success: false, error: 'Seed not found' });
    }

    await deleteSeed(seedId as string);
    return res.json({ success: true });
  }),
);

import { randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type {
  ConceptSpec,
  ConceptVerification,
  EvaluatedConcept,
} from '../../models/index.js';
import { GENRE_FRAMES } from '../../models/index.js';
import type { ConceptSeeds, SavedConcept } from '../../models/saved-concept.js';
import {
  conceptExists,
  deleteConcept,
  listConcepts,
  loadConcept,
  saveConcept,
  updateConcept,
} from '../../persistence/concept-repository.js';
import { listSeeds, loadSeed } from '../../persistence/concept-seed-repository.js';
import { loadKernel } from '../../persistence/kernel-repository.js';
import { conceptService } from '../services/index.js';
import {
  buildLlmRouteErrorResult,
  groupConceptsByGenre,
  groupSeedsByGenre,
  wrapAsyncRoute,
} from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const conceptRoutes = Router();

conceptRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const [concepts, seeds] = await Promise.all([listConcepts(), listSeeds()]);
    const genreGroups = groupConceptsByGenre(concepts);
    const seedGenreGroups = groupSeedsByGenre(seeds);
    return res.render('pages/concepts', {
      title: 'Concepts - One More Branch',
      concepts,
      genreGroups,
      seeds,
      seedGenreGroups,
      genreFrames: GENRE_FRAMES,
    });
  }),
);

conceptRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const concepts = await listConcepts();
    return res.json({ success: true, concepts });
  })
);

conceptRoutes.get(
  '/api/:conceptId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { conceptId } = req.params;
    const concept = await loadConcept(conceptId as string);

    if (!concept) {
      return res.status(404).json({ success: false, error: 'Concept not found' });
    }

    return res.json({ success: true, concept });
  })
);

conceptRoutes.get(
  '/api/seeds',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const seeds = await listSeeds();
    return res.json({ success: true, seeds });
  }),
);

conceptRoutes.post(
  '/api/generate/develop',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      seedId?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const seedId = body.seedId?.trim();
    if (!seedId) {
      return res.status(400).json({ success: false, error: 'Seed selection is required' });
    }

    const seed = await loadSeed(seedId);
    if (!seed) {
      return res.status(400).json({ success: false, error: 'Selected seed was not found' });
    }

    const savedKernel = await loadKernel(seed.sourceKernelId);
    if (!savedKernel) {
      return res.status(400).json({ success: false, error: 'Kernel for this seed was not found' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'concept-generation');

    try {
      const result = await conceptService.developSingleConcept({
        seed,
        kernel: savedKernel.evaluatedKernel.kernel,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();

      return res.json({
        success: true,
        evaluatedConcept: result.evaluatedConcept,
        verification: result.verification,
        sourceKernelId: seed.sourceKernelId,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logger.error('LLM error during single concept development', {
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
      logger.error('Error during concept development:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  }),
);

conceptRoutes.post(
  '/api/save',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      evaluatedConcept?: EvaluatedConcept;
      seeds?: ConceptSeeds;
      name?: string;
      sourceKernelId?: string;
      verificationResult?: ConceptVerification;
    };

    if (
      !body.evaluatedConcept ||
      typeof body.evaluatedConcept !== 'object' ||
      !body.evaluatedConcept.concept
    ) {
      return res.status(400).json({ success: false, error: 'Evaluated concept is required' });
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const trimmedName = body.name?.trim();
    const defaultName =
      trimmedName && trimmedName.length > 0
        ? trimmedName
        : body.evaluatedConcept.concept.oneLineHook ?? 'Untitled Concept';

    const trimmedKernelId = body.sourceKernelId?.trim();
    const savedConcept: SavedConcept = {
      id,
      name: defaultName,
      createdAt: now,
      updatedAt: now,
      seeds: body.seeds ?? {},
      evaluatedConcept: body.evaluatedConcept,
      ...(trimmedKernelId && trimmedKernelId.length > 0 ? { sourceKernelId: trimmedKernelId } : {}),
      ...(body.verificationResult ? { verificationResult: body.verificationResult } : {}),
    };

    await saveConcept(savedConcept);
    return res.json({ success: true, concept: savedConcept });
  })
);

conceptRoutes.put(
  '/api/:conceptId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { conceptId } = req.params;
    const body = req.body as {
      name?: string;
      conceptFields?: Partial<ConceptSpec>;
    };

    if (!(await conceptExists(conceptId as string))) {
      return res.status(404).json({ success: false, error: 'Concept not found' });
    }

    const updated = await updateConcept(conceptId as string, (existing) => {
      const now = new Date().toISOString();
      const trimmed = body.name?.trim();
      const updatedName = trimmed && trimmed.length > 0 ? trimmed : existing.name;

      const updatedConceptFields = body.conceptFields
        ? { ...existing.evaluatedConcept.concept, ...body.conceptFields }
        : existing.evaluatedConcept.concept;

      return {
        ...existing,
        name: updatedName,
        updatedAt: now,
        evaluatedConcept: {
          ...existing.evaluatedConcept,
          concept: updatedConceptFields,
        },
      };
    });

    return res.json({ success: true, concept: updated });
  })
);

conceptRoutes.delete(
  '/api/:conceptId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { conceptId } = req.params;

    if (!(await conceptExists(conceptId as string))) {
      return res.status(404).json({ success: false, error: 'Concept not found' });
    }

    await deleteConcept(conceptId as string);
    return res.json({ success: true });
  })
);

conceptRoutes.post(
  '/api/:conceptId/harden',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { conceptId } = req.params;
    const body = req.body as {
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const existing = await loadConcept(conceptId as string);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Concept not found' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'concept-generation');

    try {
      const result = await conceptService.stressTestConcept({
        concept: existing.evaluatedConcept.concept,
        scores: existing.evaluatedConcept.scores,
        weaknesses: [...existing.evaluatedConcept.weaknesses],
        verification: existing.verificationResult,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();

      const now = new Date().toISOString();
      const updated = await updateConcept(conceptId as string, (current) => ({
        ...current,
        updatedAt: now,
        hardenedAt: now,
        preHardenedConcept: { ...current.evaluatedConcept },
        evaluatedConcept: {
          ...current.evaluatedConcept,
          concept: result.hardenedConcept,
        },
        stressTestResult: {
          driftRisks: [...result.driftRisks],
          playerBreaks: [...result.playerBreaks],
        },
      }));

      return res.json({
        success: true,
        concept: updated,
        hardenedConcept: result.hardenedConcept,
        driftRisks: result.driftRisks,
        playerBreaks: result.playerBreaks,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logger.error('LLM error during concept hardening', {
          code: error.code,
          stage: error.context?.['stage'],
          model: error.context?.['model'],
          retryable: error.retryable,
        });
        const { publicMessage, response } = buildLlmRouteErrorResult(error, { includeDebug: false });
        progress.fail(publicMessage);
        return res.status(500).json(response);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      progress.fail(err.message);
      logger.error('Error hardening concept:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  })
);

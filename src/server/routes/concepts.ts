import { randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type {
  ConceptCharacterWorldFields,
  ConceptSeedFields,
  ConceptSpec,
  ConceptVerification,
  EvaluatedConcept,
} from '../../models/index.js';
import { GENRE_FRAMES, MIN_UNBANNED_GENRES, isGenreFrame } from '../../models/index.js';
import type { GenreFrame } from '../../models/concept-generator.js';
import type { ConceptSeeds, SavedConcept } from '../../models/saved-concept.js';
import {
  conceptExists,
  deleteConcept,
  listConcepts,
  loadConcept,
  saveConceptGenerationBatch,
  saveConcept,
  updateConcept,
} from '../../persistence/concept-repository.js';
import { loadKernel } from '../../persistence/kernel-repository.js';
import { ConceptEvaluationStageError, conceptService } from '../services/index.js';
import { buildLlmRouteErrorResult, groupConceptsByGenre, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const conceptRoutes = Router();

function hasAtLeastOneConceptSeed(body: {
  genreVibes?: string;
  moodKeywords?: string;
  contentPreferences?: string;
}): boolean {
  return [
    body.genreVibes,
    body.moodKeywords,
    body.contentPreferences,
  ].some((value) => value?.trim());
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


conceptRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const concepts = await listConcepts();
    const genreGroups = groupConceptsByGenre(concepts);
    return res.render('pages/concepts', {
      title: 'Concepts - One More Branch',
      concepts,
      genreGroups,
      genreFrames: GENRE_FRAMES,
    });
  })
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

conceptRoutes.post(
  '/api/generate/ideate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      genreVibes?: string;
      moodKeywords?: string;
      contentPreferences?: string;
      excludedGenres?: unknown;
      kernelId?: string;
      apiKey?: string;
      progressId?: unknown;
    };

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
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logger.error('LLM error during concept ideation', {
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
      logger.error('Error during concept ideation:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  })
);

conceptRoutes.post(
  '/api/generate/develop',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      seeds?: ConceptSeedFields[];
      characterWorlds?: ConceptCharacterWorldFields[];
      kernelId?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    if (!Array.isArray(body.seeds) || body.seeds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one seed is required' });
    }

    if (
      !Array.isArray(body.characterWorlds) ||
      body.characterWorlds.length !== body.seeds.length
    ) {
      return res
        .status(400)
        .json({ success: false, error: 'characterWorlds must match seeds length' });
    }

    const kernelId = body.kernelId?.trim();
    if (!kernelId) {
      return res.status(400).json({ success: false, error: 'Kernel selection is required' });
    }

    const savedKernel = await loadKernel(kernelId);
    if (!savedKernel) {
      return res.status(400).json({ success: false, error: 'Selected kernel was not found' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'concept-generation');

    try {
      const result = await conceptService.developConcepts({
        seeds: body.seeds,
        characterWorlds: body.characterWorlds,
        kernel: savedKernel.evaluatedKernel.kernel,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      const generatedAt = new Date().toISOString();
      const generationId = randomUUID();
      await saveConceptGenerationBatch({
        id: generationId,
        generatedAt,
        seeds: {},
        ideatedConcepts: result.ideatedConcepts,
        scoredConcepts: result.scoredConcepts,
        selectedConcepts: result.evaluatedConcepts,
        verifications: result.verifications,
      });

      progress.complete();

      return res.json({
        success: true,
        evaluatedConcepts: result.evaluatedConcepts,
        verifications: result.verifications,
      });
    } catch (error) {
      let rootError: unknown = error;
      if (error instanceof ConceptEvaluationStageError) {
        rootError = error.cause;
        try {
          await saveConceptGenerationBatch({
            id: randomUUID(),
            generatedAt: new Date().toISOString(),
            seeds: {},
            ideatedConcepts: error.ideatedConcepts,
            scoredConcepts: [],
            selectedConcepts: [],
          });
        } catch (persistError) {
          const persistErr =
            persistError instanceof Error ? persistError : new Error(String(persistError));
          logger.warn('Failed to persist partial concept generation batch', {
            error: persistErr.message,
          });
        }
      }

      if (rootError instanceof LLMError) {
        logger.error('LLM error during concept development', {
          code: rootError.code,
          message: rootError.message,
          stage: rootError.context?.['stage'],
          model: rootError.context?.['model'],
          retryable: rootError.retryable,
        });
        const { publicMessage, response } = buildLlmRouteErrorResult(rootError);
        progress.fail(publicMessage);
        return res.status(500).json(response);
      }

      const err = rootError instanceof Error ? rootError : new Error(String(rootError));
      progress.fail(err.message);
      logger.error('Error during concept development:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  })
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

import { randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import type { GenerationStageEvent } from '../../engine';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type { ConceptSpec, EvaluatedConcept } from '../../models/index.js';
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
import { conceptService, generationProgressService } from '../services/index.js';
import { formatLLMError, parseProgressId, wrapAsyncRoute } from '../utils/index.js';

export const conceptRoutes = Router();

function hasAtLeastOneConceptSeed(body: {
  genreVibes?: string;
  moodKeywords?: string;
  contentPreferences?: string;
  thematicInterests?: string;
  sparkLine?: string;
}): boolean {
  return [
    body.genreVibes,
    body.moodKeywords,
    body.contentPreferences,
    body.thematicInterests,
    body.sparkLine,
  ].some((value) => value?.trim());
}

conceptRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const concepts = await listConcepts();
    return res.render('pages/concepts', {
      title: 'Concepts - One More Branch',
      concepts,
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
  '/api/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      genreVibes?: string;
      moodKeywords?: string;
      contentPreferences?: string;
      thematicInterests?: string;
      sparkLine?: string;
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

    const progressId = parseProgressId(body.progressId);
    if (progressId) {
      generationProgressService.start(progressId, 'concept-generation');
    }

    try {
      const result = await conceptService.generateConcepts({
        genreVibes: body.genreVibes,
        moodKeywords: body.moodKeywords,
        contentPreferences: body.contentPreferences,
        thematicInterests: body.thematicInterests,
        sparkLine: body.sparkLine,
        apiKey,
        onGenerationStage: progressId
          ? (event: GenerationStageEvent): void => {
              if (event.status === 'started') {
                generationProgressService.markStageStarted(progressId, event.stage, event.attempt);
              } else {
                generationProgressService.markStageCompleted(
                  progressId,
                  event.stage,
                  event.attempt
                );
              }
            }
          : undefined,
      });

      const generatedAt = new Date().toISOString();
      const generationId = randomUUID();
      await saveConceptGenerationBatch({
        id: generationId,
        generatedAt,
        seeds: {
          genreVibes: body.genreVibes?.trim(),
          moodKeywords: body.moodKeywords?.trim(),
          contentPreferences: body.contentPreferences?.trim(),
          thematicInterests: body.thematicInterests?.trim(),
          sparkLine: body.sparkLine?.trim(),
        },
        ideatedConcepts: result.ideatedConcepts,
        scoredConcepts: result.scoredConcepts,
        selectedConcepts: result.evaluatedConcepts,
      });

      if (progressId) {
        generationProgressService.complete(progressId);
      }

      return res.json({ success: true, evaluatedConcepts: result.evaluatedConcepts });
    } catch (error) {
      if (error instanceof LLMError) {
        const formattedError = formatLLMError(error);
        if (progressId) {
          generationProgressService.fail(progressId, formattedError);
        }
        return res.status(500).json({
          success: false,
          error: formattedError,
          code: error.code,
          retryable: error.retryable,
        });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (progressId) {
        generationProgressService.fail(progressId, err.message);
      }
      logger.error('Error generating concepts:', { error: err.message, stack: err.stack });
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
    const defaultName = trimmedName && trimmedName.length > 0
      ? trimmedName
      : (body.evaluatedConcept.concept.oneLineHook ?? 'Untitled Concept').slice(0, 80);

    const savedConcept: SavedConcept = {
      id,
      name: defaultName,
      createdAt: now,
      updatedAt: now,
      seeds: body.seeds ?? {},
      evaluatedConcept: body.evaluatedConcept,
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

    const progressId = parseProgressId(body.progressId);
    if (progressId) {
      generationProgressService.start(progressId, 'concept-generation');
    }

    try {
      const result = await conceptService.stressTestConcept({
        concept: existing.evaluatedConcept.concept,
        scores: existing.evaluatedConcept.scores,
        weaknesses: [...existing.evaluatedConcept.weaknesses],
        apiKey,
        onGenerationStage: progressId
          ? (event: GenerationStageEvent): void => {
              if (event.status === 'started') {
                generationProgressService.markStageStarted(progressId, event.stage, event.attempt);
              } else {
                generationProgressService.markStageCompleted(
                  progressId,
                  event.stage,
                  event.attempt
                );
              }
            }
          : undefined,
      });

      if (progressId) {
        generationProgressService.complete(progressId);
      }

      const now = new Date().toISOString();
      const updated = await updateConcept(conceptId as string, (current) => ({
        ...current,
        updatedAt: now,
        hardenedAt: now,
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
        const formattedError = formatLLMError(error);
        if (progressId) {
          generationProgressService.fail(progressId, formattedError);
        }
        return res.status(500).json({
          success: false,
          error: formattedError,
          code: error.code,
          retryable: error.retryable,
        });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (progressId) {
        generationProgressService.fail(progressId, err.message);
      }
      logger.error('Error hardening concept:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  })
);

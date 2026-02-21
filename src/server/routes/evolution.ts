import { Request, Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type { SavedConcept } from '../../models/saved-concept.js';
import { listConcepts, loadConcept } from '../../persistence/concept-repository.js';
import { loadKernel } from '../../persistence/kernel-repository.js';
import { evolutionService } from '../services/index.js';
import { buildLlmRouteErrorResult, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const evolutionRoutes = Router();

function parseConceptIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((conceptId) => (typeof conceptId === 'string' ? conceptId.trim() : ''))
    .filter((conceptId) => conceptId.length > 0);
}

evolutionRoutes.get(
  '/',
  (_req: Request, res: Response) => {
    return res.render('pages/evolution', {
      title: 'Evolve Concepts - One More Branch',
    });
  },
);

evolutionRoutes.get(
  '/api/concepts-by-kernel/:kernelId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const kernelId = req.params['kernelId']?.trim();

    if (!kernelId) {
      return res.status(400).json({ success: false, error: 'Kernel ID is required' });
    }

    const concepts = await listConcepts();
    const filtered = concepts.filter((concept) => concept.sourceKernelId === kernelId);

    return res.json({ success: true, concepts: filtered });
  }),
);

evolutionRoutes.post(
  '/api/evolve',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      conceptIds?: unknown;
      kernelId?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const conceptIds = parseConceptIds(body.conceptIds);
    if (conceptIds.length < 2 || conceptIds.length > 3) {
      return res.status(400).json({ success: false, error: 'Select 2-3 parent concepts' });
    }

    const distinctConceptIds = new Set(conceptIds);
    if (distinctConceptIds.size !== conceptIds.length) {
      return res
        .status(400)
        .json({ success: false, error: 'Selected parent concepts must be unique' });
    }

    const kernelId = body.kernelId?.trim();
    if (!kernelId) {
      return res.status(400).json({ success: false, error: 'Kernel selection is required' });
    }

    const [savedKernel, savedConcepts] = await Promise.all([
      loadKernel(kernelId),
      Promise.all(conceptIds.map((conceptId) => loadConcept(conceptId))),
    ]);

    if (!savedKernel) {
      return res.status(404).json({ success: false, error: 'Selected kernel was not found' });
    }

    const missingConceptId = savedConcepts.findIndex((concept) => !concept);
    if (missingConceptId >= 0) {
      return res.status(404).json({
        success: false,
        error: `Concept not found: ${conceptIds[missingConceptId]}`,
      });
    }

    const concepts = savedConcepts.reduce<SavedConcept[]>((acc, concept) => {
      if (concept) {
        acc.push(concept);
      }
      return acc;
    }, []);

    const mismatchedConcept = concepts.find((concept) => concept.sourceKernelId !== kernelId);
    if (mismatchedConcept) {
      return res.status(400).json({
        success: false,
        error: 'All selected concepts must belong to the selected kernel',
      });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'concept-evolution');

    try {
      const result = await evolutionService.evolveConcepts({
        parentConcepts: concepts.map((concept) => concept.evaluatedConcept),
        kernel: savedKernel.evaluatedKernel.kernel,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();

      return res.json({
        success: true,
        evaluatedConcepts: result.evaluatedConcepts,
        verifications: result.verifications,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        const { publicMessage, response } = buildLlmRouteErrorResult(error);
        progress.fail(publicMessage);
        return res.status(500).json(response);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      progress.fail(err.message);
      logger.error('Error evolving concepts:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  }),
);

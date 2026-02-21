import { Request, Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import { loadKernel } from '../../persistence/kernel-repository.js';
import type { SavedKernel } from '../../models/saved-kernel.js';
import { kernelEvolutionService } from '../services/index.js';
import { buildLlmRouteErrorResult, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const kernelEvolutionRoutes = Router();

function parseKernelIds(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0);
}

kernelEvolutionRoutes.get(
  '/',
  (_req: Request, res: Response) => {
    return res.render('pages/kernel-evolution', {
      title: 'Evolve Kernels - One More Branch',
    });
  },
);

kernelEvolutionRoutes.post(
  '/api/evolve',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      kernelIds?: unknown;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const kernelIds = parseKernelIds(body.kernelIds);
    if (kernelIds.length < 2 || kernelIds.length > 3) {
      return res.status(400).json({ success: false, error: 'Select 2-3 parent kernels' });
    }

    const distinctKernelIds = new Set(kernelIds);
    if (distinctKernelIds.size !== kernelIds.length) {
      return res
        .status(400)
        .json({ success: false, error: 'Selected parent kernels must be unique' });
    }

    const savedKernels = await Promise.all(kernelIds.map((id) => loadKernel(id)));

    const missingIndex = savedKernels.findIndex((kernel) => !kernel);
    if (missingIndex >= 0) {
      return res.status(404).json({
        success: false,
        error: `Kernel not found: ${kernelIds[missingIndex]}`,
      });
    }

    const kernels = savedKernels.reduce<SavedKernel[]>((acc, kernel) => {
      if (kernel) {
        acc.push(kernel);
      }
      return acc;
    }, []);

    const progress = createRouteGenerationProgress(body.progressId, 'kernel-evolution');

    try {
      const result = await kernelEvolutionService.evolveKernels({
        parentKernels: kernels.map((k) => k.evaluatedKernel),
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      progress.complete();

      return res.json({
        success: true,
        evaluatedKernels: result.evaluatedKernels,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        const { publicMessage, response } = buildLlmRouteErrorResult(error);
        progress.fail(publicMessage);
        return res.status(500).json(response);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      progress.fail(err.message);
      logger.error('Error evolving kernels:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  }),
);

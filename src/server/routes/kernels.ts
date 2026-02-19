import { randomUUID } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type { EvaluatedKernel, StoryKernel } from '../../models/index.js';
import type { SavedKernel } from '../../models/saved-kernel.js';
import {
  deleteKernel,
  kernelExists,
  listKernels,
  loadKernel,
  saveKernel,
  saveKernelGenerationBatch,
  updateKernel,
} from '../../persistence/kernel-repository.js';
import { kernelService } from '../services/index.js';
import { formatLLMError, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const kernelRoutes = Router();

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSeedInput(body: {
  thematicInterests?: string;
  emotionalCore?: string;
  sparkLine?: string;
}): SavedKernel['seeds'] {
  return {
    thematicInterests: trimOptional(body.thematicInterests),
    emotionalCore: trimOptional(body.emotionalCore),
    sparkLine: trimOptional(body.sparkLine),
  };
}

kernelRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const kernels = await listKernels();
    return res.json({ success: true, kernels });
  }),
);

kernelRoutes.get(
  '/api/:kernelId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { kernelId } = req.params;
    const kernel = await loadKernel(kernelId as string);

    if (!kernel) {
      return res.status(404).json({ success: false, error: 'Kernel not found' });
    }

    return res.json({ success: true, kernel });
  }),
);

kernelRoutes.post(
  '/api/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      thematicInterests?: string;
      emotionalCore?: string;
      sparkLine?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'kernel-generation');

    try {
      const result = await kernelService.generateKernels({
        thematicInterests: body.thematicInterests,
        emotionalCore: body.emotionalCore,
        sparkLine: body.sparkLine,
        apiKey,
        onGenerationStage: progress.onGenerationStage,
      });

      await saveKernelGenerationBatch({
        id: randomUUID(),
        generatedAt: new Date().toISOString(),
        seeds: normalizeSeedInput(body),
        evaluatedKernels: result.evaluatedKernels,
      });

      progress.complete();

      return res.json({ success: true, evaluatedKernels: result.evaluatedKernels });
    } catch (error) {
      if (error instanceof LLMError) {
        const formattedError = formatLLMError(error);
        progress.fail(formattedError);
        return res.status(500).json({
          success: false,
          error: formattedError,
          code: error.code,
          retryable: error.retryable,
        });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      progress.fail(err.message);
      logger.error('Error generating kernels:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  }),
);

kernelRoutes.post(
  '/api/save',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      evaluatedKernel?: EvaluatedKernel;
      seeds?: { thematicInterests?: string; emotionalCore?: string; sparkLine?: string };
      name?: string;
    };

    if (
      !body.evaluatedKernel ||
      typeof body.evaluatedKernel !== 'object' ||
      !body.evaluatedKernel.kernel
    ) {
      return res.status(400).json({ success: false, error: 'Evaluated kernel is required' });
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const trimmedName = body.name?.trim();
    const defaultName =
      trimmedName && trimmedName.length > 0
        ? trimmedName
        : (body.evaluatedKernel.kernel.dramaticThesis ?? 'Untitled Kernel').slice(0, 80);

    const savedKernel: SavedKernel = {
      id,
      name: defaultName,
      createdAt: now,
      updatedAt: now,
      seeds: normalizeSeedInput(body.seeds ?? {}),
      evaluatedKernel: body.evaluatedKernel,
    };

    await saveKernel(savedKernel);
    return res.json({ success: true, kernel: savedKernel });
  }),
);

kernelRoutes.put(
  '/api/:kernelId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { kernelId } = req.params;
    const body = req.body as {
      name?: string;
      kernelFields?: Partial<StoryKernel>;
    };

    if (!(await kernelExists(kernelId as string))) {
      return res.status(404).json({ success: false, error: 'Kernel not found' });
    }

    const updated = await updateKernel(kernelId as string, (existing) => {
      const now = new Date().toISOString();
      const trimmedName = body.name?.trim();
      const updatedName = trimmedName && trimmedName.length > 0 ? trimmedName : existing.name;

      const updatedKernelFields = body.kernelFields
        ? { ...existing.evaluatedKernel.kernel, ...body.kernelFields }
        : existing.evaluatedKernel.kernel;

      return {
        ...existing,
        name: updatedName,
        updatedAt: now,
        evaluatedKernel: {
          ...existing.evaluatedKernel,
          kernel: updatedKernelFields,
        },
      };
    });

    return res.json({ success: true, kernel: updated });
  }),
);

kernelRoutes.delete(
  '/api/:kernelId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { kernelId } = req.params;

    if (!(await kernelExists(kernelId as string))) {
      return res.status(404).json({ success: false, error: 'Kernel not found' });
    }

    await deleteKernel(kernelId as string);
    return res.json({ success: true });
  }),
);

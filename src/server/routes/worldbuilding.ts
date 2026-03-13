import { type Request, type Response, Router } from 'express';
import { LLMError } from '../../llm/llm-client-types.js';
import { logger } from '../../logging/index.js';
import {
  createWorldbuilding,
  runWorldSeedGeneration,
  runWorldElaborationGeneration,
  decomposeRawWorldbuilding,
  loadWorldbuildingById,
  listWorldbuildings,
  listWorldbuildingsByConcept,
  patchWorldbuilding,
  deleteWorldbuildingById,
} from '../../services/worldbuilding-service.js';
import { buildLlmRouteErrorResult, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const worldbuildingRoutes = Router();

function trimOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseRequiredString(label: string, value: unknown): string | null {
  const trimmed = trimOptionalString(value);
  if (!trimmed) return null;
  return trimmed;
}

function readRouteParam(value: string | string[] | undefined): string {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === 'string' ? firstValue : '';
}

function handleLlmRouteError(
  res: Response,
  progress: ReturnType<typeof createRouteGenerationProgress>,
  error: LLMError,
  operation: string,
): Response {
  logger.error(`LLM error during ${operation}`, {
    message: error.message,
    code: error.code,
    retryable: error.retryable,
  });
  const { publicMessage, response } = buildLlmRouteErrorResult(error);
  progress.fail(publicMessage);
  return res.status(500).json(response);
}

function handleUnknownRouteError(
  res: Response,
  progress: ReturnType<typeof createRouteGenerationProgress>,
  error: unknown,
  operation: string,
): Response {
  const err = error instanceof Error ? error : new Error(String(error));
  progress.fail(err.message);
  logger.error(`Error during ${operation}`, { error: err.message, stack: err.stack });
  return res.status(500).json({ success: false, error: err.message });
}

// --- Page render ---

worldbuildingRoutes.get(
  '/',
  (_req: Request, res: Response) => {
    return res.render('pages/worldbuilding', {
      title: 'Worldbuilding - One More Branch',
      currentPath: '/worldbuilding',
    });
  },
);

// --- API: List ---

worldbuildingRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const worldbuildings = await listWorldbuildings();
    return res.json({ success: true, worldbuildings });
  }),
);

worldbuildingRoutes.get(
  '/api/by-concept/:conceptId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const conceptId = readRouteParam(req.params['conceptId']);
    const worldbuildings = await listWorldbuildingsByConcept(conceptId);
    return res.json({ success: true, worldbuildings });
  }),
);

// --- API: Load ---

worldbuildingRoutes.get(
  '/api/:id',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const id = readRouteParam(req.params['id']);
    const wb = await loadWorldbuildingById(id);
    if (!wb) {
      return res.status(404).json({ success: false, error: `Worldbuilding not found: ${id}` });
    }
    return res.json({ success: true, worldbuilding: wb });
  }),
);

// --- API: Create (pipeline) ---

worldbuildingRoutes.post(
  '/api/create',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const name = parseRequiredString('Name', body['name']);
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const wb = await createWorldbuilding(
      name,
      {
        userNotes: trimOptionalString(body['userNotes']),
        contentPreferences: trimOptionalString(body['contentPreferences']),
        startingSituation: trimOptionalString(body['startingSituation']),
        tone: trimOptionalString(body['tone']),
      },
      trimOptionalString(body['sourceConceptId']),
    );

    return res.status(201).json({ success: true, worldbuilding: wb });
  }),
);

// --- API: Decompose raw ---

worldbuildingRoutes.post(
  '/api/decompose-raw',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const name = parseRequiredString('Name', body['name']);
    const rawText = parseRequiredString('Raw worldbuilding text', body['rawText']);
    const apiKey = parseRequiredString('API key', body['apiKey']);
    const tone = trimOptionalString(body['tone']) ?? 'default';

    if (!name || !rawText || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Name, rawText, and apiKey are required',
      });
    }

    const progress = createRouteGenerationProgress(body['progressId'], 'worldbuilding-decompose');

    try {
      const wb = await decomposeRawWorldbuilding(
        name,
        rawText,
        apiKey,
        tone,
        progress.onGenerationStage,
      );
      progress.complete();
      return res.status(201).json({ success: true, worldbuilding: wb });
    } catch (error) {
      if (error instanceof LLMError) {
        return handleLlmRouteError(res, progress, error, 'worldbuilding decomposition');
      }
      return handleUnknownRouteError(res, progress, error, 'worldbuilding decomposition');
    }
  }),
);

// --- API: Generate seed ---

worldbuildingRoutes.post(
  '/api/:id/generate-seed',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const apiKey = parseRequiredString('API key', body['apiKey']);
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'API key is required' });
    }

    const progress = createRouteGenerationProgress(body['progressId'], 'worldbuilding-seed');

    try {
      const wb = await runWorldSeedGeneration(
        readRouteParam(req.params['id']),
        apiKey,
        progress.onGenerationStage,
      );
      progress.complete();
      return res.json({ success: true, worldbuilding: wb });
    } catch (error) {
      if (error instanceof LLMError) {
        return handleLlmRouteError(res, progress, error, 'world seed generation');
      }
      return handleUnknownRouteError(res, progress, error, 'world seed generation');
    }
  }),
);

// --- API: Generate elaboration ---

worldbuildingRoutes.post(
  '/api/:id/generate-elaboration',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const apiKey = parseRequiredString('API key', body['apiKey']);
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'API key is required' });
    }

    const progress = createRouteGenerationProgress(body['progressId'], 'worldbuilding-elaboration');

    try {
      const wb = await runWorldElaborationGeneration(
        readRouteParam(req.params['id']),
        apiKey,
        progress.onGenerationStage,
      );
      progress.complete();
      return res.json({ success: true, worldbuilding: wb });
    } catch (error) {
      if (error instanceof LLMError) {
        return handleLlmRouteError(res, progress, error, 'world elaboration generation');
      }
      return handleUnknownRouteError(res, progress, error, 'world elaboration generation');
    }
  }),
);

// --- API: Patch ---

worldbuildingRoutes.patch(
  '/api/:id',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const id = readRouteParam(req.params['id']);
    try {
      const body = req.body as Record<string, unknown>;
      const wb = await patchWorldbuilding(id, {
        ...(typeof body['name'] === 'string' ? { name: body['name'] } : {}),
      });
      return res.json({ success: true, worldbuilding: wb });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return res.status(500).json({ success: false, error: err.message });
    }
  }),
);

// --- API: Delete ---

worldbuildingRoutes.delete(
  '/api/:id',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    await deleteWorldbuildingById(readRouteParam(req.params['id']));
    return res.status(204).end();
  }),
);

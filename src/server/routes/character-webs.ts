import { type Request, type Response, Router } from 'express';
import { EngineError } from '../../engine/types.js';
import { LLMError } from '../../llm/llm-client-types.js';
import type { CharacterDevStage } from '../../models/character-pipeline-types.js';
import { logger } from '../../logging/index.js';
import { characterWebService } from '../services/index.js';
import { buildLlmRouteErrorResult, wrapAsyncRoute } from '../utils/index.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const characterWebRoutes = Router();

interface CharacterWebCreateBody {
  readonly name?: unknown;
  readonly sourceConceptId?: unknown;
  readonly userNotes?: unknown;
}

interface CharacterWebGenerateBody {
  readonly apiKey?: unknown;
  readonly progressId?: unknown;
}

interface CharacterInitBody {
  readonly characterName?: unknown;
}

interface CharacterStageBody {
  readonly stage?: unknown;
  readonly apiKey?: unknown;
  readonly progressId?: unknown;
}

function trimOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseRequiredString(label: string, value: unknown): string | null {
  const trimmed = trimOptionalString(value);
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function readRouteParam(value: string | string[] | undefined): string {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === 'string' ? firstValue : '';
}

function parseStage(value: unknown): CharacterDevStage | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) {
    return value as CharacterDevStage;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^[1-5]$/.test(trimmed)) {
    return null;
  }

  return Number(trimmed) as CharacterDevStage;
}

function mapKnownError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof EngineError)) {
    return null;
  }

  switch (error.code) {
    case 'VALIDATION_FAILED':
      return { status: 400, message: error.message };
    case 'RESOURCE_NOT_FOUND':
      return { status: 404, message: error.message };
    case 'RESOURCE_CONFLICT':
      return { status: 409, message: error.message };
    default:
      return null;
  }
}

function handleLlmRouteError(
  res: Response,
  progress: ReturnType<typeof createRouteGenerationProgress>,
  error: LLMError,
  operation: string
): Response {
  logger.error(`LLM error during ${operation}`, {
    message: error.message,
    code: error.code,
    retryable: error.retryable,
    httpStatus: error.context?.['httpStatus'],
    model: error.context?.['model'],
    parseStage: error.context?.['parseStage'],
  });

  const { publicMessage, response } = buildLlmRouteErrorResult(error);
  progress.fail(publicMessage);
  return res.status(500).json(response);
}

function handleUnknownRouteError(
  res: Response,
  progress: ReturnType<typeof createRouteGenerationProgress>,
  error: unknown,
  operation: string
): Response {
  const knownError = mapKnownError(error);
  if (knownError) {
    progress.fail(knownError.message);
    return res.status(knownError.status).json({ success: false, error: knownError.message });
  }

  const err = error instanceof Error ? error : new Error(String(error));
  progress.fail(err.message);
  logger.error(`Error during ${operation}`, { error: err.message, stack: err.stack });
  return res.status(500).json({ success: false, error: err.message });
}

characterWebRoutes.get(
  '/',
  (_req: Request, res: Response) => {
    return res.render('pages/character-webs', {
      title: 'Character Webs - One More Branch',
      currentPath: '/character-webs',
    });
  }
);

characterWebRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const webs = await characterWebService.listWebs();
    return res.json({ success: true, webs });
  })
);

characterWebRoutes.get(
  '/api/:webId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const webId = readRouteParam(req.params['webId']);
    const web = await characterWebService.loadWeb(webId);

    if (web === null) {
      return res.status(404).json({ success: false, error: `Character web not found: ${webId}` });
    }

    const characters = await characterWebService.listCharactersForWeb(web.id);
    return res.json({ success: true, web, characters });
  })
);

characterWebRoutes.post(
  '/api/create',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as CharacterWebCreateBody;
    const name = parseRequiredString('Character web name', body.name);

    if (!name) {
      return res.status(400).json({ success: false, error: 'Character web name is required' });
    }

    const sourceConceptId = parseRequiredString('Source concept', body.sourceConceptId);
    if (!sourceConceptId) {
      return res.status(400).json({ success: false, error: 'sourceConceptId is required' });
    }

    const web = await characterWebService.createWeb(
      name,
      sourceConceptId,
      trimOptionalString(body.userNotes),
    );

    return res.status(201).json({ success: true, web });
  })
);

characterWebRoutes.post(
  '/api/:webId/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as CharacterWebGenerateBody;
    const apiKey = parseRequiredString('OpenRouter API key', body.apiKey);

    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'character-web-generation');

    try {
      const web = await characterWebService.generateWeb(
        readRouteParam(req.params['webId']),
        apiKey,
        progress.onGenerationStage
      );
      progress.complete();
      return res.json({ success: true, web });
    } catch (error) {
      if (error instanceof LLMError) {
        return handleLlmRouteError(res, progress, error, 'character web generation');
      }

      return handleUnknownRouteError(res, progress, error, 'character web generation');
    }
  })
);

characterWebRoutes.post(
  '/api/:webId/regenerate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as CharacterWebGenerateBody;
    const apiKey = parseRequiredString('OpenRouter API key', body.apiKey);

    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'character-web-generation');

    try {
      const web = await characterWebService.regenerateWeb(
        readRouteParam(req.params['webId']),
        apiKey,
        progress.onGenerationStage
      );
      progress.complete();
      return res.json({ success: true, web });
    } catch (error) {
      if (error instanceof LLMError) {
        return handleLlmRouteError(res, progress, error, 'character web regeneration');
      }

      return handleUnknownRouteError(res, progress, error, 'character web regeneration');
    }
  })
);

characterWebRoutes.delete(
  '/api/:webId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    await characterWebService.deleteWeb(readRouteParam(req.params['webId']));
    return res.status(204).end();
  })
);

characterWebRoutes.get(
  '/api/:webId/characters',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const webId = readRouteParam(req.params['webId']);
    const web = await characterWebService.loadWeb(webId);

    if (web === null) {
      return res.status(404).json({ success: false, error: `Character web not found: ${webId}` });
    }

    const characters = await characterWebService.listCharactersForWeb(webId);
    return res.json({ success: true, characters });
  })
);

characterWebRoutes.post(
  '/api/:webId/characters/init',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as CharacterInitBody;
    const characterName = parseRequiredString('Character name', body.characterName);

    if (!characterName) {
      return res.status(400).json({ success: false, error: 'Character name is required' });
    }

    try {
      const character = await characterWebService.initializeCharacter(
        readRouteParam(req.params['webId']),
        characterName
      );
      return res.status(201).json({ success: true, character });
    } catch (error) {
      const knownError = mapKnownError(error);
      if (knownError) {
        return res.status(knownError.status).json({ success: false, error: knownError.message });
      }

      throw error;
    }
  })
);

characterWebRoutes.post(
  '/api/characters/:charId/generate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as CharacterStageBody;
    const stage = parseStage(body.stage);

    if (stage === null) {
      return res
        .status(400)
        .json({ success: false, error: 'Character stage must be an integer from 1 to 5' });
    }

    const apiKey = parseRequiredString('OpenRouter API key', body.apiKey);
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'character-stage-generation');

    try {
      const character = await characterWebService.generateCharacterStage(
        readRouteParam(req.params['charId']),
        stage,
        apiKey,
        progress.onGenerationStage
      );
      progress.complete();
      return res.json({ success: true, character });
    } catch (error) {
      if (error instanceof LLMError) {
        return handleLlmRouteError(res, progress, error, 'character stage generation');
      }

      return handleUnknownRouteError(res, progress, error, 'character stage generation');
    }
  })
);

characterWebRoutes.post(
  '/api/characters/:charId/regenerate',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as CharacterStageBody;
    const stage = parseStage(body.stage);

    if (stage === null) {
      return res
        .status(400)
        .json({ success: false, error: 'Character stage must be an integer from 1 to 5' });
    }

    const apiKey = parseRequiredString('OpenRouter API key', body.apiKey);
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'character-stage-generation');

    try {
      const character = await characterWebService.regenerateCharacterStage(
        readRouteParam(req.params['charId']),
        stage,
        apiKey,
        progress.onGenerationStage
      );
      progress.complete();
      return res.json({ success: true, character });
    } catch (error) {
      if (error instanceof LLMError) {
        return handleLlmRouteError(res, progress, error, 'character stage regeneration');
      }

      return handleUnknownRouteError(res, progress, error, 'character stage regeneration');
    }
  })
);

characterWebRoutes.get(
  '/api/characters/:charId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const charId = readRouteParam(req.params['charId']);
    const character = await characterWebService.loadCharacter(charId);

    if (character === null) {
      return res
        .status(404)
        .json({ success: false, error: `Developed character not found: ${charId}` });
    }

    return res.json({ success: true, character });
  })
);

characterWebRoutes.patch(
  '/api/characters/:charId/stages/:stage',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const charId = readRouteParam(req.params['charId']);
    const stage = parseStage(req.params['stage']);

    if (stage === null) {
      return res
        .status(400)
        .json({ success: false, error: 'Stage must be an integer from 1 to 5' });
    }

    try {
      const character = await characterWebService.patchCharacterStage(
        charId,
        stage,
        req.body,
      );
      return res.json({ success: true, character });
    } catch (error) {
      const knownError = mapKnownError(error);
      if (knownError) {
        return res.status(knownError.status).json({ success: false, error: knownError.message });
      }

      throw error;
    }
  })
);

characterWebRoutes.delete(
  '/api/characters/:charId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    await characterWebService.deleteCharacter(readRouteParam(req.params['charId']));
    return res.status(204).end();
  })
);

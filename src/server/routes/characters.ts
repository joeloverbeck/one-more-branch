import { randomUUID } from 'node:crypto';
import { type Request, type Response, Router } from 'express';
import { decomposeCharacter } from '../../llm/character-decomposer.js';
import { LLMError } from '../../llm/llm-client-types.js';
import { logger } from '../../logging/index.js';
import {
  saveCharacter,
  loadCharacter,
  listCharacters,
  deleteCharacter,
} from '../../persistence/character-repository.js';
import { buildLlmRouteErrorResult, wrapAsyncRoute } from '../utils/index.js';
import { flattenParam } from '../utils/request-normalizers.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

export const characterRoutes = Router();

characterRoutes.get(
  '/',
  (_req: Request, res: Response) => {
    res.render('pages/characters', {
      title: 'Character Profiles - One More Branch',
    });
  }
);

characterRoutes.post(
  '/decompose',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      characterName?: unknown;
      characterDescription?: unknown;
      apiKey?: unknown;
      progressId?: unknown;
    };

    const characterName = typeof body.characterName === 'string' ? body.characterName.trim() : '';
    const characterDescription =
      typeof body.characterDescription === 'string' ? body.characterDescription.trim() : '';
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';

    if (characterName.length === 0) {
      return res.status(400).json({ success: false, error: 'Character name is required' });
    }

    if (characterDescription.length < 10) {
      return res
        .status(400)
        .json({ success: false, error: 'Character description must be at least 10 characters' });
    }

    if (apiKey.length < 10) {
      return res
        .status(400)
        .json({ success: false, error: 'OpenRouter API key is required' });
    }

    const progress = createRouteGenerationProgress(body.progressId, 'character-decomposition');
    if (progress.progressId) {
      progress.onGenerationStage?.({
        stage: 'DECOMPOSING_CHARACTER',
        status: 'started',
        attempt: 1,
      });
    }

    try {
      const result = await decomposeCharacter(
        { characterName, characterDescription },
        apiKey
      );

      const characterId = `char-${randomUUID()}`;
      const now = new Date().toISOString();

      const standaloneCharacter = {
        id: characterId,
        ...result.character,
        createdAt: now,
      };

      await saveCharacter(standaloneCharacter);

      if (progress.progressId) {
        progress.onGenerationStage?.({
          stage: 'DECOMPOSING_CHARACTER',
          status: 'completed',
          attempt: 1,
        });
        progress.complete();
      }

      return res.json({
        success: true,
        character: standaloneCharacter,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        const { publicMessage, response } = buildLlmRouteErrorResult(error, {
          includeDebug: false,
        });
        progress.fail(publicMessage);
        return res.status(500).json(response);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      progress.fail(err.message);
      logger.error('Error decomposing character:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  })
);

characterRoutes.get(
  '/api/list',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const characters = await listCharacters();
    return res.json({ success: true, characters });
  })
);

characterRoutes.get(
  '/api/:characterId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const characterId = flattenParam(req.params['characterId']) ?? '';
    const character = await loadCharacter(characterId);

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    return res.json({ success: true, character });
  })
);

characterRoutes.delete(
  '/api/:characterId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const characterId = flattenParam(req.params['characterId']) ?? '';
    await deleteCharacter(characterId);
    return res.json({ success: true });
  })
);

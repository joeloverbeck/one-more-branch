import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { LLMError } from '../../llm/types';
import { logger } from '../../logging/index.js';
import { StoryId } from '../../models';
import { logLLMError, StoryFormInput, validateStoryInput } from '../services/index.js';
import { formatLLMError, wrapAsyncRoute } from '../utils/index.js';

export const storyRoutes = Router();

storyRoutes.get('/new', (_req: Request, res: Response) => {
  res.render('pages/new-story', {
    title: 'New Adventure - One More Branch',
    error: null,
    values: {},
  });
});

storyRoutes.post('/create', wrapAsyncRoute(async (req: Request, res: Response) => {
  const input = req.body as StoryFormInput;
  const validation = validateStoryInput(input);
  const formValues = {
    title: input.title,
    characterConcept: input.characterConcept,
    worldbuilding: input.worldbuilding,
    tone: input.tone,
    npcs: input.npcs ?? [],
    startingSituation: input.startingSituation,
  };

  if (!validation.valid) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: validation.error,
      values: formValues,
    });
  }

  try {
    const result = await storyEngine.startStory(validation.trimmed);
    return res.redirect(`/play/${result.story.id}?page=1&newStory=true`);
  } catch (error) {
    if (error instanceof LLMError) {
      logLLMError(error, 'creating story');
      return res.status(500).render('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: formatLLMError(error),
        values: formValues,
      });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error creating story:', { error: err.message, stack: err.stack });
    return res.status(500).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: err.message,
      values: formValues,
    });
  }
}));

storyRoutes.post('/create-ajax', wrapAsyncRoute(async (req: Request, res: Response) => {
  const input = req.body as StoryFormInput;
  const validation = validateStoryInput(input);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  try {
    const result = await storyEngine.startStory(validation.trimmed);
    return res.json({
      success: true,
      storyId: result.story.id,
    });
  } catch (error) {
    if (error instanceof LLMError) {
      logLLMError(error, 'creating story (AJAX)');

      const errorResponse: {
        success: false;
        error: string;
        code?: string;
        retryable?: boolean;
        debug?: {
          httpStatus?: number;
          model?: string;
          rawError?: string;
          parseStage?: string;
          contentShape?: string;
          contentPreview?: string;
          rawContent?: string;
        };
      } = {
        success: false,
        error: formatLLMError(error),
        code: error.code,
        retryable: error.retryable,
      };

      if (process.env['NODE_ENV'] !== 'production') {
        errorResponse.debug = {
          httpStatus: error.context?.['httpStatus'] as number | undefined,
          model: error.context?.['model'] as string | undefined,
          rawError: error.context?.['rawErrorBody'] as string | undefined,
          parseStage: error.context?.['parseStage'] as string | undefined,
          contentShape: error.context?.['contentShape'] as string | undefined,
          contentPreview: error.context?.['contentPreview'] as string | undefined,
          rawContent: error.context?.['rawContent'] as string | undefined,
        };
      }

      return res.status(500).json(errorResponse);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error creating story:', { error: err.message, stack: err.stack });
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}));

storyRoutes.post('/:storyId/delete', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { storyId } = req.params;

  try {
    await storyEngine.deleteStory(storyId as StoryId);
    return res.redirect('/');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error deleting story:', { error: err.message, stack: err.stack });
    return res.redirect('/');
  }
}));

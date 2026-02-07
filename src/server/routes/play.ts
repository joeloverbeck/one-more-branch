import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine/index.js';
import { LLMError } from '../../llm/types.js';
import { generateBrowserLogScript, logger } from '../../logging/index.js';
import { PageId, StoryId } from '../../models/index.js';
import { formatLLMError, getActDisplayInfo, wrapAsyncRoute } from '../utils/index.js';

type ChoiceBody = {
  pageId?: number;
  choiceIndex?: number;
  apiKey?: string;
};

function parseRequestedPageId(pageQuery: unknown): number {
  const pageInput = typeof pageQuery === 'string' || typeof pageQuery === 'number' ? String(pageQuery) : '';
  const parsed = Number.parseInt(pageInput, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export const playRoutes = Router();

playRoutes.get('/:storyId', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { storyId } = req.params;
  const pageId = parseRequestedPageId(req.query['page']);

  try {
    const story = await storyEngine.loadStory(storyId as StoryId);
    if (!story) {
      return res.status(404).render('pages/error', {
        title: 'Not Found',
        message: 'Story not found',
      });
    }

    const page = await storyEngine.getPage(storyId as StoryId, pageId as PageId);
    if (!page) {
      return res.status(404).render('pages/error', {
        title: 'Not Found',
        message: 'Page not found',
      });
    }

    const actDisplayInfo = getActDisplayInfo(story, page);

    return res.render('pages/play', {
      title: `${story.title} - One More Branch`,
      story,
      page,
      pageId,
      actDisplayInfo,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error loading play page:', { error: err.message, stack: err.stack });
    return res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Failed to load story',
    });
  }
}));

playRoutes.post('/:storyId/choice', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { storyId } = req.params;
  const { pageId, choiceIndex, apiKey } = req.body as ChoiceBody;

  if (pageId === undefined || choiceIndex === undefined) {
    return res.status(400).json({ error: 'Missing pageId or choiceIndex' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }

  try {
    const result = await storyEngine.makeChoice({
      storyId: storyId as StoryId,
      pageId: pageId as PageId,
      choiceIndex,
      apiKey,
    });

    // Load story to compute actDisplayInfo for the new page
    const story = await storyEngine.loadStory(storyId as StoryId);
    const actDisplayInfo = story ? getActDisplayInfo(story, result.page) : null;

    // Extract logs for browser console and clear to prevent accumulation
    const logEntries = logger.getEntries();
    const logScript = generateBrowserLogScript(logEntries);
    logger.clear();

    return res.json({
      success: true,
      page: {
        id: result.page.id,
        narrativeText: result.page.narrativeText,
        choices: result.page.choices,
        stateChanges: result.page.stateChanges,
        isEnding: result.page.isEnding,
      },
      actDisplayInfo,
      wasGenerated: result.wasGenerated,
      deviationInfo: result.deviationInfo,
      logScript,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Log full LLMError context for debugging
    if (error instanceof LLMError) {
      logger.error('LLM error making choice:', {
        message: error.message,
        code: error.code,
        retryable: error.retryable,
        httpStatus: error.context?.['httpStatus'],
        model: error.context?.['model'],
        parsedError: error.context?.['parsedError'],
        rawErrorBody: error.context?.['rawErrorBody'],
      });
    } else {
      logger.error('Error making choice:', { error: err.message, stack: err.stack });
    }

    let errorMessage = err.message;
    if (error instanceof LLMError) {
      errorMessage = formatLLMError(error);
    }

    // Build enhanced error response
    const errorResponse: {
      error: string;
      code?: string;
      retryable?: boolean;
      debug?: {
        httpStatus?: number;
        model?: string;
        rawError?: string;
      };
    } = {
      error: errorMessage,
    };

    if (error instanceof LLMError) {
      errorResponse.code = error.code;
      errorResponse.retryable = error.retryable;

      // Include debug info only in development
      if (process.env['NODE_ENV'] !== 'production') {
        errorResponse.debug = {
          httpStatus: error.context?.['httpStatus'] as number | undefined,
          model: error.context?.['model'] as string | undefined,
          rawError: error.context?.['rawErrorBody'] as string | undefined,
        };
      }
    }

    return res.status(500).json(errorResponse);
  }
}));

playRoutes.get('/:storyId/restart', (req: Request, res: Response) => {
  const { storyId } = req.params;
  res.redirect(`/play/${storyId}?page=1`);
});

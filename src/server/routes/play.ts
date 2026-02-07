import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine/index.js';
import { generateBrowserLogScript, logger } from '../../logging/index.js';
import { PageId, StoryId } from '../../models/index.js';

type ChoiceBody = {
  pageId?: number;
  choiceIndex?: number;
  apiKey?: string;
};

function wrapAsyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    void handler(req, res);
  };
}

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

    return res.render('pages/play', {
      title: `${story.title} - One More Branch`,
      story,
      page,
      pageId,
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
      wasGenerated: result.wasGenerated,
      logScript,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Error making choice:', { error: err.message, stack: err.stack });
    return res.status(500).json({
      error: err.message,
    });
  }
}));

playRoutes.get('/:storyId/restart', (req: Request, res: Response) => {
  const { storyId } = req.params;
  res.redirect(`/play/${storyId}?page=1`);
});

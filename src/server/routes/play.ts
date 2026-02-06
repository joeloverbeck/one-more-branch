import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { PageId, StoryId } from '../../models';

type ChoiceBody = {
  pageId?: number;
  choiceIndex?: number;
  apiKey?: string;
};

function parseRequestedPageId(pageQuery: unknown): number {
  const parsed = Number.parseInt(String(pageQuery ?? ''), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export const playRoutes = Router();

playRoutes.get('/:storyId', async (req: Request, res: Response) => {
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
      title: `${story.characterConcept.slice(0, 50)} - One More Branch`,
      story,
      page,
      pageId,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading play page:', error);
    return res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Failed to load story',
    });
  }
});

playRoutes.post('/:storyId/choice', async (req: Request, res: Response) => {
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
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error making choice:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process choice',
    });
  }
});

playRoutes.get('/:storyId/restart', async (req: Request, res: Response) => {
  const { storyId } = req.params;
  return res.redirect(`/play/${storyId}?page=1`);
});

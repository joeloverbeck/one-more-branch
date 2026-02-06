import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { StoryId } from '../../models';

type StoryFormBody = {
  characterConcept?: string;
  worldbuilding?: string;
  tone?: string;
  apiKey?: string;
};

export const storyRoutes = Router();

function wrapAsyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    void handler(req, res);
  };
}

storyRoutes.get('/new', (_req: Request, res: Response) => {
  res.render('pages/new-story', {
    title: 'New Adventure - One More Branch',
    error: null,
    values: {},
  });
});

storyRoutes.post('/create', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { characterConcept, worldbuilding, tone, apiKey } = req.body as StoryFormBody;
  const trimmedCharacterConcept = characterConcept?.trim();
  const trimmedWorldbuilding = worldbuilding?.trim();
  const trimmedTone = tone?.trim();
  const trimmedApiKey = apiKey?.trim();

  if (!trimmedCharacterConcept || trimmedCharacterConcept.length < 10) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'Character concept must be at least 10 characters',
      values: { characterConcept, worldbuilding, tone },
    });
  }

  if (!trimmedApiKey || trimmedApiKey.length < 10) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'OpenRouter API key is required',
      values: { characterConcept, worldbuilding, tone },
    });
  }

  try {
    const result = await storyEngine.startStory({
      characterConcept: trimmedCharacterConcept,
      worldbuilding: trimmedWorldbuilding,
      tone: trimmedTone,
      apiKey: trimmedApiKey,
    });

    return res.redirect(`/play/${result.story.id}?page=1&newStory=true`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating story:', error);
    return res.status(500).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: error instanceof Error ? error.message : 'Failed to create story',
      values: { characterConcept, worldbuilding, tone },
    });
  }
}));

storyRoutes.post('/:storyId/delete', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { storyId } = req.params;

  try {
    await storyEngine.deleteStory(storyId as StoryId);
    return res.redirect('/');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting story:', error);
    return res.redirect('/');
  }
}));

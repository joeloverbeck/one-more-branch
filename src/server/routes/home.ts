import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';

export const homeRoutes = Router();

function wrapAsyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    void handler(req, res);
  };
}

homeRoutes.get('/', wrapAsyncRoute(async (_req: Request, res: Response) => {
  try {
    const stories = await storyEngine.listStories();
    const storiesWithStats = await Promise.all(
      stories.map(async (story) => {
        const stats = await storyEngine.getStoryStats(story.id);
        return {
          ...story,
          ...stats,
        };
      }),
    );

    res.render('pages/home', {
      title: 'One More Branch',
      stories: storiesWithStats,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading home page:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Failed to load stories',
    });
  }
}));

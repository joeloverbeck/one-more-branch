import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { logger } from '../../logging/index.js';
import { wrapAsyncRoute } from '../utils/index.js';

export const homeRoutes = Router();

homeRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    try {
      const stories = await storyEngine.listStories();
      const storiesWithStats = await Promise.all(
        stories.map(async (story) => {
          const stats = await storyEngine.getStoryStats(story.id);
          return {
            ...story,
            ...stats,
          };
        })
      );

      res.render('pages/home', {
        title: 'One More Branch',
        stories: storiesWithStats,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error loading home page:', { error: err.message, stack: err.stack });
      res.status(500).render('pages/error', {
        title: 'Error',
        message: 'Failed to load stories',
      });
    }
  })
);

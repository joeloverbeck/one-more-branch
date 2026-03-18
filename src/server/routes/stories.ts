import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { logger } from '../../logging/index.js';
import { StoryId } from '../../models';
import { wrapAsyncRoute } from '../utils/index.js';

export const storyRoutes = Router();

storyRoutes.post(
  '/:storyId/delete',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;

    try {
      await storyEngine.deleteStory(storyId as StoryId);
      return res.redirect('/');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error deleting story:', { error: err.message, stack: err.stack });
      return res.redirect('/');
    }
  })
);

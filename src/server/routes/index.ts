import { Router } from 'express';
import { homeRoutes } from './home';
import { playRoutes } from './play';
import { progressRoutes } from './progress';
import { storyRoutes } from './stories';

export const router = Router();

router.use('/', homeRoutes);
router.use('/stories', storyRoutes);
router.use('/play', playRoutes);
router.use('/generation-progress', progressRoutes);

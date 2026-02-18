import { Router } from 'express';
import { conceptRoutes } from './concepts';
import { homeRoutes } from './home';
import { logRoutes } from './logs';
import { playRoutes } from './play';
import { progressRoutes } from './progress';
import { storyRoutes } from './stories';

export const router = Router();

router.use('/', homeRoutes);
router.use('/concepts', conceptRoutes);
router.use('/logs', logRoutes);
router.use('/stories', storyRoutes);
router.use('/play', playRoutes);
router.use('/generation-progress', progressRoutes);

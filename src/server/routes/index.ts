import { Router } from 'express';
import { homeRoutes } from './home';
import { playRoutes } from './play';
import { storyRoutes } from './stories';

export const router = Router();

router.use('/', homeRoutes);
router.use('/stories', storyRoutes);
router.use('/play', playRoutes);

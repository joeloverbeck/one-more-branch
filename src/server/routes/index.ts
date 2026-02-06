import { Router } from 'express';
import { homeRoutes } from './home';
import { storyRoutes } from './stories';

export const router = Router();

router.use('/', homeRoutes);
router.use('/stories', storyRoutes);

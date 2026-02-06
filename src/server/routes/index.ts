import { Router } from 'express';
import { homeRoutes } from './home';

export const router = Router();

router.use('/', homeRoutes);

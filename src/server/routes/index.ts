import { Router } from 'express';
import { characterRoutes } from './characters';
import { characterWebRoutes } from './character-webs';
import { conceptSeedRoutes } from './concept-seeds';
import { conceptRoutes } from './concepts';
import { contentPacketRoutes } from './content-packets';
import { evolutionRoutes } from './evolution';
import { homeRoutes } from './home';
import { kernelEvolutionRoutes } from './kernel-evolution';
import { kernelRoutes } from './kernels';
import { logRoutes } from './logs';
import { playRoutes } from './play';
import { progressRoutes } from './progress';
import { storyRoutes } from './stories';
import { worldbuildingRoutes } from './worldbuilding';

export const router = Router();

router.use((_req, res, next) => {
  res.locals['currentPath'] = _req.path;
  next();
});

router.use('/', homeRoutes);
router.use('/characters', characterRoutes);
router.use('/character-webs', characterWebRoutes);
router.use('/concept-seeds', conceptSeedRoutes);
router.use('/concepts', conceptRoutes);
router.use('/evolve', evolutionRoutes);
router.use('/evolve-kernels', kernelEvolutionRoutes);
router.use('/kernels', kernelRoutes);
router.use('/logs', logRoutes);
router.use('/stories', storyRoutes);
router.use('/play', playRoutes);
router.use('/content-packets', contentPacketRoutes);
router.use('/worldbuilding', worldbuildingRoutes);
router.use('/generation-progress', progressRoutes);

import { Request, Response, Router } from 'express';
import { generationProgressService } from '../services/index.js';
import { flattenParam } from '../utils/index.js';

export const progressRoutes = Router();

progressRoutes.get('/:progressId', (req: Request, res: Response) => {
  const progressId = flattenParam(req.params['progressId']) ?? '';
  const snapshot = generationProgressService.get(progressId);

  return res.json({
    status: snapshot.status,
    activeStage: snapshot.activeStage,
    completedStages: snapshot.completedStages,
    updatedAt: snapshot.updatedAt,
    flowType: snapshot.flowType,
    stageDurations: snapshot.stageDurations,
  });
});

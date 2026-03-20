import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { EngineError, type GenerationStageEvent } from '../../engine';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import { loadConcept } from '../../persistence/concept-repository.js';
import { loadKernel } from '../../persistence/kernel-repository.js';
import { listSpines, loadSpine } from '../../persistence/spine-repository.js';
import { logLLMError } from '../services/story-creation-service.js';
import { generationProgressService } from '../services/index.js';
import { buildLlmRouteErrorResult, parseProgressId, wrapAsyncRoute } from '../utils/index.js';

export const createStoryRoutes = Router();

createStoryRoutes.get(
  '/',
  wrapAsyncRoute(async (_req: Request, res: Response) => {
    const savedSpines = await listSpines();
    return res.render('pages/create-story', {
      title: 'Create Story - One More Branch',
      savedSpines,
    });
  })
);

createStoryRoutes.post(
  '/api/create',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      spineId?: string;
      title?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const spineId = body.spineId?.trim();
    const title = body.title?.trim();
    const apiKey = body.apiKey?.trim();

    if (!spineId) {
      return res.status(400).json({ success: false, error: 'Spine selection is required' });
    }
    if (!title || title.length === 0) {
      return res.status(400).json({ success: false, error: 'Story title is required' });
    }
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    const progressId = parseProgressId(body.progressId);
    if (progressId) {
      generationProgressService.start(progressId, 'create-story');
    }

    try {
      const spine = await loadSpine(spineId);
      if (!spine) {
        if (progressId) generationProgressService.fail(progressId, 'Spine not found');
        return res.status(404).json({ success: false, error: 'Selected spine not found' });
      }

      const concept = await loadConcept(spine.sourceConceptId);
      if (!concept) {
        if (progressId) generationProgressService.fail(progressId, 'Source concept not found');
        return res.status(404).json({
          success: false,
          error: 'Source concept for the selected spine no longer exists',
        });
      }

      const kernel = await loadKernel(concept.sourceKernelId);
      if (!kernel) {
        if (progressId) generationProgressService.fail(progressId, 'Source kernel not found');
        return res.status(404).json({
          success: false,
          error: 'Source kernel for the selected concept no longer exists',
        });
      }

      const result = await storyEngine.prepareStory({
        title,
        protagonistCharacterId: spine.protagonistCharacterId,
        npcCharacterIds: spine.npcCharacterIds.length > 0 ? spine.npcCharacterIds : undefined,
        worldbuildingId: spine.worldbuildingId || undefined,
        tone: spine.tone || undefined,
        startingSituation: spine.startingSituation || undefined,
        conceptSpec: concept.evaluatedConcept.concept,
        storyKernel: kernel.evaluatedKernel.kernel,
        conceptVerification: concept.verificationResult,
        spine: spine.spineOption,
        apiKey,
        onGenerationStage: progressId
          ? (event: GenerationStageEvent): void => {
              if (event.status === 'started') {
                generationProgressService.markStageStarted(progressId, event.stage, event.attempt);
              } else {
                generationProgressService.markStageCompleted(
                  progressId,
                  event.stage,
                  event.attempt
                );
              }
            }
          : undefined,
      });

      if (progressId) generationProgressService.complete(progressId);

      return res.json({ success: true, storyId: result.story.id });
    } catch (error) {
      if (error instanceof LLMError) {
        logLLMError(error, 'creating story from spine');
        const { publicMessage, response } = buildLlmRouteErrorResult(error);
        if (progressId) generationProgressService.fail(progressId, publicMessage);
        return res.status(500).json(response);
      }

      if (error instanceof EngineError) {
        const status = error.code === 'VALIDATION_FAILED' ? 400 : 500;
        if (progressId) generationProgressService.fail(progressId, error.message);
        return res.status(status).json({ success: false, error: error.message });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (progressId) generationProgressService.fail(progressId, err.message);
      logger.error('Error creating story from spine:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: err.message });
    }
  })
);

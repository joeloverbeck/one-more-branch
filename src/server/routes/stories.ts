import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import type { GenerationStageEvent } from '../../engine';
import { generateStorySpines } from '../../llm/spine-generator.js';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import type { ConceptDimensionScores, ConceptSpec } from '../../models/index.js';
import { StoryId } from '../../models';
import type { StorySpine } from '../../models/story-spine.js';
import { generationProgressService } from '../services/index.js';
import {
  conceptService,
  logLLMError,
  StoryFormInput,
  validateStoryInput,
} from '../services/index.js';
import { formatLLMError, parseProgressId, wrapAsyncRoute } from '../utils/index.js';

export const storyRoutes = Router();

function hasAtLeastOneConceptSeed(body: {
  genreVibes?: string;
  moodKeywords?: string;
  contentPreferences?: string;
  thematicInterests?: string;
  sparkLine?: string;
}): boolean {
  return [
    body.genreVibes,
    body.moodKeywords,
    body.contentPreferences,
    body.thematicInterests,
    body.sparkLine,
  ].some((value) => value?.trim());
}

storyRoutes.get('/new', (_req: Request, res: Response) => {
  res.render('pages/new-story', {
    title: 'New Adventure - One More Branch',
    error: null,
    values: {},
  });
});

storyRoutes.post(
  '/create',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const input = req.body as StoryFormInput;
    const validation = validateStoryInput(input);
    const formValues = {
      title: input.title,
      characterConcept: input.characterConcept,
      worldbuilding: input.worldbuilding,
      tone: input.tone,
      npcs: input.npcs ?? [],
      startingSituation: input.startingSituation,
    };

    if (!validation.valid) {
      return res.status(400).render('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: validation.error,
        values: formValues,
      });
    }

    try {
      const selectedSpine = (req.body as { spine?: StorySpine }).spine;
      if (!selectedSpine) {
        return res.status(400).render('pages/new-story', {
          title: 'New Adventure - One More Branch',
          error: 'Story spine is required. Please generate and select a spine first.',
          values: formValues,
        });
      }
      const result = await storyEngine.prepareStory({ ...validation.trimmed, spine: selectedSpine });
      return res.redirect(`/play/${result.story.id}/briefing`);
    } catch (error) {
      if (error instanceof LLMError) {
        logLLMError(error, 'creating story');
        return res.status(500).render('pages/new-story', {
          title: 'New Adventure - One More Branch',
          error: formatLLMError(error),
          values: formValues,
        });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error creating story:', { error: err.message, stack: err.stack });
      return res.status(500).render('pages/new-story', {
        title: 'New Adventure - One More Branch',
        error: err.message,
        values: formValues,
      });
    }
  })
);

storyRoutes.post(
  '/generate-spines',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      characterConcept?: string;
      worldbuilding?: string;
      tone?: string;
      npcs?: Array<{ name?: string; description?: string }>;
      startingSituation?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const characterConcept = body.characterConcept?.trim();
    const apiKey = body.apiKey?.trim();

    if (!characterConcept || characterConcept.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Character concept must be at least 10 characters',
      });
    }

    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'OpenRouter API key is required',
      });
    }

    const progressId = parseProgressId(body.progressId);
    if (progressId) {
      generationProgressService.start(progressId, 'new-story');
      generationProgressService.markStageStarted(progressId, 'GENERATING_SPINE', 1);
    }

    try {
      const validNpcs = body.npcs
        ?.map((npc) => ({
          name: (npc.name ?? '').trim(),
          description: (npc.description ?? '').trim(),
        }))
        .filter((npc) => npc.name.length > 0 && npc.description.length > 0);

      const result = await generateStorySpines(
        {
          characterConcept,
          worldbuilding: body.worldbuilding?.trim() ?? '',
          tone: body.tone?.trim() ?? 'fantasy adventure',
          npcs: validNpcs && validNpcs.length > 0 ? validNpcs : undefined,
          startingSituation: body.startingSituation?.trim(),
        },
        apiKey
      );

      if (progressId) {
        generationProgressService.markStageCompleted(progressId, 'GENERATING_SPINE', 1);
        generationProgressService.complete(progressId);
      }

      return res.json({
        success: true,
        options: result.options,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logLLMError(error, 'generating spines');
        const formattedError = formatLLMError(error);
        if (progressId) {
          generationProgressService.fail(progressId, formattedError);
        }
        return res.status(500).json({
          success: false,
          error: formattedError,
          code: error.code,
          retryable: error.retryable,
        });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (progressId) {
        generationProgressService.fail(progressId, err.message);
      }
      logger.error('Error generating spines:', { error: err.message, stack: err.stack });
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  })
);

storyRoutes.post(
  '/generate-concepts',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      genreVibes?: string;
      moodKeywords?: string;
      contentPreferences?: string;
      thematicInterests?: string;
      sparkLine?: string;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'OpenRouter API key is required',
      });
    }

    if (!hasAtLeastOneConceptSeed(body)) {
      return res.status(400).json({
        success: false,
        error: 'At least one concept seed field is required',
      });
    }

    const progressId = parseProgressId(body.progressId);
    if (progressId) {
      generationProgressService.start(progressId, 'new-story');
    }

    try {
      const result = await conceptService.generateConcepts({
        genreVibes: body.genreVibes,
        moodKeywords: body.moodKeywords,
        contentPreferences: body.contentPreferences,
        thematicInterests: body.thematicInterests,
        sparkLine: body.sparkLine,
        apiKey,
      });

      if (progressId) {
        generationProgressService.complete(progressId);
      }

      return res.json({
        success: true,
        evaluatedConcepts: result.evaluatedConcepts,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logLLMError(error, 'generating concepts');
        const formattedError = formatLLMError(error);
        if (progressId) {
          generationProgressService.fail(progressId, formattedError);
        }
        return res.status(500).json({
          success: false,
          error: formattedError,
          code: error.code,
          retryable: error.retryable,
        });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (progressId) {
        generationProgressService.fail(progressId, err.message);
      }
      logger.error('Error generating concepts:', { error: err.message, stack: err.stack });
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  })
);

storyRoutes.post(
  '/stress-test-concept',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const body = req.body as {
      concept?: unknown;
      scores?: unknown;
      weaknesses?: unknown;
      apiKey?: string;
      progressId?: unknown;
    };

    const apiKey = body.apiKey?.trim();
    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'OpenRouter API key is required',
      });
    }

    if (!body.concept || typeof body.concept !== 'object' || Array.isArray(body.concept)) {
      return res.status(400).json({
        success: false,
        error: 'Concept is required',
      });
    }

    if (!body.scores || typeof body.scores !== 'object' || Array.isArray(body.scores)) {
      return res.status(400).json({
        success: false,
        error: 'Concept scores are required',
      });
    }

    if (!Array.isArray(body.weaknesses)) {
      return res.status(400).json({
        success: false,
        error: 'Concept weaknesses are required',
      });
    }

    const progressId = parseProgressId(body.progressId);
    if (progressId) {
      generationProgressService.start(progressId, 'new-story');
    }

    try {
      const result = await conceptService.stressTestConcept({
        concept: body.concept as ConceptSpec,
        scores: body.scores as ConceptDimensionScores,
        weaknesses: body.weaknesses as readonly string[],
        apiKey,
      });

      if (progressId) {
        generationProgressService.complete(progressId);
      }

      return res.json({
        success: true,
        hardenedConcept: result.hardenedConcept,
        driftRisks: result.driftRisks,
        playerBreaks: result.playerBreaks,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logLLMError(error, 'stress-testing concept');
        const formattedError = formatLLMError(error);
        if (progressId) {
          generationProgressService.fail(progressId, formattedError);
        }
        return res.status(500).json({
          success: false,
          error: formattedError,
          code: error.code,
          retryable: error.retryable,
        });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (progressId) {
        generationProgressService.fail(progressId, err.message);
      }
      logger.error('Error stress-testing concept:', { error: err.message, stack: err.stack });
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  })
);

storyRoutes.post(
  '/create-ajax',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const progressId = parseProgressId((req.body as { progressId?: unknown })?.progressId);
    if (progressId) {
      generationProgressService.start(progressId, 'new-story');
    }

    const input = req.body as StoryFormInput;
    const validation = validateStoryInput(input);

    if (!validation.valid) {
      if (progressId) {
        generationProgressService.fail(progressId, validation.error);
      }

      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const selectedSpine = (req.body as { spine?: StorySpine }).spine;
    if (!selectedSpine) {
      if (progressId) {
        generationProgressService.fail(progressId, 'Story spine is required');
      }
      return res.status(400).json({
        success: false,
        error: 'Story spine is required. Please generate and select a spine first.',
      });
    }

    try {
      const result = await storyEngine.prepareStory({
        ...validation.trimmed,
        spine: selectedSpine,
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

      if (progressId) {
        generationProgressService.complete(progressId);
      }

      return res.json({
        success: true,
        storyId: result.story.id,
      });
    } catch (error) {
      if (error instanceof LLMError) {
        logLLMError(error, 'creating story (AJAX)');
        const formattedError = formatLLMError(error);
        if (progressId) {
          generationProgressService.fail(progressId, formattedError);
        }

        const errorResponse: {
          success: false;
          error: string;
          code?: string;
          retryable?: boolean;
          debug?: {
            httpStatus?: number;
            model?: string;
            rawError?: string;
            parseStage?: string;
            contentShape?: string;
            contentPreview?: string;
            rawContent?: string;
          };
        } = {
          success: false,
          error: formattedError,
          code: error.code,
          retryable: error.retryable,
        };

        if (process.env['NODE_ENV'] !== 'production') {
          errorResponse.debug = {
            httpStatus: error.context?.['httpStatus'] as number | undefined,
            model: error.context?.['model'] as string | undefined,
            rawError: error.context?.['rawErrorBody'] as string | undefined,
            parseStage: error.context?.['parseStage'] as string | undefined,
            contentShape: error.context?.['contentShape'] as string | undefined,
            contentPreview: error.context?.['contentPreview'] as string | undefined,
            rawContent: error.context?.['rawContent'] as string | undefined,
          };
        }

        return res.status(500).json(errorResponse);
      }

      const err = error instanceof Error ? error : new Error(String(error));
      if (progressId) {
        generationProgressService.fail(progressId, err.message);
      }
      logger.error('Error creating story:', { error: err.message, stack: err.stack });
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  })
);

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

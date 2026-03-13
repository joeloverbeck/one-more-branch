import { Request, Response, Router } from 'express';
import { storyEngine } from '../../engine';
import { EngineError, type GenerationStageEvent } from '../../engine';
import { generateStorySpines } from '../../llm/spine-generator.js';
import { LLMError } from '../../llm/llm-client-types';
import { logger } from '../../logging/index.js';
import { StoryId } from '../../models';
import { isConceptSpec } from '../../models/concept-generator.js';
import type { ConceptSpec, ConceptVerification } from '../../models/concept-generator.js';
import type { StorySpine } from '../../models/story-spine.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import { isStoryKernel } from '../../models/story-kernel.js';
import { loadCharacter } from '../../persistence/character-repository.js';
import { generationProgressService } from '../services/index.js';
import { logLLMError, StoryFormInput, validateStoryInput } from '../services/index.js';
import {
  buildLlmRouteErrorResult,
  formatLLMError,
  parseProgressId,
  wrapAsyncRoute,
} from '../utils/index.js';

export const storyRoutes = Router();

function mapKnownError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof EngineError)) {
    return null;
  }

  switch (error.code) {
    case 'VALIDATION_FAILED':
      return { status: 400, message: error.message };
    case 'RESOURCE_NOT_FOUND':
      return { status: 404, message: error.message };
    default:
      return null;
  }
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

      const knownError = mapKnownError(error);
      if (knownError) {
        return res.status(knownError.status).render('pages/new-story', {
          title: 'New Adventure - One More Branch',
          error: knownError.message,
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
      protagonistCharacterId?: string;
      npcCharacterIds?: string[];
      startingSituation?: string;
      apiKey?: string;
      conceptSpec?: unknown;
      storyKernel?: unknown;
      conceptVerification?: ConceptVerification;
      contentPreferences?: string;
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

      const validatedConceptSpec: ConceptSpec | undefined =
        isConceptSpec(body.conceptSpec) ? body.conceptSpec : undefined;
      const validatedKernel: StoryKernel | undefined =
        isStoryKernel(body.storyKernel) ? body.storyKernel : undefined;

      if (!validatedKernel) {
        if (progressId) {
          generationProgressService.fail(progressId, 'A story kernel is required');
        }
        return res.status(400).json({
          success: false,
          error: 'A story kernel is required for spine generation',
        });
      }

      const validatedVerification: ConceptVerification | undefined =
        body.conceptVerification &&
        typeof body.conceptVerification === 'object' &&
        typeof body.conceptVerification.signatureScenario === 'string'
          ? body.conceptVerification
          : undefined;

      const rawContentPreferences = body.contentPreferences?.trim();
      const trimmedContentPreferences =
        rawContentPreferences && rawContentPreferences.length > 0
          ? rawContentPreferences
          : undefined;

      // Load decomposed characters when IDs are provided (new pipeline)
      const allCharacterIds = [
        ...(body.protagonistCharacterId ? [body.protagonistCharacterId] : []),
        ...(body.npcCharacterIds ?? []),
      ];
      const decomposedCharacters =
        allCharacterIds.length > 0
          ? (await Promise.all(allCharacterIds.map((id) => loadCharacter(id)))).filter(
              (c): c is NonNullable<typeof c> => c !== null
            )
          : undefined;

      const result = await generateStorySpines(
        {
          characterConcept,
          worldbuilding: body.worldbuilding?.trim() ?? '',
          tone: body.tone?.trim() ?? 'fantasy adventure',
          npcs: validNpcs && validNpcs.length > 0 ? validNpcs : undefined,
          decomposedCharacters:
            decomposedCharacters && decomposedCharacters.length > 0
              ? decomposedCharacters
              : undefined,
          startingSituation: body.startingSituation?.trim(),
          conceptSpec: validatedConceptSpec,
          storyKernel: validatedKernel,
          conceptVerification: validatedVerification,
          contentPreferences: trimmedContentPreferences,
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
        const { publicMessage, response } = buildLlmRouteErrorResult(error, { includeDebug: false });
        if (progressId) {
          generationProgressService.fail(progressId, publicMessage);
        }
        return res.status(500).json(response);
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
        const { publicMessage, response } = buildLlmRouteErrorResult(error);
        if (progressId) {
          generationProgressService.fail(progressId, publicMessage);
        }
        return res.status(500).json(response);
      }

      const knownError = mapKnownError(error);
      if (knownError) {
        if (progressId) {
          generationProgressService.fail(progressId, knownError.message);
        }
        return res.status(knownError.status).json({
          success: false,
          error: knownError.message,
        });
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

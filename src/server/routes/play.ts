import { Request, Response, Router } from 'express';
import { collectRecapSummaries, StateReconciliationError, storyEngine } from '../../engine/index.js';
import type { GenerationStageEvent } from '../../engine/index.js';
import { LLMError } from '../../llm/llm-client-types.js';
import { logger } from '../../logging/index.js';
import {
  CHOICE_TYPE_COLORS,
  ChoiceType,
  CHOICE_TYPE_VALUES,
  PageId,
  PRIMARY_DELTA_LABELS,
  PrimaryDelta,
  PRIMARY_DELTA_VALUES,
  StoryId,
} from '../../models/index.js';
import { addChoice } from '../../persistence/index.js';
import { generationProgressService } from '../services/index.js';
import {
  parseCustomChoiceText,
  parseProgressId,
  normalizeProtagonistGuidance,
  formatLLMError,
  extractNpcBriefings,
  extractProtagonistBriefing,
  getActDisplayInfo,
  getConstraintPanelData,
  getKeyedEntryPanelData,
  getNpcRelationshipPanelData,
  getOpenThreadPanelData,
  getThreatPanelData,
  getTrackedPromisesPanelData,
  groupWorldFacts,
  wrapAsyncRoute,
} from '../utils/index.js';

type ChoiceBody = {
  pageId?: number;
  choiceIndex?: number;
  apiKey?: string;
  progressId?: unknown;
  protagonistGuidance?: unknown;
};

type CustomChoiceBody = {
  pageId?: number;
  choiceText?: string;
  choiceType?: string;
  primaryDelta?: string;
};

function extractReconciliationIssueCodes(error: StateReconciliationError): string[] {
  return [
    ...new Set(
      error.diagnostics
        .map((diagnostic) => diagnostic.code)
        .filter((code): code is string => typeof code === 'string' && code.length > 0)
    ),
  ];
}

function buildInsightsThreadMeta(
  resolvedThreadMeta: Readonly<Record<string, { threadType: string; urgency: string }>>,
  openThreads: readonly { id: string; threadType: string; urgency: string }[]
): Record<string, { threadType: string; urgency: string }> {
  const meta: Record<string, { threadType: string; urgency: string }> = { ...resolvedThreadMeta };
  for (const thread of openThreads) {
    if (!meta[thread.id]) {
      meta[thread.id] = { threadType: thread.threadType, urgency: thread.urgency };
    }
  }
  return meta;
}

function parseRequestedPageId(pageQuery: unknown): number {
  const pageInput =
    typeof pageQuery === 'string' || typeof pageQuery === 'number' ? String(pageQuery) : '';
  const parsed = Number.parseInt(pageInput, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export const playRoutes = Router();

playRoutes.get(
  '/:storyId/briefing',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;

    try {
      const story = await storyEngine.loadStory(storyId as StoryId);
      if (!story) {
        return res.status(404).render('pages/error', {
          title: 'Not Found',
          message: 'Story not found',
        });
      }

      if (!story.structure || !story.decomposedCharacters) {
        return res.status(404).render('pages/error', {
          title: 'Not Found',
          message: 'Story is not prepared for briefing',
        });
      }

      const firstPage = await storyEngine.getPage(storyId as StoryId, 1 as PageId);
      if (firstPage) {
        return res.redirect(`/play/${storyId}?page=1`);
      }

      return res.render('pages/briefing', {
        title: `${story.title} - Mission Briefing`,
        story: {
          id: story.id,
          title: story.title,
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
          startingSituation: story.startingSituation,
        },
        briefing: {
          theme: story.structure.overallTheme,
          premise: story.structure.premise,
          protagonist: extractProtagonistBriefing(story.decomposedCharacters),
          npcs: extractNpcBriefings(story.decomposedCharacters, story.initialNpcAgendas),
          worldFacts: groupWorldFacts(story.decomposedWorld),
          pacingBudget: story.structure.pacingBudget,
        },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error loading briefing page:', { error: err.message, stack: err.stack });
      return res.status(500).render('pages/error', {
        title: 'Error',
        message: 'Failed to load briefing',
      });
    }
  })
);

playRoutes.post(
  '/:storyId/begin',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;
    const { apiKey, progressId: rawProgressId } = req.body as {
      apiKey?: string;
      progressId?: unknown;
    };
    const progressId = parseProgressId(rawProgressId);

    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      if (progressId) {
        generationProgressService.start(progressId, 'begin-adventure');
        generationProgressService.fail(progressId, 'OpenRouter API key is required');
      }
      return res.status(400).json({
        success: false,
        error: 'OpenRouter API key is required',
      });
    }

    if (progressId) {
      generationProgressService.start(progressId, 'begin-adventure');
    }

    try {
      const result = await storyEngine.generateOpeningPage(
        storyId as StoryId,
        apiKey,
        progressId
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
          : undefined
      );

      if (progressId) {
        generationProgressService.complete(progressId);
      }

      return res.json({
        success: true,
        storyId: result.story.id,
      });
    } catch (error) {
      if (error instanceof LLMError) {
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
      logger.error('Error beginning story from briefing:', { error: err.message, stack: err.stack });
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  })
);

playRoutes.get(
  '/:storyId',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;
    const pageId = parseRequestedPageId(req.query['page']);

    try {
      const story = await storyEngine.loadStory(storyId as StoryId);
      if (!story) {
        return res.status(404).render('pages/error', {
          title: 'Not Found',
          message: 'Story not found',
        });
      }

      const page = await storyEngine.getPage(storyId as StoryId, pageId as PageId);
      if (!page) {
        if (pageId !== 1) {
          const pageOne = await storyEngine.getPage(storyId as StoryId, 1 as PageId);
          if (!pageOne) {
            return res.redirect(`/play/${storyId}/briefing`);
          }
        } else {
          return res.redirect(`/play/${storyId}/briefing`);
        }

        return res.status(404).render('pages/error', {
          title: 'Not Found',
          message: 'Page not found',
        });
      }

      const recapSummaries = await collectRecapSummaries(storyId as StoryId, page);

      const actDisplayInfo = getActDisplayInfo(story, page);
      const openThreadPanelData = getOpenThreadPanelData(page.accumulatedActiveState.openThreads);
      const threatsPanelData = getThreatPanelData(
        page.accumulatedActiveState.activeThreats
      );
      const constraintsPanelData = getConstraintPanelData(
        page.accumulatedActiveState.activeConstraints
      );
      const inventoryPanelData = getKeyedEntryPanelData(page.accumulatedInventory, 10);
      const healthPanelData = getKeyedEntryPanelData(page.accumulatedHealth, 10);
      const trackedPromisesPanelData = getTrackedPromisesPanelData(page.accumulatedPromises);
      const npcRelationshipPanelData = getNpcRelationshipPanelData(
        page.accumulatedNpcRelationships
      );
      const insightsThreadMeta = buildInsightsThreadMeta(
        page.resolvedThreadMeta ?? {},
        page.accumulatedActiveState.openThreads
      );

      return res.render('pages/play', {
        title: `${story.title} - One More Branch`,
        story,
        page,
        recapSummaries,
        pageId,
        actDisplayInfo,
        openThreadPanelRows: openThreadPanelData.rows,
        openThreadOverflowSummary: openThreadPanelData.overflowSummary,
        threatsPanelRows: threatsPanelData.rows,
        threatsOverflowSummary: threatsPanelData.overflowSummary,
        constraintsPanelRows: constraintsPanelData.rows,
        constraintsOverflowSummary: constraintsPanelData.overflowSummary,
        inventoryPanelRows: inventoryPanelData.rows,
        inventoryOverflowSummary: inventoryPanelData.overflowSummary,
        healthPanelRows: healthPanelData.rows,
        healthOverflowSummary: healthPanelData.overflowSummary,
        trackedPromisesPanelRows: trackedPromisesPanelData.rows,
        trackedPromisesOverflowSummary: trackedPromisesPanelData.overflowSummary,
        npcRelationshipRows: npcRelationshipPanelData.rows,
        insightsThreadMeta,
        choiceTypeLabels: CHOICE_TYPE_COLORS,
        primaryDeltaLabels: PRIMARY_DELTA_LABELS,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error loading play page:', { error: err.message, stack: err.stack });
      return res.status(500).render('pages/error', {
        title: 'Error',
        message: 'Failed to load story',
      });
    }
  })
);

playRoutes.post(
  '/:storyId/choice',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;
    const {
      pageId,
      choiceIndex,
      apiKey,
      progressId: rawProgressId,
      protagonistGuidance: rawGuidance,
    } = req.body as ChoiceBody;
    const progressId = parseProgressId(rawProgressId);
    const protagonistGuidance = normalizeProtagonistGuidance(rawGuidance);
    if (progressId) {
      generationProgressService.start(progressId, 'choice');
    }

    if (pageId === undefined || choiceIndex === undefined) {
      if (progressId) {
        generationProgressService.fail(progressId, 'Missing pageId or choiceIndex');
      }

      return res.status(400).json({ error: 'Missing pageId or choiceIndex' });
    }

    try {
      const result = await storyEngine.makeChoice({
        storyId: storyId as StoryId,
        pageId: pageId as PageId,
        choiceIndex,
        apiKey: apiKey ?? undefined,
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
        ...(protagonistGuidance !== undefined ? { protagonistGuidance } : {}),
      });

      // Load story to compute actDisplayInfo for the new page
      const story = await storyEngine.loadStory(storyId as StoryId);
      const actDisplayInfo = story ? getActDisplayInfo(story, result.page) : null;
      const recapSummaries = await collectRecapSummaries(storyId as StoryId, result.page);
      const openThreadPanelData = getOpenThreadPanelData(
        result.page.accumulatedActiveState.openThreads
      );
      const threatsPanelData = getThreatPanelData(
        result.page.accumulatedActiveState.activeThreats
      );
      const constraintsPanelData = getConstraintPanelData(
        result.page.accumulatedActiveState.activeConstraints
      );
      const inventoryPanelData = getKeyedEntryPanelData(result.page.accumulatedInventory, 10);
      const healthPanelData = getKeyedEntryPanelData(result.page.accumulatedHealth, 10);
      const trackedPromisesPanelData = getTrackedPromisesPanelData(
        result.page.accumulatedPromises
      );
      const npcRelationshipPanelData = getNpcRelationshipPanelData(
        result.page.accumulatedNpcRelationships
      );
      const insightsThreadMeta = buildInsightsThreadMeta(
        result.page.resolvedThreadMeta ?? {},
        result.page.accumulatedActiveState.openThreads
      );
      if (progressId) {
        generationProgressService.complete(progressId);
      }

      return res.json({
        success: true,
        page: {
          id: result.page.id,
          narrativeText: result.page.narrativeText,
          sceneSummary: result.page.sceneSummary,
          choices: result.page.choices,
          isEnding: result.page.isEnding,
          analystResult: result.page.analystResult,
          resolvedThreadMeta: insightsThreadMeta,
          resolvedPromiseMeta: result.page.resolvedPromiseMeta ?? {},
          openThreads: openThreadPanelData.rows,
          openThreadOverflowSummary: openThreadPanelData.overflowSummary,
          activeThreats: threatsPanelData.rows,
          threatsOverflowSummary: threatsPanelData.overflowSummary,
          activeConstraints: constraintsPanelData.rows,
          constraintsOverflowSummary: constraintsPanelData.overflowSummary,
          inventory: inventoryPanelData.rows,
          inventoryOverflowSummary: inventoryPanelData.overflowSummary,
          health: healthPanelData.rows,
          healthOverflowSummary: healthPanelData.overflowSummary,
          trackedPromises: trackedPromisesPanelData.rows,
          trackedPromisesOverflowSummary: trackedPromisesPanelData.overflowSummary,
          npcRelationships: npcRelationshipPanelData.rows,
          protagonistAffect: result.page.protagonistAffect,
        },
        globalCanon: story?.globalCanon ?? [],
        globalCharacterCanon: story?.globalCharacterCanon ?? {},
        recapSummaries,
        actDisplayInfo,
        wasGenerated: result.wasGenerated,
        deviationInfo: result.deviationInfo,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Log full LLMError context for debugging
      if (error instanceof LLMError) {
        logger.error('LLM error making choice:', {
          message: error.message,
          code: error.code,
          retryable: error.retryable,
          httpStatus: error.context?.['httpStatus'],
          model: error.context?.['model'],
          parsedError: error.context?.['parsedError'],
          rawErrorBody: error.context?.['rawErrorBody'],
        });
      } else {
        logger.error('Error making choice:', { error: err.message, stack: err.stack });
      }

      let errorMessage = err.message;
      if (error instanceof LLMError) {
        errorMessage = formatLLMError(error);
      }

      if (error instanceof StateReconciliationError && error.code === 'RECONCILIATION_FAILED') {
        if (progressId) {
          generationProgressService.fail(
            progressId,
            'Generation failed due to reconciliation issues.'
          );
        }

        return res.status(500).json({
          error: 'Generation failed due to reconciliation issues.',
          code: 'GENERATION_RECONCILIATION_FAILED',
          retryAttempted: true,
          reconciliationIssueCodes: extractReconciliationIssueCodes(error),
        });
      }

      if (progressId) {
        generationProgressService.fail(progressId, errorMessage);
      }

      // Build enhanced error response
      const errorResponse: {
        error: string;
        code?: string;
        retryable?: boolean;
        debug?: {
          httpStatus?: number;
          model?: string;
          rawError?: string;
        };
      } = {
        error: errorMessage,
      };

      if (error instanceof LLMError) {
        errorResponse.code = error.code;
        errorResponse.retryable = error.retryable;

        // Include debug info only in development
        if (process.env['NODE_ENV'] !== 'production') {
          errorResponse.debug = {
            httpStatus: error.context?.['httpStatus'] as number | undefined,
            model: error.context?.['model'] as string | undefined,
            rawError: error.context?.['rawErrorBody'] as string | undefined,
          };
        }
      }

      return res.status(500).json(errorResponse);
    }
  })
);

playRoutes.post(
  '/:storyId/custom-choice',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;
    const {
      pageId,
      choiceText,
      choiceType: rawChoiceType,
      primaryDelta: rawPrimaryDelta,
    } = req.body as CustomChoiceBody;

    if (pageId === undefined || typeof choiceText !== 'string') {
      return res.status(400).json({ error: 'Missing pageId or choiceText' });
    }

    const choiceTextResult = parseCustomChoiceText(choiceText);
    if (choiceTextResult.error) {
      return res.status(400).json({ error: choiceTextResult.error });
    }
    const trimmedChoiceText = choiceTextResult.value;
    if (!trimmedChoiceText) {
      return res.status(400).json({ error: 'Missing pageId or choiceText' });
    }

    // Validate choiceType if provided
    const choiceType =
      rawChoiceType && CHOICE_TYPE_VALUES.includes(rawChoiceType as ChoiceType)
        ? (rawChoiceType as ChoiceType)
        : ChoiceType.TACTICAL_APPROACH;

    // Validate primaryDelta if provided
    const primaryDelta =
      rawPrimaryDelta && PRIMARY_DELTA_VALUES.includes(rawPrimaryDelta as PrimaryDelta)
        ? (rawPrimaryDelta as PrimaryDelta)
        : PrimaryDelta.GOAL_SHIFT;

    try {
      const updatedPage = await addChoice(
        storyId as StoryId,
        pageId as PageId,
        trimmedChoiceText,
        choiceType,
        primaryDelta
      );

      return res.json({
        choices: updatedPage.choices.map((c) => ({
          text: c.text,
          choiceType: c.choiceType,
          primaryDelta: c.primaryDelta,
          nextPageId: c.nextPageId,
        })),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }

      if (err.message.includes('ending page')) {
        return res.status(409).json({ error: err.message });
      }

      logger.error('Error adding custom choice:', { error: err.message, stack: err.stack });
      return res.status(500).json({ error: 'Failed to add custom choice' });
    }
  })
);

playRoutes.get('/:storyId/restart', (req: Request, res: Response) => {
  const { storyId } = req.params;
  res.redirect(`/play/${storyId}?page=1`);
});

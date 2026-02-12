import { Request, Response, Router } from 'express';
import { StateReconciliationError, storyEngine } from '../../engine/index.js';
import type { GenerationStageEvent } from '../../engine/index.js';
import { LLMError } from '../../llm/types.js';
import { logger } from '../../logging/index.js';
import { CHOICE_TYPE_COLORS, ChoiceType, CHOICE_TYPE_VALUES, PageId, PRIMARY_DELTA_LABELS, PrimaryDelta, PRIMARY_DELTA_VALUES, StoryId } from '../../models/index.js';
import { addChoice } from '../../persistence/index.js';
import { generationProgressService } from '../services/index.js';
import {
  formatLLMError,
  getActDisplayInfo,
  getOpenThreadPanelData,
  wrapAsyncRoute,
} from '../utils/index.js';

type ChoiceBody = {
  pageId?: number;
  choiceIndex?: number;
  apiKey?: string;
  progressId?: unknown;
  suggestedProtagonistSpeech?: unknown;
};

type CustomChoiceBody = {
  pageId?: number;
  choiceText?: string;
  choiceType?: string;
  primaryDelta?: string;
};

function extractReconciliationIssueCodes(error: StateReconciliationError): string[] {
  return [...new Set(
    error.diagnostics
      .map(diagnostic => diagnostic.code)
      .filter((code): code is string => typeof code === 'string' && code.length > 0),
  )];
}

function parseRequestedPageId(pageQuery: unknown): number {
  const pageInput = typeof pageQuery === 'string' || typeof pageQuery === 'number' ? String(pageQuery) : '';
  const parsed = Number.parseInt(pageInput, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export const playRoutes = Router();
const MAX_SUGGESTED_PROTAGONIST_SPEECH_LENGTH = 500;

function parseProgressId(input: unknown): string | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSuggestedProtagonistSpeech(input: unknown): string | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

playRoutes.get('/:storyId', wrapAsyncRoute(async (req: Request, res: Response) => {
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
      return res.status(404).render('pages/error', {
        title: 'Not Found',
        message: 'Page not found',
      });
    }

    const actDisplayInfo = getActDisplayInfo(story, page);
    const openThreadPanelData = getOpenThreadPanelData(page.accumulatedActiveState.openThreads);

    return res.render('pages/play', {
      title: `${story.title} - One More Branch`,
      story,
      page,
      pageId,
      actDisplayInfo,
      openThreadPanelRows: openThreadPanelData.rows,
      openThreadOverflowSummary: openThreadPanelData.overflowSummary,
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
}));

playRoutes.post('/:storyId/choice', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { storyId } = req.params;
  const {
    pageId,
    choiceIndex,
    apiKey,
    progressId: rawProgressId,
    suggestedProtagonistSpeech: rawSuggestedProtagonistSpeech,
  } = req.body as ChoiceBody;
  const progressId = parseProgressId(rawProgressId);
  const suggestedProtagonistSpeech = normalizeSuggestedProtagonistSpeech(rawSuggestedProtagonistSpeech);
  if (progressId) {
    generationProgressService.start(progressId, 'choice');
  }

  if (pageId === undefined || choiceIndex === undefined) {
    if (progressId) {
      generationProgressService.fail(progressId, 'Missing pageId or choiceIndex');
    }

    return res.status(400).json({ error: 'Missing pageId or choiceIndex' });
  }

  if (
    suggestedProtagonistSpeech !== undefined &&
    suggestedProtagonistSpeech.length > MAX_SUGGESTED_PROTAGONIST_SPEECH_LENGTH
  ) {
    if (progressId) {
      generationProgressService.fail(
        progressId,
        `suggestedProtagonistSpeech must be ${MAX_SUGGESTED_PROTAGONIST_SPEECH_LENGTH} characters or fewer`,
      );
    }

    return res.status(400).json({
      error: `suggestedProtagonistSpeech must be ${MAX_SUGGESTED_PROTAGONIST_SPEECH_LENGTH} characters or fewer`,
    });
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
              generationProgressService.markStageCompleted(progressId, event.stage, event.attempt);
            }
          }
        : undefined,
      ...(suggestedProtagonistSpeech !== undefined
        ? { suggestedProtagonistSpeech }
        : {}),
    });

    // Load story to compute actDisplayInfo for the new page
    const story = await storyEngine.loadStory(storyId as StoryId);
    const actDisplayInfo = story ? getActDisplayInfo(story, result.page) : null;
    const openThreadPanelData = getOpenThreadPanelData(result.page.accumulatedActiveState.openThreads);
    if (progressId) {
      generationProgressService.complete(progressId);
    }

    return res.json({
      success: true,
      page: {
        id: result.page.id,
        narrativeText: result.page.narrativeText,
        choices: result.page.choices,
        isEnding: result.page.isEnding,
        openThreads: openThreadPanelData.rows,
        openThreadOverflowSummary: openThreadPanelData.overflowSummary,
      },
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
        generationProgressService.fail(progressId, 'Generation failed due to reconciliation issues.');
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
}));

playRoutes.post('/:storyId/custom-choice', wrapAsyncRoute(async (req: Request, res: Response) => {
  const { storyId } = req.params;
  const { pageId, choiceText, choiceType: rawChoiceType, primaryDelta: rawPrimaryDelta } = req.body as CustomChoiceBody;

  if (pageId === undefined || typeof choiceText !== 'string') {
    return res.status(400).json({ error: 'Missing pageId or choiceText' });
  }

  const trimmed = choiceText.trim();
  if (trimmed.length === 0) {
    return res.status(400).json({ error: 'Choice text cannot be empty' });
  }

  if (trimmed.length > 500) {
    return res.status(400).json({ error: 'Choice text must be 500 characters or fewer' });
  }

  // Validate choiceType if provided
  const choiceType = rawChoiceType && CHOICE_TYPE_VALUES.includes(rawChoiceType as ChoiceType)
    ? rawChoiceType as ChoiceType
    : ChoiceType.TACTICAL_APPROACH;

  // Validate primaryDelta if provided
  const primaryDelta = rawPrimaryDelta && PRIMARY_DELTA_VALUES.includes(rawPrimaryDelta as PrimaryDelta)
    ? rawPrimaryDelta as PrimaryDelta
    : PrimaryDelta.GOAL_SHIFT;

  try {
    const updatedPage = await addChoice(storyId as StoryId, pageId as PageId, trimmed, choiceType, primaryDelta);

    return res.json({
      choices: updatedPage.choices.map(c => ({
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
}));

playRoutes.get('/:storyId/restart', (req: Request, res: Response) => {
  const { storyId } = req.params;
  res.redirect(`/play/${storyId}?page=1`);
});

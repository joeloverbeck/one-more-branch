import { Request, Response, Router } from 'express';
import { collectAncestorContext } from '../../engine/ancestor-collector.js';
import { collectRecapSummaries, storyEngine } from '../../engine/index.js';
import { rewriteStructureForPacing } from '../../engine/pacing-rewrite.js';
import { collectParentState } from '../../engine/parent-state-collector.js';
import { generateSceneDirections } from '../../llm/scene-ideator.js';
import type {
  SceneIdeatorOpeningContext,
  SceneIdeatorContinuationContext,
} from '../../llm/scene-ideator-types.js';
import { logger } from '../../logging/index.js';
import {
  CHOICE_TYPE_COLORS,
  PageId,
  PRIMARY_DELTA_LABELS,
  StoryId,
} from '../../models/index.js';
import {
  buildBeginErrorResponse,
  buildChoiceErrorResponse,
  buildPagePanelData,
  parseRequestedPageId,
  normalizeProtagonistGuidance,
  normalizeSelectedSceneDirection,
  extractNpcBriefings,
  extractProtagonistBriefing,
  getActDisplayInfo,
  getMilestoneInfo,
  groupWorldFacts,
  wrapAsyncRoute,
} from '../utils/index.js';
import { customChoiceHandler } from './custom-choice.js';
import { createRouteGenerationProgress } from './generation-progress-route.js';

type ChoiceBody = {
  pageId?: number;
  choiceIndex?: number;
  apiKey?: string;
  progressId?: unknown;
  protagonistGuidance?: unknown;
  selectedSceneDirection?: unknown;
};

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

type IdeateSceneBody = {
  apiKey?: string;
  mode?: string;
  pageId?: number;
  choiceIndex?: number;
  protagonistGuidance?: unknown;
};

playRoutes.post(
  '/:storyId/ideate-scene',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;
    const { apiKey, mode, pageId, choiceIndex, protagonistGuidance: rawGuidance } =
      req.body as IdeateSceneBody;

    const protagonistGuidance = normalizeProtagonistGuidance(rawGuidance);

    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    try {
      const story = await storyEngine.loadStory(storyId as StoryId);
      if (!story) {
        return res.status(404).json({ success: false, error: 'Story not found' });
      }

      if (!story.decomposedCharacters || !story.decomposedWorld) {
        return res.status(400).json({ success: false, error: 'Story is not fully prepared' });
      }

      if (mode === 'continuation') {
        if (pageId === undefined || choiceIndex === undefined) {
          return res
            .status(400)
            .json({ success: false, error: 'Missing pageId or choiceIndex for continuation' });
        }

        const parentPage = await storyEngine.getPage(storyId as StoryId, pageId as PageId);
        if (!parentPage) {
          return res.status(404).json({ success: false, error: 'Parent page not found' });
        }

        const choice = parentPage.choices[choiceIndex];
        if (!choice) {
          return res.status(400).json({ success: false, error: 'Invalid choice index' });
        }

        if (choice.nextPageId !== null) {
          return res.status(400).json({
            success: false,
            error: 'Choice already explored; scene ideation is only available for unexplored choices',
          });
        }

        const parentState = collectParentState(parentPage);
        const ancestorContext = await collectAncestorContext(storyId as StoryId, parentPage);

        const context: SceneIdeatorContinuationContext = {
          mode: 'continuation',
          tone: story.tone,
          toneFeel: story.toneFeel,
          toneAvoid: story.toneAvoid,
          spine: story.spine,
          structure: story.structure ?? undefined,
          accumulatedStructureState: parentState.structureState,
          decomposedCharacters: story.decomposedCharacters,
          decomposedWorld: story.decomposedWorld,
          previousNarrative: parentPage.narrativeText,
          selectedChoice: choice.text,
          activeState: parentState.accumulatedActiveState,
          ancestorSummaries: ancestorContext.ancestorSummaries,
          threadAges: parentPage.threadAges,
          accumulatedPromises: parentPage.accumulatedPromises ?? [],
          accumulatedNpcAgendas: parentState.accumulatedNpcAgendas,
          accumulatedNpcRelationships: parentState.accumulatedNpcRelationships,
          accumulatedInventory: [...parentState.accumulatedInventory],
          accumulatedHealth: [...parentState.accumulatedHealth],
          protagonistGuidance,
        };

        const result = await generateSceneDirections(context, apiKey);
        return res.json({ success: true, options: result.options });
      }

      // Opening mode (default)
      const context: SceneIdeatorOpeningContext = {
        mode: 'opening',
        tone: story.tone,
        toneFeel: story.toneFeel,
        toneAvoid: story.toneAvoid,
        spine: story.spine,
        structure: story.structure ?? undefined,
        decomposedCharacters: story.decomposedCharacters,
        decomposedWorld: story.decomposedWorld,
        startingSituation: story.startingSituation,
      };

      const result = await generateSceneDirections(context, apiKey);
      return res.json({ success: true, options: result.options });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Scene ideation failed:', { error: err.message, stack: err.stack });
      return res.status(500).json({ success: false, error: 'Scene ideation failed' });
    }
  })
);

playRoutes.post(
  '/:storyId/begin',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;
    const {
      apiKey,
      progressId: rawProgressId,
      selectedSceneDirection: rawSceneDirection,
    } = req.body as {
      apiKey?: string;
      progressId?: unknown;
      selectedSceneDirection?: unknown;
    };
    const progress = createRouteGenerationProgress(rawProgressId, 'begin-adventure');
    const selectedSceneDirection = normalizeSelectedSceneDirection(rawSceneDirection);

    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      progress.fail('OpenRouter API key is required');
      return res.status(400).json({
        success: false,
        error: 'OpenRouter API key is required',
      });
    }

    try {
      const result = await storyEngine.generateOpeningPage(
        storyId as StoryId,
        apiKey,
        progress.onGenerationStage,
        selectedSceneDirection
      );

      progress.complete();

      return res.json({
        success: true,
        storyId: result.story.id,
      });
    } catch (error) {
      const errPayload = buildBeginErrorResponse(error, (msg) => progress.fail(msg));
      return res.status(errPayload.statusCode).json(errPayload.body);
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
      const milestoneInfo = getMilestoneInfo(story, page);
      const panels = buildPagePanelData(page);

      const latestVersionId = story.structureVersions?.length
        ? story.structureVersions[story.structureVersions.length - 1]!.id
        : null;
      const isLatestStructureVersion =
        page.structureVersionId !== null && page.structureVersionId === latestVersionId;

      return res.render('pages/play', {
        title: `${story.title} - One More Branch`,
        story,
        page,
        recapSummaries,
        pageId,
        actDisplayInfo,
        milestoneInfo,
        openThreadPanelRows: panels.openThreadPanelData.rows,
        openThreadOverflowSummary: panels.openThreadPanelData.overflowSummary,
        threatsPanelRows: panels.threatsPanelData.rows,
        threatsOverflowSummary: panels.threatsPanelData.overflowSummary,
        constraintsPanelRows: panels.constraintsPanelData.rows,
        constraintsOverflowSummary: panels.constraintsPanelData.overflowSummary,
        inventoryPanelRows: panels.inventoryPanelData.rows,
        inventoryOverflowSummary: panels.inventoryPanelData.overflowSummary,
        healthPanelRows: panels.healthPanelData.rows,
        healthOverflowSummary: panels.healthPanelData.overflowSummary,
        trackedPromisesPanelRows: panels.trackedPromisesPanelData.rows,
        trackedPromisesOverflowSummary: panels.trackedPromisesPanelData.overflowSummary,
        npcRelationshipRows: panels.npcRelationshipPanelData.rows,
        npcAgendaRows: panels.npcAgendaPanelData.rows,
        knowledgeStateRows: panels.knowledgeStatePanelData.rows,
        insightsThreadMeta: panels.insightsThreadMeta,
        choiceTypeLabels: CHOICE_TYPE_COLORS,
        primaryDeltaLabels: PRIMARY_DELTA_LABELS,
        isLatestStructureVersion,
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
      selectedSceneDirection: rawSceneDirection,
    } = req.body as ChoiceBody;
    const progress = createRouteGenerationProgress(rawProgressId, 'choice');
    const protagonistGuidance = normalizeProtagonistGuidance(rawGuidance);
    const selectedSceneDirection = normalizeSelectedSceneDirection(rawSceneDirection);

    if (pageId === undefined || choiceIndex === undefined) {
      progress.fail('Missing pageId or choiceIndex');
      return res.status(400).json({ error: 'Missing pageId or choiceIndex' });
    }

    try {
      const result = await storyEngine.makeChoice({
        storyId: storyId as StoryId,
        pageId: pageId as PageId,
        choiceIndex,
        apiKey: apiKey ?? undefined,
        onGenerationStage: progress.onGenerationStage,
        ...(protagonistGuidance !== undefined ? { protagonistGuidance } : {}),
        ...(selectedSceneDirection !== undefined ? { selectedSceneDirection } : {}),
      });

      const story = await storyEngine.loadStory(storyId as StoryId);
      const actDisplayInfo = story ? getActDisplayInfo(story, result.page) : null;
      const milestoneInfo = story ? getMilestoneInfo(story, result.page) : null;
      const recapSummaries = await collectRecapSummaries(storyId as StoryId, result.page);
      const panels = buildPagePanelData(result.page);
      progress.complete();

      return res.json({
        success: true,
        page: {
          id: result.page.id,
          narrativeText: result.page.narrativeText,
          sceneSummary: result.page.sceneSummary,
          choices: result.page.choices,
          isEnding: result.page.isEnding,
          analystResult: result.page.analystResult,
          resolvedThreadMeta: panels.insightsThreadMeta,
          resolvedPromiseMeta: result.page.resolvedPromiseMeta ?? {},
          openThreads: panels.openThreadPanelData.rows,
          openThreadOverflowSummary: panels.openThreadPanelData.overflowSummary,
          activeThreats: panels.threatsPanelData.rows,
          threatsOverflowSummary: panels.threatsPanelData.overflowSummary,
          activeConstraints: panels.constraintsPanelData.rows,
          constraintsOverflowSummary: panels.constraintsPanelData.overflowSummary,
          inventory: panels.inventoryPanelData.rows,
          inventoryOverflowSummary: panels.inventoryPanelData.overflowSummary,
          health: panels.healthPanelData.rows,
          healthOverflowSummary: panels.healthPanelData.overflowSummary,
          trackedPromises: panels.trackedPromisesPanelData.rows,
          trackedPromisesOverflowSummary: panels.trackedPromisesPanelData.overflowSummary,
          npcRelationships: panels.npcRelationshipPanelData.rows,
          npcAgendas: panels.npcAgendaPanelData.rows,
          knowledgeState: panels.knowledgeStatePanelData.rows,
          protagonistAffect: result.page.protagonistAffect,
        },
        globalCanon: story?.globalCanon ?? [],
        globalCharacterCanon: story?.globalCharacterCanon ?? {},
        recapSummaries,
        actDisplayInfo,
        milestoneInfo,
        wasGenerated: result.wasGenerated,
        deviationInfo: result.deviationInfo,
        ...(result.wasGenerated && result.metrics ? { metrics: result.metrics } : {}),
      });
    } catch (error) {
      const errPayload = buildChoiceErrorResponse(error, (msg) => progress.fail(msg));
      return res.status(errPayload.statusCode).json(errPayload.body);
    }
  })
);

playRoutes.post('/:storyId/custom-choice', wrapAsyncRoute(customChoiceHandler));

type RewriteStructureBody = {
  pageId?: number;
  apiKey?: string;
  progressId?: unknown;
};

playRoutes.post(
  '/:storyId/rewrite-structure',
  wrapAsyncRoute(async (req: Request, res: Response) => {
    const { storyId } = req.params;
    const { pageId, apiKey, progressId: rawProgressId } = req.body as RewriteStructureBody;
    const progress = createRouteGenerationProgress(rawProgressId, 'structure-rewrite');

    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      progress.fail('OpenRouter API key is required');
      return res.status(400).json({ success: false, error: 'OpenRouter API key is required' });
    }

    if (pageId === undefined) {
      progress.fail('Missing pageId');
      return res.status(400).json({ success: false, error: 'Missing pageId' });
    }

    try {
      const story = await storyEngine.loadStory(storyId as StoryId);
      if (!story) {
        progress.fail('Story not found');
        return res.status(404).json({ success: false, error: 'Story not found' });
      }

      const page = await storyEngine.getPage(storyId as StoryId, pageId as PageId);
      if (!page) {
        progress.fail('Page not found');
        return res.status(404).json({ success: false, error: 'Page not found' });
      }

      if (!page.analystResult || page.analystResult.recommendedAction !== 'rewrite') {
        progress.fail('No rewrite recommendation for this page');
        return res.status(400).json({
          success: false,
          error: 'This page does not have a pacing rewrite recommendation',
        });
      }

      const result = await rewriteStructureForPacing(story, page, apiKey);
      progress.complete();

      return res.json({
        success: true,
        storyId: result.updatedStory.id,
        newVersionId: result.newVersion.id,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Pacing structure rewrite failed:', {
        error: err.message,
        stack: err.stack,
      });
      progress.fail(err.message);
      return res.status(500).json({ success: false, error: 'Structure rewrite failed' });
    }
  })
);

playRoutes.get('/:storyId/restart', (req: Request, res: Response) => {
  const { storyId } = req.params;
  res.redirect(`/play/${storyId}?page=1`);
});

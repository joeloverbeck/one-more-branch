import {
  generateAnalystEvaluation,
  generatePagePlan,
  generateOpeningPage,
  generateWriterPage,
  mergeWriterAndAnalystResults,
} from '../llm';
import type { AnalystResult } from '../llm';
import { randomUUID } from 'node:crypto';
import { logger } from '../logging/index.js';
import {
  AccumulatedStructureState,
  createEmptyActiveState,
  createEmptyAccumulatedStructureState,
  generatePageId,
  getCurrentBeat,
  getLatestStructureVersion,
  isDeviation,
  Page,
  Story,
} from '../models';
import { storage } from '../persistence';
import { collectAncestorContext } from './ancestor-collector';
import { updateStoryWithAllCanon } from './canon-manager';
import { handleDeviation, isActualDeviation } from './deviation-handler';
import { buildContinuationPage, buildFirstPage } from './page-builder';
import { collectParentState } from './parent-state-collector';
import { applyStructureProgression, createInitialStructureState } from './structure-state';
import {
  resolveActiveStructureVersion,
  validateContinuationStructureVersion,
  validateFirstPageStructureVersion,
} from './structure-version-validator';
import { DeviationInfo, EngineError } from './types';

function createGenerationRequestId(): string {
  return randomUUID();
}

export async function generateFirstPage(
  story: Story,
  apiKey: string,
): Promise<{ page: Page; updatedStory: Story }> {
  validateFirstPageStructureVersion(story);

  const requestId = createGenerationRequestId();
  const pagePlan = await generatePagePlan(
    {
      mode: 'opening',
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      npcs: story.npcs,
      startingSituation: story.startingSituation,
      structure: story.structure ?? undefined,
      globalCanon: story.globalCanon,
      globalCharacterCanon: story.globalCharacterCanon,
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      activeState: createEmptyActiveState(),
    },
    {
      apiKey,
      observability: {
        storyId: story.id,
        requestId,
      },
    },
  );

  const result = await generateOpeningPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      npcs: story.npcs,
      startingSituation: story.startingSituation,
      structure: story.structure ?? undefined,
      pagePlan,
    },
    {
      apiKey,
      observability: {
        storyId: story.id,
        requestId,
      },
    },
  );

  const initialStructureState = story.structure
    ? createInitialStructureState(story.structure)
    : createEmptyAccumulatedStructureState();

  const latestVersion = getLatestStructureVersion(story);
  const page = buildFirstPage(result, {
    structureState: initialStructureState,
    structureVersionId: latestVersion?.id ?? null,
  });

  const updatedStory = updateStoryWithAllCanon(story, result.newCanonFacts, result.newCharacterCanonFacts);

  return { page, updatedStory };
}

export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string,
): Promise<{ page: Page; updatedStory: Story; deviationInfo?: DeviationInfo }> {
  const choice = parentPage.choices[choiceIndex];
  if (!choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage.id}`,
      'INVALID_CHOICE',
    );
  }

  validateContinuationStructureVersion(story, parentPage);

  const requestId = createGenerationRequestId();
  const maxPageId = await storage.getMaxPageId(story.id);
  const parentState = collectParentState(parentPage);
  const currentStructureVersion = resolveActiveStructureVersion(story, parentPage);

  // Collect hierarchical ancestor context (full text for 2 nearest, summaries for older)
  const ancestorContext = await collectAncestorContext(story.id, parentPage);

  const continuationContext = {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    npcs: story.npcs,
    globalCanon: story.globalCanon,
    globalCharacterCanon: story.globalCharacterCanon,
    structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
    accumulatedStructureState: parentState.structureState,
    previousNarrative: parentPage.narrativeText,
    selectedChoice: choice.text,
    accumulatedInventory: parentState.accumulatedInventory,
    accumulatedHealth: parentState.accumulatedHealth,
    accumulatedCharacterState: parentState.accumulatedCharacterState,
    parentProtagonistAffect: parentPage.protagonistAffect,
    activeState: parentState.accumulatedActiveState,
    grandparentNarrative: ancestorContext.grandparentNarrative,
    ancestorSummaries: ancestorContext.ancestorSummaries,
  };

  const pagePlan = await generatePagePlan(
    {
      ...continuationContext,
      mode: 'continuation',
    },
    {
      apiKey,
      observability: {
        storyId: story.id,
        pageId: parentPage.id,
        requestId,
      },
    },
  );

  // Writer call (always runs)
  const writerResult = await generateWriterPage(
    {
      ...continuationContext,
      pagePlan,
    },
    {
      apiKey,
      observability: {
        storyId: story.id,
        pageId: parentPage.id,
        requestId,
      },
      writerValidationContext: {
        removableIds: {
          threats: parentState.accumulatedActiveState.activeThreats.map(entry => entry.id),
          constraints: parentState.accumulatedActiveState.activeConstraints.map(entry => entry.id),
          threads: parentState.accumulatedActiveState.openThreads.map(entry => entry.id),
          inventory: parentState.accumulatedInventory.map(entry => entry.id),
          health: parentState.accumulatedHealth.map(entry => entry.id),
          characterState: Object.values(parentState.accumulatedCharacterState)
            .flatMap(entries => entries.map(entry => entry.id)),
        },
      },
    },
  );

  // Analyst call (only when structure exists)
  let analystResult: AnalystResult | null = null;
  const activeStructureForAnalyst = currentStructureVersion?.structure ?? story.structure;
  if (activeStructureForAnalyst && parentState.structureState) {
    const analystStructureState: AccumulatedStructureState = {
      ...parentState.structureState,
      pagesInCurrentBeat: parentState.structureState.pagesInCurrentBeat + 1,
    };
    try {
      analystResult = await generateAnalystEvaluation(
        {
          narrative: writerResult.narrative,
          structure: activeStructureForAnalyst,
          accumulatedStructureState: analystStructureState,
          activeState: parentState.accumulatedActiveState,
        },
        { apiKey },
      );
    } catch (error) {
      // Graceful degradation: log warning, continue without analyst data
      logger.warn('Analyst evaluation failed, continuing with defaults', { error });
    }
  }

  // Merge into ContinuationGenerationResult
  const result = mergeWriterAndAnalystResults(writerResult, analystResult);

  const newPageId = generatePageId(maxPageId);

  // Handle deviation if detected - triggers structure rewrite
  let storyForPage = story;
  let activeStructureVersion = currentStructureVersion;
  let deviationInfo: DeviationInfo | undefined;

  // Check for deviation - isActualDeviation confirms conditions, isDeviation narrows the type
  if (
    isActualDeviation(result, story, currentStructureVersion) &&
    isDeviation(result.deviation)
  ) {
    const devResult = await handleDeviation(
      {
        story,
        currentVersion: currentStructureVersion!,
        parentStructureState: parentState.structureState,
        deviation: result.deviation,
        newPageId,
      },
      apiKey,
    );
    storyForPage = devResult.updatedStory;
    activeStructureVersion = devResult.activeVersion;
    deviationInfo = devResult.deviationInfo;
  }

  // Use the active structure (original or rewritten) for progression
  const activeStructure = activeStructureVersion?.structure ?? story.structure;
  const activeBeat =
    activeStructure && parentState.structureState
      ? getCurrentBeat(activeStructure, parentState.structureState)
      : undefined;

  let beatConcluded =
    'beatConcluded' in result && typeof result.beatConcluded === 'boolean'
      ? result.beatConcluded
      : false;
  const beatResolution =
    'beatResolution' in result && typeof result.beatResolution === 'string'
      ? result.beatResolution
      : '';

  if (
    activeBeat?.role === 'turning_point' &&
    analystResult?.beatConcluded === true &&
    analystResult.completionGateSatisfied === false &&
    beatConcluded
  ) {
    beatConcluded = false;
    logger.warn('Turning point completion gate mismatch; forcing beatConcluded=false', {
      storyId: story.id,
      parentPageId: parentPage.id,
      beatId: activeBeat.id,
      beatRole: activeBeat.role,
      completionGateFailureReason:
        analystResult.completionGateFailureReason || 'Completion gate not satisfied',
    });
  }

  let newStructureState = activeStructure
    ? applyStructureProgression(
        activeStructure,
        parentState.structureState,
        beatConcluded,
        beatResolution,
      )
    : parentState.structureState;

  // Pacing response: only when no deviation was triggered
  if (!deviationInfo && newStructureState) {
    if (result.recommendedAction === 'rewrite') {
      logger.warn('Pacing issue detected: rewrite recommended (deferred)', {
        pacingIssueReason: result.pacingIssueReason,
        pagesInCurrentBeat: newStructureState.pagesInCurrentBeat,
      });
      newStructureState = { ...newStructureState, pacingNudge: null };
    } else if (result.recommendedAction === 'nudge') {
      logger.info('Pacing nudge applied', {
        pacingIssueReason: result.pacingIssueReason,
        pagesInCurrentBeat: newStructureState.pagesInCurrentBeat,
      });
      newStructureState = { ...newStructureState, pacingNudge: result.pacingIssueReason };
    } else {
      newStructureState = { ...newStructureState, pacingNudge: null };
    }
  }

  const page = buildContinuationPage(result, {
    pageId: newPageId,
    parentPageId: parentPage.id,
    parentChoiceIndex: choiceIndex,
    parentAccumulatedActiveState: parentState.accumulatedActiveState,
    parentAccumulatedInventory: parentState.accumulatedInventory,
    parentAccumulatedHealth: parentState.accumulatedHealth,
    parentAccumulatedCharacterState: parentState.accumulatedCharacterState,
    structureState: newStructureState,
    structureVersionId: activeStructureVersion?.id ?? null,
  });

  const updatedStory = updateStoryWithAllCanon(
    storyForPage,
    result.newCanonFacts,
    result.newCharacterCanonFacts,
  );

  return { page, updatedStory, deviationInfo };
}

export async function getOrGeneratePage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey?: string,
): Promise<{ page: Page; story: Story; wasGenerated: boolean; deviationInfo?: DeviationInfo }> {
  const choice = parentPage.choices[choiceIndex];
  if (!choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage.id}`,
      'INVALID_CHOICE',
    );
  }

  if (choice.nextPageId !== null) {
    const page = await storage.loadPage(story.id, choice.nextPageId);
    if (!page) {
      throw new EngineError(
        `Page ${choice.nextPageId} referenced by choice but not found`,
        'PAGE_NOT_FOUND',
      );
    }

    return { page, story, wasGenerated: false };
  }

  if (!apiKey) {
    throw new EngineError(
      'API key is required to generate new pages',
      'VALIDATION_FAILED',
    );
  }

  const { page, updatedStory, deviationInfo } = await generateNextPage(story, parentPage, choiceIndex, apiKey);

  await storage.savePage(story.id, page);
  await storage.updateChoiceLink(story.id, parentPage.id, choiceIndex, page.id);

  if (updatedStory !== story) {
    await storage.updateStory(updatedStory);
  }

  return {
    page,
    story: updatedStory,
    wasGenerated: true,
    deviationInfo,
  };
}

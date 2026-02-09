import {
  generateAnalystEvaluation,
  generateOpeningPage,
  generateWriterPage,
  mergeWriterAndAnalystResults,
} from '../llm';
import type { AnalystResult } from '../llm';
import { logger } from '../logging/index.js';
import {
  createEmptyAccumulatedStructureState,
  generatePageId,
  getLatestStructureVersion,
  isDeviation,
  Page,
  Story,
} from '../models';
import { storage } from '../persistence';
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

export async function generateFirstPage(
  story: Story,
  apiKey: string,
): Promise<{ page: Page; updatedStory: Story }> {
  validateFirstPageStructureVersion(story);

  const result = await generateOpeningPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      npcs: story.npcs,
      startingSituation: story.startingSituation,
      structure: story.structure ?? undefined,
    },
    { apiKey },
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

  const maxPageId = await storage.getMaxPageId(story.id);
  const parentState = collectParentState(parentPage);
  const currentStructureVersion = resolveActiveStructureVersion(story, parentPage);

  // Fetch grandparent page for extended scene context
  const grandparentPage = parentPage.parentPageId
    ? await storage.loadPage(story.id, parentPage.parentPageId)
    : null;

  // Writer call (always runs)
  const writerResult = await generateWriterPage(
    {
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
      grandparentNarrative: grandparentPage?.narrativeText ?? null,
    },
    { apiKey },
  );

  // Analyst call (only when structure exists)
  let analystResult: AnalystResult | null = null;
  const activeStructureForAnalyst = currentStructureVersion?.structure ?? story.structure;
  if (activeStructureForAnalyst && parentState.structureState) {
    try {
      analystResult = await generateAnalystEvaluation(
        {
          narrative: writerResult.narrative,
          structure: activeStructureForAnalyst,
          accumulatedStructureState: parentState.structureState,
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

  const beatConcluded =
    'beatConcluded' in result && typeof result.beatConcluded === 'boolean'
      ? result.beatConcluded
      : false;
  const beatResolution =
    'beatResolution' in result && typeof result.beatResolution === 'string'
      ? result.beatResolution
      : '';

  // Use the active structure (original or rewritten) for progression
  const activeStructure = activeStructureVersion?.structure ?? story.structure;
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
  apiKey: string,
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

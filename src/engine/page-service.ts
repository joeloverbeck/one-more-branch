import { generateContinuationPage, generateOpeningPage } from '../llm';
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

  const result = await generateContinuationPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      globalCanon: story.globalCanon,
      globalCharacterCanon: story.globalCharacterCanon,
      structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
      accumulatedStructureState: parentState.structureState,
      previousNarrative: parentPage.narrativeText,
      selectedChoice: choice.text,
      accumulatedState: parentState.accumulatedState.changes,
      accumulatedInventory: parentState.accumulatedInventory,
      accumulatedHealth: parentState.accumulatedHealth,
      accumulatedCharacterState: parentState.accumulatedCharacterState,
      parentProtagonistAffect: parentPage.protagonistAffect,
    },
    { apiKey },
  );

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
  const newStructureState = activeStructure
    ? applyStructureProgression(
        activeStructure,
        parentState.structureState,
        beatConcluded,
        beatResolution,
      )
    : parentState.structureState;

  const page = buildContinuationPage(result, {
    pageId: newPageId,
    parentPageId: parentPage.id,
    parentChoiceIndex: choiceIndex,
    parentAccumulatedState: parentState.accumulatedState,
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

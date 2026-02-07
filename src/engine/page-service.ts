import { generateContinuationPage, generateOpeningPage } from '../llm';
import {
  addStructureVersion,
  createChoice,
  createEmptyAccumulatedStructureState,
  createPage,
  createRewrittenVersionedStructure,
  generatePageId,
  getLatestStructureVersion,
  getStructureVersion,
  isDeviation,
  Page,
  Story,
  parsePageId,
} from '../models';
import { storage } from '../persistence';
import { updateStoryWithAllCanon } from './canon-manager';
import { createCharacterStateChanges, getParentAccumulatedCharacterState } from './character-state-manager';
import { createHealthChanges, getParentAccumulatedHealth } from './health-manager';
import { createInventoryChanges, getParentAccumulatedInventory } from './inventory-manager';
import { createStateChanges, getParentAccumulatedState } from './state-manager';
import { applyStructureProgression, buildRewriteContext, createInitialStructureState } from './structure-manager';
import { createStructureRewriter } from './structure-rewriter';
import { EngineError } from './types';

export async function generateFirstPage(
  story: Story,
  apiKey: string,
): Promise<{ page: Page; updatedStory: Story }> {
  const result = await generateOpeningPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      structure: story.structure ?? undefined,
    },
    { apiKey },
  );

  const initialStructureVersion = getLatestStructureVersion(story);
  const initialStructureState = story.structure
    ? createInitialStructureState(story.structure)
    : createEmptyAccumulatedStructureState();

  const page = createPage({
    id: parsePageId(1),
    narrativeText: result.narrative,
    choices: result.choices.map(choiceText => createChoice(choiceText)),
    stateChanges: createStateChanges(result.stateChangesAdded, result.stateChangesRemoved),
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    healthChanges: createHealthChanges(result.healthAdded, result.healthRemoved),
    characterStateChanges: createCharacterStateChanges(
      result.characterStateChangesAdded,
      result.characterStateChangesRemoved,
    ),
    isEnding: result.isEnding,
    parentPageId: null,
    parentChoiceIndex: null,
    parentAccumulatedStructureState: initialStructureState,
    structureVersionId: initialStructureVersion?.id ?? null,
  });

  const updatedStory = updateStoryWithAllCanon(story, result.newCanonFacts, result.newCharacterCanonFacts);

  return { page, updatedStory };
}

export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string,
): Promise<{ page: Page; updatedStory: Story }> {
  const choice = parentPage.choices[choiceIndex];
  if (!choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage.id}`,
      'INVALID_CHOICE',
    );
  }

  const maxPageId = await storage.getMaxPageId(story.id);
  const parentAccumulatedState = getParentAccumulatedState(parentPage);
  const parentAccumulatedInventory = getParentAccumulatedInventory(parentPage);
  const parentAccumulatedHealth = getParentAccumulatedHealth(parentPage);
  const parentAccumulatedCharacterState = getParentAccumulatedCharacterState(parentPage);
  const parentStructureState = parentPage.accumulatedStructureState;
  // Use parent page's structure version for branch isolation, fall back to latest if not specified
  const currentStructureVersion = parentPage.structureVersionId
    ? getStructureVersion(story, parentPage.structureVersionId) ?? getLatestStructureVersion(story)
    : getLatestStructureVersion(story);
  const result = await generateContinuationPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      globalCanon: story.globalCanon,
      globalCharacterCanon: story.globalCharacterCanon,
      structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
      accumulatedStructureState: parentStructureState,
      previousNarrative: parentPage.narrativeText,
      selectedChoice: choice.text,
      accumulatedState: parentAccumulatedState.changes,
      accumulatedInventory: parentAccumulatedInventory,
      accumulatedHealth: parentAccumulatedHealth,
      accumulatedCharacterState: parentAccumulatedCharacterState,
    },
    { apiKey },
  );

  const newPageId = generatePageId(maxPageId);

  // Handle deviation if detected - triggers structure rewrite
  let storyForRewrite = story;
  let activeStructureVersion = currentStructureVersion;

  if (
    story.structure &&
    currentStructureVersion &&
    'deviation' in result &&
    isDeviation(result.deviation)
  ) {
    const rewriteContext = buildRewriteContext(
      story,
      currentStructureVersion,
      parentStructureState,
      result.deviation,
    );

    const rewriter = createStructureRewriter();
    const rewriteResult = await rewriter.rewriteStructure(rewriteContext, apiKey);

    const newVersion = createRewrittenVersionedStructure(
      currentStructureVersion,
      rewriteResult.structure,
      rewriteResult.preservedBeatIds,
      result.deviation.reason,
      newPageId,
    );

    storyForRewrite = addStructureVersion(story, newVersion);
    activeStructureVersion = newVersion;
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
        parentStructureState,
        beatConcluded,
        beatResolution,
      )
    : parentStructureState;

  const page = createPage({
    id: newPageId,
    narrativeText: result.narrative,
    choices: result.choices.map(choiceText => createChoice(choiceText)),
    stateChanges: createStateChanges(result.stateChangesAdded, result.stateChangesRemoved),
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    healthChanges: createHealthChanges(result.healthAdded, result.healthRemoved),
    characterStateChanges: createCharacterStateChanges(
      result.characterStateChangesAdded,
      result.characterStateChangesRemoved,
    ),
    isEnding: result.isEnding,
    parentPageId: parentPage.id,
    parentChoiceIndex: choiceIndex,
    parentAccumulatedState,
    parentAccumulatedInventory,
    parentAccumulatedHealth,
    parentAccumulatedCharacterState,
    parentAccumulatedStructureState: newStructureState,
    structureVersionId: activeStructureVersion?.id ?? null,
  });

  const updatedStory = updateStoryWithAllCanon(
    storyForRewrite,
    result.newCanonFacts,
    result.newCharacterCanonFacts,
  );

  return { page, updatedStory };
}

export async function getOrGeneratePage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string,
): Promise<{ page: Page; story: Story; wasGenerated: boolean }> {
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

  const { page, updatedStory } = await generateNextPage(story, parentPage, choiceIndex, apiKey);

  await storage.savePage(story.id, page);
  await storage.updateChoiceLink(story.id, parentPage.id, choiceIndex, page.id);

  if (updatedStory !== story) {
    await storage.updateStory(updatedStory);
  }

  return {
    page,
    story: updatedStory,
    wasGenerated: true,
  };
}

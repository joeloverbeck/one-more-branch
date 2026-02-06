import { generateContinuationPage, generateOpeningPage } from '../llm';
import { createChoice, createPage, generatePageId, Page, Story, parsePageId, updateStoryArc } from '../models';
import { storage } from '../persistence';
import { updateStoryWithAllCanon } from './canon-manager';
import { createInventoryChanges, getParentAccumulatedInventory } from './inventory-manager';
import { getParentAccumulatedState } from './state-manager';
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
    },
    { apiKey },
  );

  const page = createPage({
    id: parsePageId(1),
    narrativeText: result.narrative,
    choices: result.choices.map(choiceText => createChoice(choiceText)),
    stateChanges: result.stateChanges,
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    isEnding: result.isEnding,
    parentPageId: null,
    parentChoiceIndex: null,
  });

  let updatedStory = updateStoryWithAllCanon(story, result.newCanonFacts, result.newCharacterCanonFacts);

  const nextStoryArc = result.storyArc?.trim();
  if (nextStoryArc && nextStoryArc !== updatedStory.storyArc) {
    updatedStory = updateStoryArc(updatedStory, nextStoryArc);
  }

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
  const result = await generateContinuationPage(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      globalCanon: story.globalCanon,
      globalCharacterCanon: story.globalCharacterCanon,
      storyArc: story.storyArc,
      previousNarrative: parentPage.narrativeText,
      selectedChoice: choice.text,
      accumulatedState: parentAccumulatedState.changes,
      accumulatedInventory: parentAccumulatedInventory,
    },
    { apiKey },
  );

  const page = createPage({
    id: generatePageId(maxPageId),
    narrativeText: result.narrative,
    choices: result.choices.map(choiceText => createChoice(choiceText)),
    stateChanges: result.stateChanges,
    inventoryChanges: createInventoryChanges(result.inventoryAdded, result.inventoryRemoved),
    isEnding: result.isEnding,
    parentPageId: parentPage.id,
    parentChoiceIndex: choiceIndex,
    parentAccumulatedState,
    parentAccumulatedInventory,
  });

  let updatedStory = updateStoryWithAllCanon(story, result.newCanonFacts, result.newCharacterCanonFacts);

  const nextStoryArc = result.storyArc?.trim();
  if (nextStoryArc && nextStoryArc !== updatedStory.storyArc) {
    updatedStory = updateStoryArc(updatedStory, nextStoryArc);
  }

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

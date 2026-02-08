import {
  AccumulatedCharacterState,
  AccumulatedStructureState,
  CharacterStateChanges,
  Health,
  HealthChanges,
  Inventory,
  InventoryChanges,
  Page,
  PageId,
  parseStructureVersionId,
  parsePageId,
} from '../models';
import { PageFileData } from './page-serializer-types';
import {
  structureStateToFileData,
  fileDataToStructureState,
  protagonistAffectToFileData,
  fileDataToProtagonistAffect,
  activeStateChangesToFileData,
  accumulatedActiveStateToFileData,
  fileDataToActiveStateChanges,
  fileDataToAccumulatedActiveState,
} from './converters';

// Re-export PageFileData for public API
export { PageFileData } from './page-serializer-types';

export function serializePage(page: Page): PageFileData {
  // Convert CharacterStateChanges to file format
  const characterStateChanges = page.characterStateChanges.map((change) => ({
    characterName: change.characterName,
    added: [...change.added],
    removed: [...change.removed],
  }));

  // Convert AccumulatedCharacterState to file format
  const accumulatedCharacterState: Record<string, string[]> = {};
  for (const [name, state] of Object.entries(page.accumulatedCharacterState)) {
    accumulatedCharacterState[name] = [...state];
  }

  return {
    id: page.id,
    narrativeText: page.narrativeText,
    choices: page.choices.map((choice) => ({
      text: choice.text,
      nextPageId: choice.nextPageId,
    })),
    activeStateChanges: activeStateChangesToFileData(page.activeStateChanges),
    accumulatedActiveState: accumulatedActiveStateToFileData(page.accumulatedActiveState),
    inventoryChanges: {
      added: [...page.inventoryChanges.added],
      removed: [...page.inventoryChanges.removed],
    },
    accumulatedInventory: [...page.accumulatedInventory],
    healthChanges: {
      added: [...page.healthChanges.added],
      removed: [...page.healthChanges.removed],
    },
    accumulatedHealth: [...page.accumulatedHealth],
    characterStateChanges,
    accumulatedCharacterState,
    accumulatedStructureState: structureStateToFileData(page.accumulatedStructureState),
    protagonistAffect: protagonistAffectToFileData(page.protagonistAffect),
    structureVersionId: page.structureVersionId,
    isEnding: page.isEnding,
    parentPageId: page.parentPageId,
    parentChoiceIndex: page.parentChoiceIndex,
  };
}

export function deserializePage(data: PageFileData): Page {
  const inventoryChanges: InventoryChanges = {
    added: [...data.inventoryChanges.added],
    removed: [...data.inventoryChanges.removed],
  };

  const accumulatedInventory: Inventory = [...data.accumulatedInventory];

  const healthChanges: HealthChanges = {
    added: [...data.healthChanges.added],
    removed: [...data.healthChanges.removed],
  };

  const accumulatedHealth: Health = [...data.accumulatedHealth];

  const characterStateChanges: CharacterStateChanges = data.characterStateChanges.map((change) => ({
    characterName: change.characterName,
    added: [...change.added],
    removed: [...change.removed],
  }));

  const accumulatedCharacterState: AccumulatedCharacterState = Object.fromEntries(
    Object.entries(data.accumulatedCharacterState).map(([name, state]) => [name, [...state]])
  );

  const accumulatedStructureState: AccumulatedStructureState = fileDataToStructureState(
    data.accumulatedStructureState
  );
  const structureVersionId =
    data.structureVersionId === undefined || data.structureVersionId === null
      ? null
      : parseStructureVersionId(data.structureVersionId);

  const activeStateChanges = fileDataToActiveStateChanges(data.activeStateChanges);
  const accumulatedActiveState = fileDataToAccumulatedActiveState(data.accumulatedActiveState);

  const protagonistAffect = fileDataToProtagonistAffect(data.protagonistAffect);

  return {
    id: parsePageId(data.id),
    narrativeText: data.narrativeText,
    choices: data.choices.map((choice) => ({
      text: choice.text,
      nextPageId: choice.nextPageId === null ? null : parsePageId(choice.nextPageId),
    })),
    activeStateChanges,
    accumulatedActiveState,
    inventoryChanges,
    accumulatedInventory,
    healthChanges,
    accumulatedHealth,
    characterStateChanges,
    accumulatedCharacterState,
    accumulatedStructureState,
    protagonistAffect,
    structureVersionId,
    isEnding: data.isEnding,
    parentPageId: data.parentPageId === null ? null : parsePageId(data.parentPageId),
    parentChoiceIndex: data.parentChoiceIndex,
  };
}

export function parsePageIdFromFileName(fileName: string): PageId | null {
  const match = fileName.match(/^page_(\d+)\.json$/);
  if (!match?.[1]) {
    return null;
  }

  return parsePageId(parseInt(match[1], 10));
}

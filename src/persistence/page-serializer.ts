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
  StateChanges,
  parsePageId,
} from '../models';

interface BeatProgressionFileData {
  beatId: string;
  status: 'pending' | 'active' | 'concluded';
  resolution?: string;
}

interface AccumulatedStructureStateFileData {
  currentActIndex: number;
  currentBeatIndex: number;
  beatProgressions: BeatProgressionFileData[];
}

export interface PageFileData {
  id: number;
  narrativeText: string;
  choices: Array<{
    text: string;
    nextPageId: number | null;
  }>;
  stateChanges: {
    added: string[];
    removed: string[];
  };
  accumulatedState: {
    changes: string[];
  };
  // Inventory fields (optional for migration from older pages)
  inventoryChanges?: {
    added: string[];
    removed: string[];
  };
  accumulatedInventory?: string[];
  // Health fields (optional for migration from older pages)
  healthChanges?: {
    added: string[];
    removed: string[];
  };
  accumulatedHealth?: string[];
  // Character state fields (optional for migration from older pages)
  characterStateChanges?: Array<{
    characterName: string;
    added: string[];
    removed: string[];
  }>;
  accumulatedCharacterState?: Record<string, string[]>;
  accumulatedStructureState: AccumulatedStructureStateFileData;
  isEnding: boolean;
  parentPageId: number | null;
  parentChoiceIndex: number | null;
}

function structureStateToFileData(
  state: AccumulatedStructureState
): AccumulatedStructureStateFileData {
  return {
    currentActIndex: state.currentActIndex,
    currentBeatIndex: state.currentBeatIndex,
    beatProgressions: state.beatProgressions.map((beatProgression) => ({
      beatId: beatProgression.beatId,
      status: beatProgression.status,
      resolution: beatProgression.resolution,
    })),
  };
}

function fileDataToStructureState(
  data: AccumulatedStructureStateFileData
): AccumulatedStructureState {
  return {
    currentActIndex: data.currentActIndex,
    currentBeatIndex: data.currentBeatIndex,
    beatProgressions: data.beatProgressions.map((beatProgression) => ({
      beatId: beatProgression.beatId,
      status: beatProgression.status,
      resolution: beatProgression.resolution,
    })),
  };
}

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
    stateChanges: {
      added: [...page.stateChanges.added],
      removed: [...page.stateChanges.removed],
    },
    accumulatedState: {
      changes: [...page.accumulatedState.changes],
    },
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
    isEnding: page.isEnding,
    parentPageId: page.parentPageId,
    parentChoiceIndex: page.parentChoiceIndex,
  };
}

export function deserializePage(data: PageFileData): Page {
  // Handle state changes (new format with added/removed)
  const stateChanges: StateChanges = {
    added: [...data.stateChanges.added],
    removed: [...data.stateChanges.removed],
  };

  // Migration: handle existing pages without inventory fields
  const inventoryChanges: InventoryChanges = data.inventoryChanges
    ? {
        added: [...data.inventoryChanges.added],
        removed: [...data.inventoryChanges.removed],
      }
    : { added: [], removed: [] };

  const accumulatedInventory: Inventory = data.accumulatedInventory
    ? [...data.accumulatedInventory]
    : [];

  // Migration: handle existing pages without health fields
  const healthChanges: HealthChanges = data.healthChanges
    ? {
        added: [...data.healthChanges.added],
        removed: [...data.healthChanges.removed],
      }
    : { added: [], removed: [] };

  const accumulatedHealth: Health = data.accumulatedHealth ? [...data.accumulatedHealth] : [];

  // Migration: handle existing pages without character state fields
  const characterStateChanges: CharacterStateChanges = data.characterStateChanges
    ? data.characterStateChanges.map((change) => ({
        characterName: change.characterName,
        added: [...change.added],
        removed: [...change.removed],
      }))
    : [];

  const accumulatedCharacterState: AccumulatedCharacterState = data.accumulatedCharacterState
    ? Object.fromEntries(
        Object.entries(data.accumulatedCharacterState).map(([name, state]) => [name, [...state]])
      )
    : {};

  if (!data.accumulatedStructureState) {
    throw new Error(`Invalid page data: missing accumulatedStructureState for page ${data.id}`);
  }

  const accumulatedStructureState: AccumulatedStructureState = fileDataToStructureState(
    data.accumulatedStructureState
  );

  return {
    id: parsePageId(data.id),
    narrativeText: data.narrativeText,
    choices: data.choices.map((choice) => ({
      text: choice.text,
      nextPageId: choice.nextPageId === null ? null : parsePageId(choice.nextPageId),
    })),
    stateChanges,
    accumulatedState: {
      changes: [...data.accumulatedState.changes],
    },
    inventoryChanges,
    accumulatedInventory,
    healthChanges,
    accumulatedHealth,
    characterStateChanges,
    accumulatedCharacterState,
    accumulatedStructureState,
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

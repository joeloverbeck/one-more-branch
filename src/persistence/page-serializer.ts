import {
  ActiveState,
  ActiveStateChanges,
  AccumulatedCharacterState,
  AccumulatedStructureState,
  CharacterStateChanges,
  Health,
  HealthChanges,
  Inventory,
  InventoryChanges,
  Page,
  PageId,
  ProtagonistAffect,
  StateChanges,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  createDefaultProtagonistAffect,
  parseStructureVersionId,
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

interface SecondaryEmotionFileData {
  emotion: string;
  cause: string;
}

interface ProtagonistAffectFileData {
  primaryEmotion: string;
  primaryIntensity: 'mild' | 'moderate' | 'strong' | 'overwhelming';
  primaryCause: string;
  secondaryEmotions: SecondaryEmotionFileData[];
  dominantMotivation: string;
}

interface TaggedStateEntryFileData {
  prefix: string;
  description: string;
  raw: string;
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
  activeStateChanges?: {
    newLocation: string | null;
    threatsAdded: string[];
    threatsRemoved: string[];
    constraintsAdded: string[];
    constraintsRemoved: string[];
    threadsAdded: string[];
    threadsResolved: string[];
  };
  accumulatedActiveState?: {
    currentLocation: string;
    activeThreats: TaggedStateEntryFileData[];
    activeConstraints: TaggedStateEntryFileData[];
    openThreads: TaggedStateEntryFileData[];
  };
  inventoryChanges: {
    added: string[];
    removed: string[];
  };
  accumulatedInventory: string[];
  healthChanges: {
    added: string[];
    removed: string[];
  };
  accumulatedHealth: string[];
  characterStateChanges: Array<{
    characterName: string;
    added: string[];
    removed: string[];
  }>;
  accumulatedCharacterState: Record<string, string[]>;
  accumulatedStructureState: AccumulatedStructureStateFileData;
  protagonistAffect?: ProtagonistAffectFileData;
  structureVersionId?: string | null;
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
    activeStateChanges: {
      newLocation: page.activeStateChanges.newLocation,
      threatsAdded: [...page.activeStateChanges.threatsAdded],
      threatsRemoved: [...page.activeStateChanges.threatsRemoved],
      constraintsAdded: [...page.activeStateChanges.constraintsAdded],
      constraintsRemoved: [...page.activeStateChanges.constraintsRemoved],
      threadsAdded: [...page.activeStateChanges.threadsAdded],
      threadsResolved: [...page.activeStateChanges.threadsResolved],
    },
    accumulatedActiveState: {
      currentLocation: page.accumulatedActiveState.currentLocation,
      activeThreats: page.accumulatedActiveState.activeThreats.map(entry => ({ ...entry })),
      activeConstraints: page.accumulatedActiveState.activeConstraints.map(entry => ({ ...entry })),
      openThreads: page.accumulatedActiveState.openThreads.map(entry => ({ ...entry })),
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
    protagonistAffect: {
      primaryEmotion: page.protagonistAffect.primaryEmotion,
      primaryIntensity: page.protagonistAffect.primaryIntensity,
      primaryCause: page.protagonistAffect.primaryCause,
      secondaryEmotions: page.protagonistAffect.secondaryEmotions.map(se => ({
        emotion: se.emotion,
        cause: se.cause,
      })),
      dominantMotivation: page.protagonistAffect.dominantMotivation,
    },
    structureVersionId: page.structureVersionId,
    isEnding: page.isEnding,
    parentPageId: page.parentPageId,
    parentChoiceIndex: page.parentChoiceIndex,
  };
}

export function deserializePage(data: PageFileData): Page {
  const stateChanges: StateChanges = {
    added: [...data.stateChanges.added],
    removed: [...data.stateChanges.removed],
  };

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

  const activeStateChanges: ActiveStateChanges = data.activeStateChanges
    ? {
        newLocation: data.activeStateChanges.newLocation,
        threatsAdded: [...data.activeStateChanges.threatsAdded],
        threatsRemoved: [...data.activeStateChanges.threatsRemoved],
        constraintsAdded: [...data.activeStateChanges.constraintsAdded],
        constraintsRemoved: [...data.activeStateChanges.constraintsRemoved],
        threadsAdded: [...data.activeStateChanges.threadsAdded],
        threadsResolved: [...data.activeStateChanges.threadsResolved],
      }
    : createEmptyActiveStateChanges();

  const accumulatedActiveState: ActiveState = data.accumulatedActiveState
    ? {
        currentLocation: data.accumulatedActiveState.currentLocation,
        activeThreats: data.accumulatedActiveState.activeThreats.map(entry => ({ ...entry })),
        activeConstraints: data.accumulatedActiveState.activeConstraints.map(entry => ({ ...entry })),
        openThreads: data.accumulatedActiveState.openThreads.map(entry => ({ ...entry })),
      }
    : createEmptyActiveState();

  // Handle protagonistAffect with backward compatibility for existing pages
  const protagonistAffect: ProtagonistAffect = data.protagonistAffect
    ? {
        primaryEmotion: data.protagonistAffect.primaryEmotion,
        primaryIntensity: data.protagonistAffect.primaryIntensity,
        primaryCause: data.protagonistAffect.primaryCause,
        secondaryEmotions: data.protagonistAffect.secondaryEmotions.map(se => ({
          emotion: se.emotion,
          cause: se.cause,
        })),
        dominantMotivation: data.protagonistAffect.dominantMotivation,
      }
    : createDefaultProtagonistAffect();

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

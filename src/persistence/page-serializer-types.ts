/**
 * Type definitions for page serialization file format.
 * These interfaces define the JSON structure stored on disk.
 */

export interface BeatProgressionFileData {
  beatId: string;
  status: 'pending' | 'active' | 'concluded';
  resolution?: string;
}

export interface AccumulatedStructureStateFileData {
  currentActIndex: number;
  currentBeatIndex: number;
  beatProgressions: BeatProgressionFileData[];
  pagesInCurrentBeat?: number;
  pacingNudge?: string | null;
}

export interface SecondaryEmotionFileData {
  emotion: string;
  cause: string;
}

export interface ProtagonistAffectFileData {
  primaryEmotion: string;
  primaryIntensity: 'mild' | 'moderate' | 'strong' | 'overwhelming';
  primaryCause: string;
  secondaryEmotions: SecondaryEmotionFileData[];
  dominantMotivation: string;
}

export interface TaggedStateEntryFileData {
  prefix: string;
  description: string;
  raw: string;
}

export interface PageFileData {
  id: number;
  narrativeText: string;
  sceneSummary: string;
  choices: Array<{
    text: string;
    choiceType: string;
    primaryDelta: string;
    nextPageId: number | null;
  }>;
  activeStateChanges: {
    newLocation: string | null;
    threatsAdded: string[];
    threatsRemoved: string[];
    constraintsAdded: string[];
    constraintsRemoved: string[];
    threadsAdded: string[];
    threadsResolved: string[];
  };
  accumulatedActiveState: {
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
  protagonistAffect: ProtagonistAffectFileData;
  structureVersionId?: string | null;
  isEnding: boolean;
  parentPageId: number | null;
  parentChoiceIndex: number | null;
}

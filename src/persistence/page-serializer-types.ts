/**
 * Type definitions for page serialization file format.
 * These interfaces define the JSON structure stored on disk.
 */

import type { ThreadType, Urgency } from '../models';

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

export interface KeyedEntryFileData {
  id: string;
  text: string;
}

export interface ThreadEntryFileData extends KeyedEntryFileData {
  threadType: ThreadType;
  urgency: Urgency;
}

export interface ThreadAdditionFileData {
  text: string;
  threadType: ThreadType;
  urgency: Urgency;
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
    threadsAdded: Array<string | ThreadAdditionFileData>;
    threadsResolved: string[];
  };
  accumulatedActiveState: {
    currentLocation: string;
    activeThreats: KeyedEntryFileData[];
    activeConstraints: KeyedEntryFileData[];
    openThreads: ThreadEntryFileData[];
  };
  inventoryChanges: {
    added: string[];
    removed: string[];
  };
  accumulatedInventory: KeyedEntryFileData[];
  healthChanges: {
    added: string[];
    removed: string[];
  };
  accumulatedHealth: KeyedEntryFileData[];
  characterStateChanges: {
    added: Array<{
      characterName: string;
      states: string[];
    }>;
    removed: string[];
  };
  accumulatedCharacterState: Record<string, KeyedEntryFileData[]>;
  accumulatedStructureState: AccumulatedStructureStateFileData;
  protagonistAffect: ProtagonistAffectFileData;
  structureVersionId?: string | null;
  isEnding: boolean;
  parentPageId: number | null;
  parentChoiceIndex: number | null;
}

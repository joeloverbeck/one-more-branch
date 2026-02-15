/**
 * Type definitions for page serialization file format.
 * These interfaces define the JSON structure stored on disk.
 */

import type { ConstraintType, ThreatType, ThreadType, Urgency } from '../models';

export interface BeatProgressionFileData {
  beatId: string;
  status: 'pending' | 'active' | 'concluded';
  resolution?: string;
}

export interface AccumulatedStructureStateFileData {
  currentActIndex: number;
  currentBeatIndex: number;
  beatProgressions: BeatProgressionFileData[];
  pagesInCurrentBeat: number;
  pacingNudge: string | null;
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

export interface ThreatEntryFileData extends KeyedEntryFileData {
  threatType: ThreatType;
}

export interface ConstraintEntryFileData extends KeyedEntryFileData {
  constraintType: ConstraintType;
}

export interface ThreatAdditionFileData {
  text: string;
  threatType: ThreatType;
}

export interface ConstraintAdditionFileData {
  text: string;
  constraintType: ConstraintType;
}

export interface ThreadAdditionFileData {
  text: string;
  threadType: ThreadType;
  urgency: Urgency;
}

export interface StoryBibleCharacterFileData {
  name: string;
  role: string;
  relevantProfile: string;
  speechPatterns: string;
  protagonistRelationship: string;
  interCharacterDynamics?: string;
  currentState: string;
}

export interface StoryBibleFileData {
  sceneWorldContext: string;
  relevantCharacters: StoryBibleCharacterFileData[];
  relevantCanonFacts: string[];
  relevantHistory: string;
}

export interface DetectedPromiseFileData {
  description: string;
  promiseType: string;
  suggestedUrgency: string;
}

export interface TrackedPromiseFileData extends DetectedPromiseFileData {
  id: string;
  age: number;
}

export interface ThreadPayoffAssessmentFileData {
  threadId: string;
  threadText: string;
  satisfactionLevel: string;
  reasoning: string;
}

export interface PromisePayoffAssessmentFileData {
  promiseId: string;
  description: string;
  satisfactionLevel: string;
  reasoning: string;
}

export interface NpcAgendaFileData {
  npcName: string;
  currentGoal: string;
  leverage: string;
  fear: string;
  offScreenBehavior: string;
}

export interface NpcRelationshipFileData {
  npcName: string;
  valence: number;
  dynamic: string;
  history: string;
  currentTension: string;
  leverage: string;
}

export interface DetectedRelationshipShiftFileData {
  npcName: string;
  shiftDescription: string;
  suggestedValenceChange: number;
  suggestedNewDynamic: string;
}

export interface AnalystResultFileData {
  beatConcluded: boolean;
  beatResolution: string;
  deviationDetected: boolean;
  deviationReason: string;
  invalidatedBeatIds: string[];
  narrativeSummary: string;
  pacingIssueDetected: boolean;
  pacingIssueReason: string;
  recommendedAction: string;
  sceneMomentum: string;
  objectiveEvidenceStrength: string;
  commitmentStrength: string;
  structuralPositionSignal: string;
  entryConditionReadiness: string;
  objectiveAnchors: string[];
  anchorEvidence: string[];
  completionGateSatisfied: boolean;
  completionGateFailureReason: string;
  toneAdherent: boolean;
  toneDriftDescription: string;
  npcCoherenceAdherent: boolean;
  npcCoherenceIssues: string;
  promisesDetected: DetectedPromiseFileData[];
  promisesResolved: string[];
  promisePayoffAssessments: PromisePayoffAssessmentFileData[];
  threadPayoffAssessments: ThreadPayoffAssessmentFileData[];
  relationshipShiftsDetected: DetectedRelationshipShiftFileData[];
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
    threatsAdded: ThreatAdditionFileData[];
    threatsRemoved: string[];
    constraintsAdded: ConstraintAdditionFileData[];
    constraintsRemoved: string[];
    threadsAdded: Array<string | ThreadAdditionFileData>;
    threadsResolved: string[];
  };
  accumulatedActiveState: {
    currentLocation: string;
    activeThreats: ThreatEntryFileData[];
    activeConstraints: ConstraintEntryFileData[];
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
  structureVersionId: string | null;
  storyBible: StoryBibleFileData | null;
  analystResult: AnalystResultFileData | null;
  threadAges: Record<string, number>;
  accumulatedPromises: TrackedPromiseFileData[];
  resolvedThreadMeta: Record<string, { threadType: string; urgency: string }>;
  resolvedPromiseMeta: Record<string, { promiseType: string; urgency: string }>;
  npcAgendaUpdates: NpcAgendaFileData[];
  accumulatedNpcAgendas: Record<string, NpcAgendaFileData>;
  npcRelationshipUpdates: NpcRelationshipFileData[];
  accumulatedNpcRelationships: Record<string, NpcRelationshipFileData>;
  isEnding: boolean;
  parentPageId: number | null;
  parentChoiceIndex: number | null;
}

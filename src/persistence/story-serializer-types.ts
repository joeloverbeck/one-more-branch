/**
 * Type definitions for story serialization file format.
 * These interfaces define the JSON structure stored on disk.
 */

import type { ConceptSpec } from '../models';

export interface SpeechFingerprintFileData {
  catchphrases: string[];
  vocabularyProfile: string;
  sentencePatterns: string;
  verbalTics: string[];
  dialogueSamples: string[];
  metaphorFrames: string;
  antiExamples: string[];
  discourseMarkers: string[];
  registerShifts: string;
}

export interface DecomposedRelationshipFileData {
  valence: number;
  dynamic: string;
  history: string;
  currentTension: string;
  leverage: string;
}

export interface DecomposedCharacterFileData {
  name: string;
  speechFingerprint: SpeechFingerprintFileData;
  coreTraits: string[];
  /** @deprecated Use superObjective instead. Kept for backward-compatible deserialization. */
  motivations?: string;
  superObjective?: string;
  thematicStance: string;
  protagonistRelationship?: DecomposedRelationshipFileData | null;
  knowledgeBoundaries: string;
  falseBeliefs?: string[];
  secretsKept?: string[];
  decisionPattern: string;
  coreBeliefs: string[];
  conflictPriority: string;
  appearance: string;
  rawDescription: string;
  stakes?: string[];
  pressurePoint?: string;
  personalDilemmas?: string[];
  emotionSalience?: string;
  storyFunction?: string;
  narrativeRole?: string;
}

export interface WorldFactFileData {
  id?: string;
  domain: string;
  fact: string;
  scope: string;
  factType?: string;
  narrativeWeight?: string;
  thematicTag?: string;
  sensoryHook?: string;
  exampleEvidence?: string;
  tensionWithIds?: string[];
  implicationOfIds?: string[];
  storyFunctions?: string[];
  sceneAffordances?: string[];
}

export interface DecomposedWorldFileData {
  facts: WorldFactFileData[];
  rawWorldbuilding?: string;
  worldLogline?: string;
  openQuestions?: string[];
}

export interface CanonFactFileData {
  text: string;
  factType: string;
}

export interface SpineFileData {
  centralDramaticQuestion: string;
  protagonistNeedVsWant: { need: string; want: string; dynamic: string };
  primaryAntagonisticForce: { description: string; pressureMechanism: string };
  storySpineType: string;
  conflictAxis?: string;
  conflictType: string;
  characterArcType: string;
  toneFeel?: string[];
  toneAvoid?: string[];
  wantNeedCollisionPoint?: string;
  protagonistDeepestFear?: string;
}

export interface StoryStructureFileData {
  anchorMoments?: {
    incitingIncident: {
      actIndex: number;
      description: string;
    };
    midpoint: {
      actIndex: number;
      milestoneSlot: number;
      midpointType: string;
    };
    climax: {
      actIndex: number;
      description: string;
    };
    signatureScenarioPlacement: {
      actIndex: number;
      description: string;
    } | null;
  };
  acts: Array<{
    id: string;
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    actQuestion?: string;
    exitReversal?: string;
    promiseTargets?: string[];
    obligationTargets?: string[];
    milestones: Array<{
      id: string;
      name: string;
      description: string;
      objective: string;
      causalLink: string;
      exitCondition?: string;
      role: string;
      escalationType?: string | null;
      secondaryEscalationType?: string | null;
      crisisType?: string | null;
      expectedGapMagnitude?: string | null;
      isMidpoint: boolean;
      midpointType: string | null;
      uniqueScenarioHook?: string | null;
      approachVectors?: string[] | null;
      setpieceSourceIndex?: number | null;
      obligatorySceneTag?: string | null;
    }>;
  }>;
  overallTheme: string;
  premise: string;
  openingImage: string;
  closingImage: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  generatedAt: string;
}

export interface VersionedStoryStructureFileData {
  id: string;
  structure: StoryStructureFileData;
  previousVersionId: string | null;
  createdAtPageId: number | null;
  rewriteReason: string | null;
  preservedMilestoneIds: string[];
  createdAt: string;
}

export interface StoryFileData {
  id: string;
  title: string;
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  toneFeel?: string[];
  toneAvoid?: string[];
  npcs: Array<{ name: string; description: string }> | null;
  startingSituation: string | null;
  globalCanon: CanonFactFileData[];
  globalCharacterCanon: Record<string, string[]>;
  structure: StoryStructureFileData | null;
  structureVersions: VersionedStoryStructureFileData[];
  spine?: SpineFileData;
  conceptSpec?: ConceptSpec;
  premisePromises: string[];
  decomposedCharacters?: DecomposedCharacterFileData[];
  decomposedWorld?: DecomposedWorldFileData;
  initialNpcAgendas?: Array<{
    npcName: string;
    currentGoal: string;
    leverage: string;
    fear: string;
    offScreenBehavior: string;
  }>;
  initialNpcRelationships?: Array<{
    npcName: string;
    valence: number;
    dynamic: string;
    history: string;
    currentTension: string;
    leverage: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

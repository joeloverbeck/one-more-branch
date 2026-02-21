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
  motivations: string;
  protagonistRelationship?: DecomposedRelationshipFileData | null;
  knowledgeBoundaries: string;
  falseBeliefs?: string[];
  secretsKept?: string[];
  decisionPattern: string;
  coreBeliefs: string[];
  conflictPriority: string;
  appearance: string;
  rawDescription: string;
}

export interface WorldFactFileData {
  domain: string;
  fact: string;
  scope: string;
  factType?: string;
}

export interface DecomposedWorldFileData {
  facts: WorldFactFileData[];
  rawWorldbuilding: string;
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
  /** @deprecated Read-path only: old field name for backward compat */
  toneKeywords?: string[];
  /** @deprecated Read-path only: old field name for backward compat */
  toneAntiKeywords?: string[];
}

export interface StoryStructureFileData {
  acts: Array<{
    id: string;
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      id: string;
      name: string;
      description: string;
      objective: string;
      role: string;
      escalationType?: string | null;
      uniqueScenarioHook?: string | null;
      approachVectors?: string[] | null;
    }>;
  }>;
  overallTheme: string;
  premise: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  generatedAt: string;
}

export interface VersionedStoryStructureFileData {
  id: string;
  structure: StoryStructureFileData;
  previousVersionId: string | null;
  createdAtPageId: number | null;
  rewriteReason: string | null;
  preservedBeatIds: string[];
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
  /** @deprecated Read-path only: old field name for backward compat */
  toneKeywords?: string[];
  /** @deprecated Read-path only: old field name for backward compat */
  toneAntiKeywords?: string[];
  npcs: Array<{ name: string; description: string }> | null;
  startingSituation: string | null;
  globalCanon: CanonFactFileData[];
  globalCharacterCanon: Record<string, string[]>;
  structure: StoryStructureFileData | null;
  structureVersions: VersionedStoryStructureFileData[];
  spine?: SpineFileData;
  conceptSpec?: ConceptSpec;
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

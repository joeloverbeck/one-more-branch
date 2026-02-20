/**
 * Per-stage output interfaces for the character-building pipeline.
 *
 * Each stage produces a typed result that feeds into all subsequent stages.
 */

import type {
  StoryFunction,
  CharacterDepth,
  ReplanningPolicy,
  EmotionSalience,
  PipelineRelationshipType,
  RelationshipValence,
  VoiceRegister,
} from './character-enums.js';
import type { SpeechFingerprint } from './decomposed-character.js';

// --- Stage 1: Cast Roles ---

export interface CastRoleAssignment {
  readonly characterName: string;
  readonly isProtagonist: boolean;
  readonly storyFunction: StoryFunction;
  readonly characterDepth: CharacterDepth;
  readonly narrativeRole: string;
  readonly conflictRelationship: string;
}

export interface CastRolesResult {
  readonly assignments: readonly CastRoleAssignment[];
  readonly castDynamicsSummary: string;
}

// --- Stage 2: Character Kernels ---

export interface CharacterKernel {
  readonly characterName: string;
  readonly superObjective: string;
  readonly immediateObjectives: readonly string[];
  readonly primaryOpposition: string;
  readonly stakes: readonly string[];
  readonly constraints: readonly string[];
  readonly pressurePoint: string;
}

// --- Stage 3: Tridimensional Profiles ---

export interface TridimensionalProfile {
  readonly characterName: string;
  readonly physiology: string;
  readonly sociology: string;
  readonly psychology: string;
  readonly derivationChain: string;
  readonly coreTraits: readonly string[];
}

// --- Stage 4: Agency Models ---

export interface AgencyModel {
  readonly characterName: string;
  readonly replanningPolicy: ReplanningPolicy;
  readonly emotionSalience: EmotionSalience;
  readonly coreBeliefs: readonly string[];
  readonly desires: readonly string[];
  readonly currentIntentions: readonly string[];
  readonly falseBeliefs: readonly string[];
  readonly decisionPattern: string;
}

// --- Stage 5: Social Web ---

export interface CastRelationship {
  readonly fromCharacter: string;
  readonly toCharacter: string;
  readonly relationshipType: PipelineRelationshipType;
  readonly valence: RelationshipValence;
  readonly numericValence: number;
  readonly history: string;
  readonly currentTension: string;
  readonly leverage: string;
}

export interface SocialWebResult {
  readonly relationships: readonly CastRelationship[];
  readonly secrets: readonly CastSecret[];
  readonly dilemmas: readonly string[];
}

export interface CastSecret {
  readonly characterName: string;
  readonly secret: string;
}

// --- Stage 6: Textual Presentation ---

export interface TextualPresentation {
  readonly characterName: string;
  readonly voiceRegister: VoiceRegister;
  readonly speechFingerprint: SpeechFingerprint;
  readonly appearance: string;
  readonly knowledgeBoundaries: string;
  readonly conflictPriority: string;
}

// --- Pipeline stage numbering ---

export type CastPipelineStage = 1 | 2 | 3 | 4 | 5 | 6;

export const CAST_PIPELINE_STAGE_NAMES: Record<CastPipelineStage, string> = {
  1: 'Cast Roles',
  2: 'Character Kernels',
  3: 'Tridimensional Profiles',
  4: 'Agency Models',
  5: 'Social Web',
  6: 'Textual Presentation',
};

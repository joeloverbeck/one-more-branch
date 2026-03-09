/**
 * Per-stage output interfaces for the character-building pipeline.
 *
 * Each stage produces a typed result that feeds into all subsequent stages.
 */

import {
  type StoryFunction,
  type CharacterDepth,
  type ReplanningPolicy,
  type EmotionSalience,
  type PipelineRelationshipType,
  type RelationshipValence,
  type VoiceRegister,
  isPipelineRelationshipType,
  isRelationshipValence,
} from './character-enums.js';
import type { ConceptSpec } from './concept-generator.js';
import type { SpeechFingerprint } from './decomposed-character.js';
import type { StoryKernel } from './story-kernel.js';

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

// --- Shared pipeline inputs ---

export interface CastPipelineInputs {
  readonly kernelSummary?: string;
  readonly conceptSummary?: string;
  readonly userNotes?: string;
  readonly storyKernel?: StoryKernel;
  readonly conceptSpec?: ConceptSpec;
}

// --- Character Web: lightweight relationship archetype ---

export interface RelationshipArchetype {
  readonly fromCharacter: string;
  readonly toCharacter: string;
  readonly relationshipType: PipelineRelationshipType;
  readonly valence: RelationshipValence;
  readonly essentialTension: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isRelationshipArchetype(value: unknown): value is RelationshipArchetype {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value['fromCharacter'] === 'string' &&
    typeof value['toCharacter'] === 'string' &&
    isPipelineRelationshipType(value['relationshipType']) &&
    isRelationshipValence(value['valence']) &&
    typeof value['essentialTension'] === 'string'
  );
}

// --- Individual character development: deep relationships result ---

export interface DeepRelationshipResult {
  readonly relationships: readonly CastRelationship[];
  readonly secrets: readonly string[];
  readonly personalDilemmas: readonly string[];
}

// --- Individual character development stage numbering ---

export type CharacterDevStage = 1 | 2 | 3 | 4 | 5;

export const CHARACTER_DEV_STAGE_NAMES: Record<CharacterDevStage, string> = {
  1: 'Character Kernel',
  2: 'Tridimensional Profile',
  3: 'Agency Model',
  4: 'Deep Relationships',
  5: 'Textual Presentation',
};

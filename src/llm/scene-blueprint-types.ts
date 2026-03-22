import type { GenreFrame } from '../models/concept-generator.js';
import type { StorySpine } from '../models/story-spine.js';
import type { StoryBible } from './lorekeeper-types.js';
import type { PagePlanGenerationResult } from './planner-types.js';

export type SceneFunction =
  | 'GOAL'
  | 'CONFLICT'
  | 'DISASTER'
  | 'REACTION'
  | 'DILEMMA'
  | 'DECISION'
  | 'SETUP'
  | 'TURN';

export type MruType = 'MOTIVATION' | 'REACTION' | 'MIXED';

export interface NarrativeUnit {
  readonly action: string;
  readonly emotionalRegister: string;
  readonly sceneFunction: SceneFunction;
  readonly mruType: MruType;
  readonly sensoryAnchor: string;
  readonly paragraphWeight: number;
  readonly speakingCharacters?: readonly string[];
}

export interface MandateMapping {
  readonly mandate: string;
  readonly unitIndex: number;
}

export interface SceneBlueprintResult {
  readonly units: readonly NarrativeUnit[];
  readonly emotionalArc: string;
  readonly mandateMapping: readonly MandateMapping[];
  readonly rawResponse: string;
}

export interface SceneBlueprintContext {
  readonly pagePlan: PagePlanGenerationResult;
  readonly storyBible: StoryBible | null;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly spine?: StorySpine;
  readonly genreFrame?: GenreFrame;
  readonly isEnding: boolean;
  readonly previousNarrative: string;
  readonly selectedChoice?: string;
  readonly isOpening: boolean;
  readonly openingImage?: string;
}

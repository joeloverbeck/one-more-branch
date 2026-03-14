import type { ConceptSpec } from '../models/concept-generator.js';
import type { DecomposedCharacter } from '../models/decomposed-character.js';
import type { DecomposedWorld } from '../models/decomposed-world.js';
import type { StoryStructure } from '../models/story-arc.js';
import type { StorySpine } from '../models/story-spine.js';

export interface CompletedBeat {
  readonly actIndex: number;
  readonly milestoneIndex: number;
  readonly milestoneId: string;
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly causalLink: string;
  readonly role: string;
  readonly escalationType: string | null;
  readonly secondaryEscalationType: string | null;
  readonly crisisType: string | null;
  readonly expectedGapMagnitude: string | null;
  readonly isMidpoint: boolean;
  readonly midpointType: string | null;
  readonly uniqueScenarioHook: string | null;
  readonly approachVectors: readonly string[] | null;
  readonly setpieceSourceIndex: number | null;
  readonly obligatorySceneTag: string | null;
  readonly resolution: string;
}

export interface PlannedBeat {
  readonly actIndex: number;
  readonly milestoneIndex: number;
  readonly milestoneId: string;
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly causalLink: string;
  readonly role: string;
  readonly escalationType: string | null;
  readonly secondaryEscalationType: string | null;
  readonly crisisType: string | null;
  readonly expectedGapMagnitude: string | null;
  readonly isMidpoint: boolean;
  readonly midpointType: string | null;
  readonly uniqueScenarioHook: string | null;
  readonly approachVectors: readonly string[] | null;
  readonly setpieceSourceIndex: number | null;
  readonly obligatorySceneTag: string | null;
}

export interface StructureRewriteContext {
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly spine?: StorySpine;
  readonly conceptSpec?: ConceptSpec;
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly decomposedWorld: DecomposedWorld;
  readonly completedBeats: readonly CompletedBeat[];
  readonly plannedBeats: readonly PlannedBeat[];
  readonly sceneSummary: string;
  readonly currentActIndex: number;
  readonly currentMilestoneIndex: number;
  readonly deviationReason: string;
  readonly originalTheme: string;
  readonly originalOpeningImage: string;
  readonly originalClosingImage: string;
  readonly totalActCount: number;
}

export interface StructureRewriteResult {
  readonly structure: StoryStructure;
  readonly preservedMilestoneIds: readonly string[];
  readonly rawResponse: string;
}

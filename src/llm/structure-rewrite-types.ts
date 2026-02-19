import type { ConceptSpec } from '../models/concept-generator.js';
import type { DecomposedCharacter } from '../models/decomposed-character.js';
import type { DecomposedWorld } from '../models/decomposed-world.js';
import type { StoryStructure } from '../models/story-arc.js';
import type { StorySpine } from '../models/story-spine.js';

export interface CompletedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly beatId: string;
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly role: string;
  readonly resolution: string;
}

export interface PlannedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly beatId: string;
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly role: string;
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
  readonly narrativeSummary: string;
  readonly currentActIndex: number;
  readonly currentBeatIndex: number;
  readonly deviationReason: string;
  readonly originalTheme: string;
  readonly totalActCount: number;
}

export interface StructureRewriteResult {
  readonly structure: StoryStructure;
  readonly preservedBeatIds: readonly string[];
  readonly rawResponse: string;
}

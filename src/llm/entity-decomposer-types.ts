import type { ConceptSpec } from '../models/concept-generator.js';
import type { DecomposedCharacter } from '../models/decomposed-character.js';
import type { DecomposedWorld } from '../models/decomposed-world.js';
import type { Npc } from '../models/npc.js';
import type { StoryKernel } from '../models/story-kernel.js';
import type { StorySpine } from '../models/story-spine.js';

export interface EntityDecomposerContext {
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly npcs?: readonly Npc[];
  readonly spine?: StorySpine;
  readonly conceptSpec?: ConceptSpec;
  readonly storyKernel?: StoryKernel;
  readonly startingSituation?: string;
}

export interface EntityDecompositionResult {
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly decomposedWorld: DecomposedWorld;
  readonly rawResponse: string;
}

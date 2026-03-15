import type { ConceptSpec } from '../../models/concept-generator.js';
import type { ConceptVerification } from '../../models/concept-generator.js';
import type { DecomposedWorld } from '../../models/decomposed-world.js';
import type { Npc } from '../../models/npc.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import type { StoryKernel } from '../../models/story-kernel.js';

export interface SpinePromptContext {
  characterConcept: string;
  worldbuilding?: string;
  decomposedWorld?: DecomposedWorld;
  tone: string;
  npcs?: readonly Npc[];
  decomposedCharacters?: readonly StandaloneDecomposedCharacter[];
  startingSituation?: string;
  conceptSpec?: ConceptSpec;
  storyKernel?: StoryKernel;
  conceptVerification?: ConceptVerification;
  contentPreferences?: string;
}

import type { DecomposedCharacter } from '../models/decomposed-character.js';
import type { DecomposedWorld } from '../models/decomposed-world.js';
import type { Npc } from '../models/npc.js';

export interface EntityDecomposerContext {
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: string;
  readonly toneKeywords?: readonly string[];
  readonly toneAntiKeywords?: readonly string[];
  readonly npcs?: readonly Npc[];
}

export interface EntityDecompositionResult {
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly decomposedWorld: DecomposedWorld;
  readonly rawResponse: string;
}

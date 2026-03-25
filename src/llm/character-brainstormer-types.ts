import type { ConceptSpec } from '../models/concept-generator.js';
import type { StoryKernel } from '../models/story-kernel.js';
import type { DecomposedWorld } from '../models/decomposed-world.js';

export interface ExistingCharacterSummary {
  readonly name: string;
  readonly storyFunction: string | null;
  readonly narrativeRole: string | null;
  readonly superObjective: string | null;
}

export interface CharacterBrainstormerContext {
  readonly conceptSpec: ConceptSpec;
  readonly storyKernel: StoryKernel;
  readonly decomposedWorld: DecomposedWorld | null;
  readonly rawWorldbuilding: string | null;
  readonly existingCharacterNames: readonly ExistingCharacterSummary[];
  readonly userNotes: string;
}

export interface BrainstormedCharacter {
  readonly name: string;
  readonly highConceptPitch: string;
  readonly coreWound: string;
  readonly centralContradiction: string;
  readonly archetypeAndSubversion: string;
  readonly suggestedStoryFunction: string;
  readonly relationshipDynamicHint: string;
  readonly whatMakesThemMemorable: string;
  readonly metaphorFamily: string;
}

export interface CharacterBrainstormerResult {
  readonly characters: readonly BrainstormedCharacter[];
  readonly diversityNote: string;
}

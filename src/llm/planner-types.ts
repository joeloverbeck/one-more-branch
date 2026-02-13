import { ChoiceType, PrimaryDelta } from '../models/choice-enums.js';
import type { ThreadAdd } from './writer-types.js';

export interface TextIntentMutations {
  add: string[];
  removeIds: string[];
}

export interface ThreadIntentMutations {
  add: ThreadAdd[];
  resolveIds: string[];
}

export interface CharacterStateIntentAdd {
  characterName: string;
  states: string[];
}

export interface CharacterStateIntentMutations {
  add: CharacterStateIntentAdd[];
  removeIds: string[];
}

export interface CanonIntents {
  worldAdd: string[];
  characterAdd: Array<{ characterName: string; facts: string[] }>;
}

export interface ChoiceIntent {
  hook: string;
  choiceType: ChoiceType;
  primaryDelta: PrimaryDelta;
}

export interface PagePlan {
  sceneIntent: string;
  continuityAnchors: string[];
  stateIntents: {
    currentLocation: string;
    threats: TextIntentMutations;
    constraints: TextIntentMutations;
    threads: ThreadIntentMutations;
    inventory: TextIntentMutations;
    health: TextIntentMutations;
    characterState: CharacterStateIntentMutations;
    canon: CanonIntents;
  };
  writerBrief: {
    openingLineDirective: string;
    mustIncludeBeats: string[];
    forbiddenRecaps: string[];
  };
  dramaticQuestion: string;
  choiceIntents: ChoiceIntent[];
}

export interface PagePlanGenerationResult extends PagePlan {
  rawResponse: string;
}

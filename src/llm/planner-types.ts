import { ChoiceType, PrimaryDelta } from '../models/choice-enums.js';
import type { ThreadAdd } from './writer-types.js';

export interface TextIntentMutations {
  add: string[];
  removeIds: string[];
}

export interface ThreatAdd {
  text: string;
  threatType: string;
}

export interface ConstraintAdd {
  text: string;
  constraintType: string;
}

export interface ThreatIntentMutations {
  add: ThreatAdd[];
  removeIds: string[];
}

export interface ConstraintIntentMutations {
  add: ConstraintAdd[];
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

export interface ReducedPagePlanResult {
  sceneIntent: string;
  continuityAnchors: string[];
  writerBrief: {
    openingLineDirective: string;
    mustIncludeBeats: string[];
    forbiddenRecaps: string[];
  };
  dramaticQuestion: string;
  choiceIntents: ChoiceIntent[];
}

export interface ReducedPagePlanGenerationResult extends ReducedPagePlanResult {
  rawResponse: string;
}

export interface PagePlan {
  sceneIntent: string;
  continuityAnchors: string[];
  stateIntents: {
    currentLocation: string;
    threats: ThreatIntentMutations;
    constraints: ConstraintIntentMutations;
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

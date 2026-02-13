import type {
  CanonIntents,
  CharacterStateIntentMutations,
  ConstraintIntentMutations,
  TextIntentMutations,
  ThreatIntentMutations,
  ThreadIntentMutations,
} from './planner-types.js';

export interface StateAccountantResult {
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
}

export interface StateAccountantGenerationResult extends StateAccountantResult {
  rawResponse: string;
}

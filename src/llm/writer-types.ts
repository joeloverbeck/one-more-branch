import { ChoiceType, PrimaryDelta } from '../models/choice-enums.js';
import type { ProtagonistAffect } from '../models/protagonist-affect.js';
import type { ThreadType, Urgency } from '../models/state/index.js';
import type { StateReconciliationResult } from '../engine/state-reconciler-types.js';

export interface ThreadAdd {
  text: string;
  threadType: ThreadType;
  urgency: Urgency;
}

export interface PageWriterResult {
  narrative: string;
  choices: Array<{ text: string; choiceType: ChoiceType; primaryDelta: PrimaryDelta }>;
  sceneSummary: string;
  protagonistAffect: ProtagonistAffect;
  isEnding: boolean;
  rawResponse: string;
}

export interface WriterResult extends PageWriterResult {
  // State and canon fields produced by the writer LLM.
  // The reconciler derives final state from plan intents, not these fields.
  currentLocation: string;
  threatsAdded: string[];
  threatsRemoved: string[];
  constraintsAdded: string[];
  constraintsRemoved: string[];
  threadsAdded: ThreadAdd[];
  threadsResolved: string[];
  newCanonFacts: string[];
  newCharacterCanonFacts: Record<string, string[]>;
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
  characterStateChangesRemoved: string[];
}

export type FinalPageGenerationResult = PageWriterResult & StateReconciliationResult;

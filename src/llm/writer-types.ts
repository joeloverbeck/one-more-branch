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

export type FinalPageGenerationResult = PageWriterResult & StateReconciliationResult;

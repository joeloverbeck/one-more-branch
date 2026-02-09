import type { AccumulatedStructureState } from '../models/story-arc';

/**
 * Result of advancing the structure state machine.
 */
export interface StructureProgressionResult {
  updatedState: AccumulatedStructureState;
  actAdvanced: boolean;
  beatAdvanced: boolean;
  isComplete: boolean;
}

/**
 * Raw result from LLM structure generation.
 */
export interface StructureGenerationResult {
  overallTheme: string;
  premise: string;
  pacingBudget: { targetPagesMin: number; targetPagesMax: number };
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      description: string;
      objective: string;
      role: string;
    }>;
  }>;
  rawResponse: string;
}

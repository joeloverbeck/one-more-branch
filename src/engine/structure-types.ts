import type { AccumulatedStructureState } from '../models/story-arc';
import type { StructureGenerationResult } from '../models/structure-generation';

/**
 * Result of advancing the structure state machine.
 */
export interface StructureProgressionResult {
  updatedState: AccumulatedStructureState;
  actAdvanced: boolean;
  milestoneAdvanced: boolean;
  isComplete: boolean;
}

export type { StructureGenerationResult };

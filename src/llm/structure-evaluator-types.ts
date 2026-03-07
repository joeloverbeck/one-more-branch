import type { ActiveState } from '../models/state/index.js';
import type { AccumulatedStructureState, StoryStructure } from '../models/story-arc.js';
import type { StorySpine } from '../models/story-spine.js';

export type PacingRecommendedAction = 'none' | 'nudge' | 'rewrite';
export type SceneMomentum =
  | 'STASIS'
  | 'INCREMENTAL_PROGRESS'
  | 'MAJOR_PROGRESS'
  | 'REVERSAL_OR_SETBACK'
  | 'SCOPE_SHIFT';
export type ObjectiveEvidenceStrength = 'NONE' | 'WEAK_IMPLICIT' | 'CLEAR_EXPLICIT';
export type CommitmentStrength =
  | 'NONE'
  | 'TENTATIVE'
  | 'EXPLICIT_REVERSIBLE'
  | 'EXPLICIT_IRREVERSIBLE';
export type StructuralPositionSignal =
  | 'WITHIN_ACTIVE_BEAT'
  | 'BRIDGING_TO_NEXT_BEAT'
  | 'CLEARLY_IN_NEXT_BEAT';
export type EntryConditionReadiness = 'NOT_READY' | 'PARTIAL' | 'READY';
export type BeatAlignmentConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface StructureEvaluatorResult {
  beatConcluded: boolean;
  beatResolution: string;
  sceneMomentum: SceneMomentum;
  objectiveEvidenceStrength: ObjectiveEvidenceStrength;
  commitmentStrength: CommitmentStrength;
  structuralPositionSignal: StructuralPositionSignal;
  entryConditionReadiness: EntryConditionReadiness;
  objectiveAnchors: string[];
  anchorEvidence: string[];
  completionGateSatisfied: boolean;
  completionGateFailureReason: string;
  deviationDetected: boolean;
  deviationReason: string;
  invalidatedBeatIds: string[];
  spineDeviationDetected: boolean;
  spineDeviationReason: string;
  spineInvalidatedElement: 'dramatic_question' | 'antagonistic_force' | 'need_want' | null;
  alignedBeatId: string | null;
  beatAlignmentConfidence: BeatAlignmentConfidence;
  beatAlignmentReason: string;
  pacingIssueDetected: boolean;
  pacingIssueReason: string;
  recommendedAction: PacingRecommendedAction;
  pacingDirective: string;
}

export interface StructureEvaluatorContext {
  readonly narrative: string;
  readonly structure: StoryStructure;
  readonly accumulatedStructureState: AccumulatedStructureState;
  readonly activeState: ActiveState;
  readonly threadsResolved: readonly string[];
  readonly threadAges: Readonly<Record<string, number>>;
  readonly spine?: StorySpine;
}

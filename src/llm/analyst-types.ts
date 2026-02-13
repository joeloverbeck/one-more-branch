import type {
  ActiveState,
  NarrativePromise,
  ThreadPayoffAssessment,
} from '../models/state/index.js';
import type { AccumulatedStructureState, StoryStructure } from '../models/story-arc.js';

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

export interface AnalystResult {
  beatConcluded: boolean;
  beatResolution: string;
  deviationDetected: boolean;
  deviationReason: string;
  invalidatedBeatIds: string[];
  narrativeSummary: string;
  pacingIssueDetected: boolean;
  pacingIssueReason: string;
  recommendedAction: PacingRecommendedAction;
  sceneMomentum: SceneMomentum;
  objectiveEvidenceStrength: ObjectiveEvidenceStrength;
  commitmentStrength: CommitmentStrength;
  structuralPositionSignal: StructuralPositionSignal;
  entryConditionReadiness: EntryConditionReadiness;
  objectiveAnchors: string[];
  anchorEvidence: string[];
  completionGateSatisfied: boolean;
  completionGateFailureReason: string;
  toneAdherent: boolean;
  toneDriftDescription: string;
  narrativePromises: NarrativePromise[];
  threadPayoffAssessments: ThreadPayoffAssessment[];
  rawResponse: string;
}

export interface AnalystContext {
  narrative: string;
  structure: StoryStructure;
  accumulatedStructureState: AccumulatedStructureState;
  activeState: ActiveState;
  threadsResolved: readonly string[];
  threadAges: Readonly<Record<string, number>>;
  tone: string;
  toneKeywords?: readonly string[];
  toneAntiKeywords?: readonly string[];
}

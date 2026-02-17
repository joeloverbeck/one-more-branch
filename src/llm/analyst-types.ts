import type {
  ActiveState,
  PromisePayoffAssessment,
  PromiseScope,
  PromiseType,
  TrackedPromise,
  ThreadPayoffAssessment,
  Urgency,
} from '../models/state/index.js';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda.js';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship.js';
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

export interface DetectedPromise {
  readonly description: string;
  readonly promiseType: PromiseType;
  readonly scope: PromiseScope;
  readonly resolutionHint: string;
  readonly suggestedUrgency: Urgency;
}

export interface DetectedRelationshipShift {
  readonly npcName: string;
  readonly shiftDescription: string;
  readonly suggestedValenceChange: number;
  readonly suggestedNewDynamic: string;
}

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
  pacingDirective: string;
  objectiveAnchors: string[];
  anchorEvidence: string[];
  completionGateSatisfied: boolean;
  completionGateFailureReason: string;
  toneAdherent: boolean;
  toneDriftDescription: string;
  promisesDetected: DetectedPromise[];
  promisesResolved: string[];
  promisePayoffAssessments: PromisePayoffAssessment[];
  threadPayoffAssessments: ThreadPayoffAssessment[];
  npcCoherenceAdherent: boolean;
  npcCoherenceIssues: string;
  relationshipShiftsDetected: DetectedRelationshipShift[];
  spineDeviationDetected: boolean;
  spineDeviationReason: string;
  spineInvalidatedElement: 'dramatic_question' | 'antagonistic_force' | 'need_want' | null;
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
  toneFeel?: readonly string[];
  toneAvoid?: readonly string[];
  spine?: StorySpine;
  activeTrackedPromises: readonly TrackedPromise[];
  accumulatedNpcAgendas?: AccumulatedNpcAgendas;
  accumulatedNpcRelationships?: AccumulatedNpcRelationships;
}

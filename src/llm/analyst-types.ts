import type { ActiveState, TrackedPromise } from '../models/state/index.js';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda.js';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship.js';
import type { DelayedConsequence } from '../models/state/delayed-consequence.js';
import type { GenreFrame } from '../models/concept-generator.js';
import type { AccumulatedStructureState, StoryStructure } from '../models/story-arc.js';
import type { StorySpine } from '../models/story-spine.js';
import type { StructureEvaluatorResult } from './structure-evaluator-types.js';
import type { PromiseTrackerResult } from './promise-tracker-types.js';
import type { ProseQualityResult } from './prose-quality-types.js';
import type { NpcIntelligenceResult } from './npc-intelligence-types.js';

// Re-export sub-result types and their enums for backward compatibility
export type {
  PacingRecommendedAction,
  SceneMomentum,
  ObjectiveEvidenceStrength,
  CommitmentStrength,
  StructuralPositionSignal,
  EntryConditionReadiness,
  MilestoneAlignmentConfidence,
  StructureEvaluatorResult,
} from './structure-evaluator-types.js';

export type {
  DetectedPromise,
  PromiseTrackerResult,
} from './promise-tracker-types.js';

export type {
  ThematicCharge,
  NarrativeFocus,
  ProseQualityResult,
} from './prose-quality-types.js';

export type {
  DetectedRelationshipShift,
  NpcIntelligenceResult,
} from './npc-intelligence-types.js';

/**
 * Combined analyst result composed from the 4 focused evaluator stages.
 * Backward-compatible: consumers still reference AnalystResult fields directly.
 */
export type AnalystResult = StructureEvaluatorResult &
  PromiseTrackerResult &
  ProseQualityResult &
  NpcIntelligenceResult & {
    rawResponse: string;
  };

/**
 * @deprecated Use StructureEvaluatorContext, PromiseTrackerContext, ProseQualityContext, or NpcIntelligenceContext instead.
 * Kept for backward compatibility during migration.
 */
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
  thematicQuestion: string;
  antithesis: string;
  premisePromises: readonly string[];
  fulfilledPremisePromises: readonly string[];
  delayedConsequencesEligible?: readonly DelayedConsequence[];
  spine?: StorySpine;
  activeTrackedPromises: readonly TrackedPromise[];
  accumulatedNpcAgendas?: AccumulatedNpcAgendas;
  accumulatedNpcRelationships?: AccumulatedNpcRelationships;
  genreFrame?: GenreFrame;
}

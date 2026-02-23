import type { PageId } from '../models/id.js';
import type { DeviationResult } from '../models/story-arc.js';
import type { StateReconciliationResult } from '../engine/state-reconciler-types.js';
import type {
  ObjectiveEvidenceStrength,
  PacingRecommendedAction,
  SceneMomentum,
} from './analyst-types.js';
import type { PageWriterResult } from './writer-types.js';

export interface AncestorSummary {
  readonly pageId: PageId;
  readonly summary: string;
}

export interface MomentumDataPoint {
  readonly pageId: PageId;
  readonly sceneMomentum: SceneMomentum;
  readonly objectiveEvidenceStrength: ObjectiveEvidenceStrength;
}

export type MomentumTrajectory = readonly MomentumDataPoint[];

export interface ContinuationGenerationResult
  extends PageWriterResult,
    StateReconciliationResult {
  readonly beatConcluded: boolean;
  readonly beatResolution: string;
  readonly deviation: DeviationResult;
  readonly pacingIssueDetected: boolean;
  readonly pacingIssueReason: string;
  readonly recommendedAction: PacingRecommendedAction;
}

export interface PromptOptions {
  choiceGuidance?: 'basic' | 'strict';
}

export interface GenerationObservabilityContext {
  storyId?: string;
  pageId?: number;
  requestId?: string;
}

export interface ReconciliationFailureReason {
  code: string;
  message: string;
  field?: string;
}

export interface GenerationPipelineMetrics {
  plannerDurationMs: number;
  accountantDurationMs: number;
  writerDurationMs: number;
  reconcilerDurationMs: number;
  plannerValidationIssueCount: number;
  accountantValidationIssueCount: number;
  writerValidationIssueCount: number;
  reconcilerIssueCount: number;
  reconcilerRetried: boolean;
  finalStatus: 'success' | 'hard_error';
}

export interface WriterValidationContext {
  removableIds: {
    threats: readonly string[];
    constraints: readonly string[];
    threads: readonly string[];
    inventory: readonly string[];
    health: readonly string[];
    characterState: readonly string[];
  };
}

// Structured degradation record for stages that fail gracefully
export interface StageDegradation {
  readonly stage: string;
  readonly errorCode: string;
  readonly message: string;
  readonly durationMs: number;
}

// Metrics for post-generation processing (Phase 3)
export interface PostGenerationMetrics {
  readonly analystDurationMs: number | null;
  readonly spineRewriteDurationMs: number | null;
  readonly structureRewriteDurationMs: number | null;
  readonly agendaResolverDurationMs: number | null;
  readonly pageBuildDurationMs: number;
  readonly degradedStages: readonly StageDegradation[];
}

// Complete pipeline metrics (Phase 1 + Phase 2 + Phase 3)
export interface FullPipelineMetrics {
  readonly contextAssemblyDurationMs: number;
  readonly coreGeneration: GenerationPipelineMetrics;
  readonly postGeneration: PostGenerationMetrics;
  readonly totalDurationMs: number;
}

export interface GenerationOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  promptOptions?: PromptOptions;
  observability?: GenerationObservabilityContext;
  writerValidationContext?: WriterValidationContext;
}

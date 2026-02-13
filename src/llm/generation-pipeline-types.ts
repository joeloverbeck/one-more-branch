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
  fewShotMode?: 'none' | 'minimal' | 'standard';
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
  lorekeeperDurationMs: number;
  writerDurationMs: number;
  reconcilerDurationMs: number;
  plannerValidationIssueCount: number;
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

export interface GenerationOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  promptOptions?: PromptOptions;
  observability?: GenerationObservabilityContext;
  writerValidationContext?: WriterValidationContext;
}

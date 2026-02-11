import type { ChoiceType, PrimaryDelta } from '../models/choice-enums.js';
import type { PageId } from '../models/id.js';
import type { Npc } from '../models/npc.js';
import type { ProtagonistAffect } from '../models/protagonist-affect.js';
import type { ActiveState, KeyedEntry, ThreadType, Urgency } from '../models/state/index.js';
import type { AccumulatedStructureState, DeviationResult, StoryStructure } from '../models/story-arc.js';
import type { StateReconciliationResult } from '../engine/state-reconciler-types.js';

export interface AncestorSummary {
  readonly pageId: PageId;
  readonly summary: string;
}

export interface ContinuationGenerationResult extends WriterResult {
  readonly beatConcluded: boolean;
  readonly beatResolution: string;
  readonly deviation: DeviationResult;
  readonly pacingIssueDetected: boolean;
  readonly pacingIssueReason: string;
  readonly recommendedAction: PacingRecommendedAction;
}

export interface CompletedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly beatId: string;
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly role: string;
  readonly resolution: string;
}

export interface StructureRewriteContext {
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: string;
  readonly completedBeats: readonly CompletedBeat[];
  readonly narrativeSummary: string;
  readonly currentActIndex: number;
  readonly currentBeatIndex: number;
  readonly deviationReason: string;
  readonly originalTheme: string;
}

export interface StructureRewriteResult {
  readonly structure: StoryStructure;
  readonly preservedBeatIds: readonly string[];
  readonly rawResponse: string;
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

export interface ContinuationContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  npcs?: readonly Npc[];
  globalCanon: readonly string[];
  globalCharacterCanon: Readonly<Record<string, readonly string[]>>;
  storyArc?: string | null;
  structure?: StoryStructure;
  accumulatedStructureState?: AccumulatedStructureState;
  previousNarrative: string;
  selectedChoice: string;

  accumulatedInventory: readonly KeyedEntry[];
  accumulatedHealth: readonly KeyedEntry[];
  accumulatedCharacterState: Readonly<Record<string, readonly KeyedEntry[]>>;
  parentProtagonistAffect?: ProtagonistAffect;

  activeState: ActiveState;

  grandparentNarrative: string | null;
  ancestorSummaries: readonly AncestorSummary[];
  pagePlan?: PagePlan;
  reconciliationFailureReasons?: readonly ReconciliationFailureReason[];
}

export interface OpeningContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  npcs?: readonly Npc[];
  startingSituation?: string;
  structure?: StoryStructure;
  pagePlan?: PagePlan;
  reconciliationFailureReasons?: readonly ReconciliationFailureReason[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface JsonSchema {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: object;
  };
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content:
        | string
        | Array<{ type?: string; text?: string; content?: string }>
        | Record<string, unknown>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: { message: string; code: string };
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
  // Compatibility fields retained during writer contract migration.
  // These state/canon fields remain on WriterResult until downstream migration completes.
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

export interface ThreadAdd {
  text: string;
  threadType: ThreadType;
  urgency: Urgency;
}

export interface TextIntentReplace {
  removeId: string;
  addText: string;
}

export interface TextIntentMutations {
  add: string[];
  removeIds: string[];
  replace: TextIntentReplace[];
}

export interface ThreadIntentReplace {
  resolveId: string;
  add: ThreadAdd;
}

export interface ThreadIntentMutations {
  add: ThreadAdd[];
  resolveIds: string[];
  replace: ThreadIntentReplace[];
}

export interface CharacterStateIntentAdd {
  characterName: string;
  states: string[];
}

export interface CharacterStateIntentReplace {
  removeId: string;
  add: CharacterStateIntentAdd;
}

export interface CharacterStateIntentMutations {
  add: CharacterStateIntentAdd[];
  removeIds: string[];
  replace: CharacterStateIntentReplace[];
}

export interface CanonIntents {
  worldAdd: string[];
  characterAdd: Array<{ characterName: string; facts: string[] }>;
}

export interface PagePlan {
  sceneIntent: string;
  continuityAnchors: string[];
  stateIntents: {
    currentLocation: string;
    threats: TextIntentMutations;
    constraints: TextIntentMutations;
    threads: ThreadIntentMutations;
    inventory: TextIntentMutations;
    health: TextIntentMutations;
    characterState: CharacterStateIntentMutations;
    canon: CanonIntents;
  };
  writerBrief: {
    openingLineDirective: string;
    mustIncludeBeats: string[];
    forbiddenRecaps: string[];
  };
}

export interface OpeningPagePlanContext extends OpeningContext {
  mode: 'opening';
  globalCanon: readonly string[];
  globalCharacterCanon: Readonly<Record<string, readonly string[]>>;
  accumulatedInventory: readonly KeyedEntry[];
  accumulatedHealth: readonly KeyedEntry[];
  accumulatedCharacterState: Readonly<Record<string, readonly KeyedEntry[]>>;
  activeState: ActiveState;
}

export interface ContinuationPagePlanContext extends ContinuationContext {
  mode: 'continuation';
}

export type PagePlanContext = OpeningPagePlanContext | ContinuationPagePlanContext;

export interface PagePlanGenerationResult extends PagePlan {
  rawResponse: string;
}

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
  rawResponse: string;
}

export interface AnalystContext {
  narrative: string;
  structure: StoryStructure;
  accumulatedStructureState: AccumulatedStructureState;
  activeState: ActiveState;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

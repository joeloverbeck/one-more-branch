import type { ProtagonistAffect } from '../models/protagonist-affect.js';
import type { ActiveState } from '../models/state/index.js';
import type { AccumulatedStructureState, DeviationResult, StoryStructure } from '../models/story-arc.js';

export interface GenerationResult {
  narrative: string;
  choices: string[];

  // Active state fields (replaces stateChangesAdded/stateChangesRemoved)
  currentLocation: string;
  threatsAdded: string[];
  threatsRemoved: string[];
  constraintsAdded: string[];
  constraintsRemoved: string[];
  threadsAdded: string[];
  threadsResolved: string[];

  // Canon tracking (unchanged)
  newCanonFacts: string[];
  newCharacterCanonFacts: Record<string, string[]>;

  // Branch-isolated state tracking (unchanged)
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
  characterStateChangesRemoved: Array<{ characterName: string; states: string[] }>;

  // Emotional state and story structure (unchanged)
  protagonistAffect: ProtagonistAffect;
  isEnding: boolean;
  beatConcluded: boolean;
  beatResolution: string;
  rawResponse: string;
}

export interface ContinuationGenerationResult extends GenerationResult {
  readonly deviation: DeviationResult;
}

export interface CompletedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly beatId: string;
  readonly description: string;
  readonly objective: string;
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
  /** 'none' | 'minimal' (1 example) | 'standard' (2-3 examples) */
  fewShotMode?: 'none' | 'minimal' | 'standard';
  /** Enable <thinking>...</thinking> reasoning phase */
  enableChainOfThought?: boolean;
  /** 'basic' (current) | 'strict' (explicit constraints) */
  choiceGuidance?: 'basic' | 'strict';
}

export interface GenerationOptions {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  promptOptions?: PromptOptions;
}

export interface ContinuationContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: readonly string[];
  globalCharacterCanon: Readonly<Record<string, readonly string[]>>;
  storyArc?: string | null;
  structure?: StoryStructure;
  accumulatedStructureState?: AccumulatedStructureState;
  previousNarrative: string;
  selectedChoice: string;

  // Deprecated: Old event-log state (kept for transition period)
  accumulatedState: readonly string[];

  accumulatedInventory: readonly string[];
  accumulatedHealth: readonly string[];
  accumulatedCharacterState: Readonly<Record<string, readonly string[]>>;
  parentProtagonistAffect?: ProtagonistAffect;

  // NEW: Active state fields
  activeState: ActiveState;

  // NEW: Extended scene context
  grandparentNarrative: string | null;
}

export interface OpeningContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  structure?: StoryStructure;
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
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: { message: string; code: string };
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

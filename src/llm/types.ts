import type { AccumulatedStructureState, StoryStructure } from '../models/story-arc.js';

export interface GenerationResult {
  narrative: string;
  choices: string[];
  stateChangesAdded: string[];
  stateChangesRemoved: string[];
  newCanonFacts: string[];
  newCharacterCanonFacts: Record<string, string[]>;
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
  characterStateChangesRemoved: Array<{ characterName: string; states: string[] }>;
  isEnding: boolean;
  storyArc?: string;
  rawResponse: string;
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
  storyArc: string | null;
  structure?: StoryStructure;
  accumulatedStructureState?: AccumulatedStructureState;
  previousNarrative: string;
  selectedChoice: string;
  accumulatedState: readonly string[];
  accumulatedInventory: readonly string[];
  accumulatedHealth: readonly string[];
  accumulatedCharacterState: Readonly<Record<string, readonly string[]>>;
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

import { Npc, Page, PageId, Story, StoryId } from '../models';
import type { ConceptSpec, ConceptVerification } from '../models/concept-generator.js';
import type { StorySpine } from '../models/story-spine.js';
import type { StoryKernel } from '../models/story-kernel.js';
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';
export { GENERATION_STAGES } from './generated-generation-stages.js';
import { GENERATION_STAGES } from './generated-generation-stages.js';

export type GenerationStage = (typeof GENERATION_STAGES)[number];
export type GenerationStageStatus = 'started' | 'completed';

export interface GenerationStageEvent {
  readonly stage: GenerationStage;
  readonly status: GenerationStageStatus;
  readonly attempt: number;
}

export type GenerationStageCallback = (event: GenerationStageEvent) => void;

export interface StartStoryResult {
  readonly story: Story;
  readonly page: Page;
}

export interface PrepareStoryResult {
  readonly story: Story;
}

export interface DeviationInfo {
  readonly detected: boolean;
  readonly reason: string;
  readonly beatsInvalidated: number;
  readonly spineRewritten?: boolean;
  readonly spineInvalidatedElement?: string;
}

export interface MakeChoiceResult {
  readonly page: Page;
  readonly wasGenerated: boolean;
  readonly deviationInfo?: DeviationInfo;
}

export interface PlaySession {
  readonly storyId: StoryId;
  readonly currentPageId: PageId;
  readonly apiKey: string;
}

export interface StartStoryOptions {
  readonly title: string;
  readonly characterConcept: string;
  readonly worldbuilding?: string;
  readonly tone?: string;
  readonly npcs?: readonly Npc[];
  readonly startingSituation?: string;
  readonly conceptSpec?: ConceptSpec;
  readonly storyKernel?: StoryKernel;
  readonly conceptVerification?: ConceptVerification;
  readonly spine: StorySpine;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface MakeChoiceOptions {
  readonly storyId: StoryId;
  readonly pageId: PageId;
  readonly choiceIndex: number;
  readonly apiKey?: string;
  readonly protagonistGuidance?: ProtagonistGuidance;
  readonly onGenerationStage?: GenerationStageCallback;
}

export type EngineErrorCode =
  | 'STORY_NOT_FOUND'
  | 'STORY_NOT_PREPARED'
  | 'PAGE_NOT_FOUND'
  | 'INVALID_CHOICE'
  | 'GENERATION_FAILED'
  | 'GENERATION_RECONCILIATION_FAILED'
  | 'VALIDATION_FAILED'
  | 'CONCURRENT_GENERATION'
  | 'INVALID_STRUCTURE_VERSION';

export class EngineError extends Error {
  constructor(
    message: string,
    public readonly code: EngineErrorCode
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

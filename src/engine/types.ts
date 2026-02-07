import { Page, PageId, Story, StoryId } from '../models';

export interface StartStoryResult {
  readonly story: Story;
  readonly page: Page;
}

export interface MakeChoiceResult {
  readonly page: Page;
  readonly wasGenerated: boolean;
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
  readonly apiKey: string;
}

export interface MakeChoiceOptions {
  readonly storyId: StoryId;
  readonly pageId: PageId;
  readonly choiceIndex: number;
  readonly apiKey: string;
}

export type EngineErrorCode =
  | 'STORY_NOT_FOUND'
  | 'PAGE_NOT_FOUND'
  | 'INVALID_CHOICE'
  | 'GENERATION_FAILED'
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

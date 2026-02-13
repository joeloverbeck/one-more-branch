import { v4 as uuidv4 } from 'uuid';

export type StoryId = string & { readonly __brand: 'StoryId' };
export type PageId = number & { readonly __brand: 'PageId' };
export type ChoiceIndex = number & { readonly __brand: 'ChoiceIndex' };

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateStoryId(): StoryId {
  return uuidv4() as StoryId;
}

export function generatePageId(existingPageCount: number): PageId {
  return (existingPageCount + 1) as PageId;
}

export function isStoryId(value: unknown): value is StoryId {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value);
}

export function isPageId(value: unknown): value is PageId {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

export function parseStoryId(value: string): StoryId {
  if (!isStoryId(value)) {
    throw new Error(`Invalid Story ID format: ${value}`);
  }

  return value;
}

export function parsePageId(value: number): PageId {
  if (!isPageId(value)) {
    throw new Error(`Invalid Page ID: ${value}. Must be a positive integer.`);
  }

  return value;
}

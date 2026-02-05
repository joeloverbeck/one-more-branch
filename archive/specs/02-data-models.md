# Spec 02: Data Models & Types

## Overview

Define the core TypeScript interfaces and types for the "One More Branch" application. These models represent Stories, Pages, Choices, and related state management structures.

## Goals

1. Define strongly-typed interfaces for all data structures
2. Create validation utilities for data integrity
3. Implement ID generation utilities (UUIDs)
4. Establish type guards for runtime type checking
5. Create factory functions for constructing valid objects

## Dependencies

- **Spec 01**: Project Foundation (TypeScript configured)

## Implementation Details

### Core Types

The data model centers around three main entities:

1. **Story**: The container for an entire adventure
2. **Page**: A single narrative segment with choices
3. **Choice**: A player option leading to another page

### Type Definitions

```
src/models/
├── index.ts           # Re-exports all types
├── story.ts           # Story interface and utilities
├── page.ts            # Page interface and utilities
├── choice.ts          # Choice interface and utilities
├── state.ts           # State change and canon types
├── validation.ts      # Validation utilities
└── id.ts              # ID generation utilities
```

## Files to Create

### `src/models/id.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';

/**
 * Unique identifier for a Story
 * Format: UUID v4
 */
export type StoryId = string & { readonly __brand: 'StoryId' };

/**
 * Unique identifier for a Page within a Story
 * Format: Incremental number (1, 2, 3, ...)
 */
export type PageId = number & { readonly __brand: 'PageId' };

/**
 * Unique identifier for a Choice within a Page
 * Format: Incremental number (0, 1, 2, ...)
 */
export type ChoiceIndex = number & { readonly __brand: 'ChoiceIndex' };

/**
 * Generate a new unique Story ID
 */
export function generateStoryId(): StoryId {
  return uuidv4() as StoryId;
}

/**
 * Generate the next Page ID for a story
 * @param existingPageCount - Number of pages already in the story
 */
export function generatePageId(existingPageCount: number): PageId {
  return (existingPageCount + 1) as PageId;
}

/**
 * Type guard for StoryId
 */
export function isStoryId(value: unknown): value is StoryId {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

/**
 * Type guard for PageId
 */
export function isPageId(value: unknown): value is PageId {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/**
 * Parse a string to StoryId (throws if invalid)
 */
export function parseStoryId(value: string): StoryId {
  if (!isStoryId(value)) {
    throw new Error(`Invalid Story ID format: ${value}`);
  }
  return value;
}

/**
 * Parse a number to PageId (throws if invalid)
 */
export function parsePageId(value: number): PageId {
  if (!isPageId(value)) {
    throw new Error(`Invalid Page ID: ${value}. Must be a positive integer.`);
  }
  return value;
}
```

### `src/models/choice.ts`

```typescript
import { PageId } from './id.js';

/**
 * A choice presented to the player at the end of a page
 */
export interface Choice {
  /**
   * The text displayed to the player for this option
   * Must be meaningful and distinct from other choices on the same page
   */
  readonly text: string;

  /**
   * Reference to the page this choice leads to
   * - null: Page not yet generated (unexplored branch)
   * - PageId: Link to existing page
   */
  nextPageId: PageId | null;
}

/**
 * Create a new Choice object
 */
export function createChoice(text: string, nextPageId: PageId | null = null): Choice {
  if (!text || text.trim().length === 0) {
    throw new Error('Choice text cannot be empty');
  }

  return {
    text: text.trim(),
    nextPageId,
  };
}

/**
 * Type guard for Choice
 */
export function isChoice(value: unknown): value is Choice {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['text'] === 'string' &&
    obj['text'].length > 0 &&
    (obj['nextPageId'] === null ||
      (typeof obj['nextPageId'] === 'number' && obj['nextPageId'] >= 1))
  );
}

/**
 * Check if a choice has been explored (has a next page)
 */
export function isChoiceExplored(choice: Choice): boolean {
  return choice.nextPageId !== null;
}
```

### `src/models/state.ts`

```typescript
/**
 * A single state change that occurred in the narrative
 * These are human-readable strings describing events/changes
 *
 * Examples:
 * - "Vespera has been injured in the leg."
 * - "Lord Omundus was killed when he confronted Vespera."
 * - "Vespera acquired an artifact: Dragonfire Amulet."
 * - "The village of Thornwick has been destroyed by fire."
 */
export type StateChange = string;

/**
 * Collection of state changes
 * Array of strings describing what happened
 */
export type StateChanges = readonly StateChange[];

/**
 * A single fact about the world that is globally true
 * These persist across all branches
 *
 * Examples:
 * - "The kingdom of Eldoria is at war with Drakenfell."
 * - "There is a castle called Blackstone on the northern border."
 * - "The ancient dragon Tharos sleeps beneath Mount Kira."
 */
export type CanonFact = string;

/**
 * Collection of global canon facts
 */
export type GlobalCanon = readonly CanonFact[];

/**
 * The accumulated state at a point in the story
 * Computed by traversing from page 1 to current page
 */
export interface AccumulatedState {
  /**
   * All state changes that have occurred up to and including this page
   */
  readonly changes: StateChanges;
}

/**
 * Create an empty accumulated state
 */
export function createEmptyAccumulatedState(): AccumulatedState {
  return {
    changes: [],
  };
}

/**
 * Combine parent state with new changes
 */
export function accumulateState(
  parentState: AccumulatedState,
  newChanges: StateChanges
): AccumulatedState {
  return {
    changes: [...parentState.changes, ...newChanges],
  };
}

/**
 * Add a canon fact to the global canon (immutable)
 */
export function addCanonFact(canon: GlobalCanon, fact: CanonFact): GlobalCanon {
  // Avoid duplicates (case-insensitive check)
  const normalizedFact = fact.toLowerCase().trim();
  const exists = canon.some(f => f.toLowerCase().trim() === normalizedFact);

  if (exists) {
    return canon;
  }

  return [...canon, fact.trim()];
}

/**
 * Merge multiple canon facts into existing canon
 */
export function mergeCanonFacts(canon: GlobalCanon, facts: CanonFact[]): GlobalCanon {
  return facts.reduce((acc, fact) => addCanonFact(acc, fact), canon);
}
```

### `src/models/page.ts`

```typescript
import { PageId } from './id.js';
import { Choice, isChoice } from './choice.js';
import { StateChanges, AccumulatedState, createEmptyAccumulatedState } from './state.js';

/**
 * A single page/segment of the story
 */
export interface Page {
  /**
   * Unique identifier within the story (1, 2, 3, ...)
   */
  readonly id: PageId;

  /**
   * The narrative text for this segment
   * Includes description, dialogue, and action
   */
  readonly narrativeText: string;

  /**
   * Available choices at the end of this page
   * Empty array if this is an ending page
   * Must have 2-4 choices for non-ending pages
   */
  readonly choices: Choice[];

  /**
   * State changes that occurred IN THIS PAGE ONLY
   * These are the direct results of the previous choice
   */
  readonly stateChanges: StateChanges;

  /**
   * The accumulated state at this point in the branch
   * Includes all state changes from page 1 to here
   */
  readonly accumulatedState: AccumulatedState;

  /**
   * True if this page is an ending (game over or story conclusion)
   * Ending pages have no choices
   */
  readonly isEnding: boolean;

  /**
   * ID of the parent page (the page whose choice led here)
   * null only for page 1 (the starting page)
   */
  readonly parentPageId: PageId | null;

  /**
   * Index of the choice on the parent page that led here
   * null only for page 1
   */
  readonly parentChoiceIndex: number | null;
}

/**
 * Data required to create a new page (excluding computed fields)
 */
export interface CreatePageData {
  id: PageId;
  narrativeText: string;
  choices: Choice[];
  stateChanges: StateChanges;
  isEnding: boolean;
  parentPageId: PageId | null;
  parentChoiceIndex: number | null;
  parentAccumulatedState?: AccumulatedState;
}

/**
 * Create a new Page object
 */
export function createPage(data: CreatePageData): Page {
  // Validate: endings have no choices, non-endings have 2-4 choices
  if (data.isEnding && data.choices.length > 0) {
    throw new Error('Ending pages must have no choices');
  }

  if (!data.isEnding && data.choices.length < 2) {
    throw new Error('Non-ending pages must have at least 2 choices');
  }

  // Page 1 has no parent
  if (data.id === 1) {
    if (data.parentPageId !== null || data.parentChoiceIndex !== null) {
      throw new Error('Page 1 cannot have a parent');
    }
  } else {
    if (data.parentPageId === null || data.parentChoiceIndex === null) {
      throw new Error('Pages after page 1 must have a parent');
    }
  }

  // Compute accumulated state
  const parentState = data.parentAccumulatedState ?? createEmptyAccumulatedState();
  const accumulatedState: AccumulatedState = {
    changes: [...parentState.changes, ...data.stateChanges],
  };

  return {
    id: data.id,
    narrativeText: data.narrativeText.trim(),
    choices: data.choices,
    stateChanges: data.stateChanges,
    accumulatedState,
    isEnding: data.isEnding,
    parentPageId: data.parentPageId,
    parentChoiceIndex: data.parentChoiceIndex,
  };
}

/**
 * Type guard for Page
 */
export function isPage(value: unknown): value is Page {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'number' &&
    obj['id'] >= 1 &&
    typeof obj['narrativeText'] === 'string' &&
    Array.isArray(obj['choices']) &&
    obj['choices'].every(isChoice) &&
    Array.isArray(obj['stateChanges']) &&
    typeof obj['isEnding'] === 'boolean'
  );
}

/**
 * Check if all choices on a page have been explored
 */
export function isPageFullyExplored(page: Page): boolean {
  return page.choices.every(choice => choice.nextPageId !== null);
}

/**
 * Get unexplored choice indices
 */
export function getUnexploredChoiceIndices(page: Page): number[] {
  return page.choices
    .map((choice, index) => (choice.nextPageId === null ? index : -1))
    .filter(index => index !== -1);
}
```

### `src/models/story.ts`

```typescript
import { StoryId, PageId, generateStoryId } from './id.js';
import { Page } from './page.js';
import { GlobalCanon } from './state.js';

/**
 * The tone/genre of the story
 * Guides the LLM's storytelling style
 */
export type StoryTone = string;

/**
 * The complete story container
 */
export interface Story {
  /**
   * Unique identifier for this story
   */
  readonly id: StoryId;

  /**
   * User-provided description of the protagonist
   * Includes personality, background, abilities, etc.
   */
  readonly characterConcept: string;

  /**
   * User-provided worldbuilding context
   * Locations, social structures, species, etc.
   */
  readonly worldbuilding: string;

  /**
   * User-specified tone/genre for the story
   * Examples: "dark fantasy", "humorous", "horror"
   */
  readonly tone: StoryTone;

  /**
   * Collection of world facts that are true across all branches
   * Updated as the LLM introduces persistent details
   */
  globalCanon: GlobalCanon;

  /**
   * The overarching plot/goal determined by the LLM
   * Helps maintain narrative direction
   */
  storyArc: string | null;

  /**
   * Timestamp when the story was created
   */
  readonly createdAt: Date;

  /**
   * Timestamp of last modification
   */
  updatedAt: Date;
}

/**
 * Data required to create a new story
 */
export interface CreateStoryData {
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
}

/**
 * Create a new Story object
 */
export function createStory(data: CreateStoryData): Story {
  if (!data.characterConcept || data.characterConcept.trim().length === 0) {
    throw new Error('Character concept is required');
  }

  const now = new Date();

  return {
    id: generateStoryId(),
    characterConcept: data.characterConcept.trim(),
    worldbuilding: data.worldbuilding?.trim() ?? '',
    tone: data.tone?.trim() ?? 'fantasy adventure',
    globalCanon: [],
    storyArc: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Story metadata (subset of Story for listing/display)
 */
export interface StoryMetadata {
  readonly id: StoryId;
  readonly characterConcept: string;
  readonly tone: StoryTone;
  readonly createdAt: Date;
  readonly pageCount: number;
  readonly hasEnding: boolean;
}

/**
 * Type guard for Story
 */
export function isStory(value: unknown): value is Story {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'string' &&
    typeof obj['characterConcept'] === 'string' &&
    obj['characterConcept'].length > 0 &&
    typeof obj['worldbuilding'] === 'string' &&
    typeof obj['tone'] === 'string' &&
    Array.isArray(obj['globalCanon'])
  );
}

/**
 * Update story's global canon (returns new story object)
 */
export function updateStoryCanon(story: Story, newCanon: GlobalCanon): Story {
  return {
    ...story,
    globalCanon: newCanon,
    updatedAt: new Date(),
  };
}

/**
 * Update story's arc (returns new story object)
 */
export function updateStoryArc(story: Story, arc: string): Story {
  return {
    ...story,
    storyArc: arc.trim(),
    updatedAt: new Date(),
  };
}
```

### `src/models/validation.ts`

```typescript
import { Story, isStory } from './story.js';
import { Page, isPage } from './page.js';
import { Choice, isChoice } from './choice.js';
import { PageId } from './id.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a Story object
 */
export function validateStory(story: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isStory(story)) {
    return {
      valid: false,
      errors: ['Object is not a valid Story structure'],
    };
  }

  if (story.characterConcept.length < 10) {
    errors.push('Character concept is too short (minimum 10 characters)');
  }

  if (story.characterConcept.length > 5000) {
    errors.push('Character concept is too long (maximum 5000 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a Page object
 */
export function validatePage(page: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isPage(page)) {
    return {
      valid: false,
      errors: ['Object is not a valid Page structure'],
    };
  }

  if (page.narrativeText.length < 50) {
    errors.push('Narrative text is too short (minimum 50 characters)');
  }

  if (page.narrativeText.length > 10000) {
    errors.push('Narrative text is too long (maximum 10000 characters)');
  }

  if (!page.isEnding && page.choices.length < 2) {
    errors.push('Non-ending pages must have at least 2 choices');
  }

  if (!page.isEnding && page.choices.length > 5) {
    errors.push('Too many choices (maximum 5)');
  }

  if (page.isEnding && page.choices.length > 0) {
    errors.push('Ending pages must have no choices');
  }

  // Check for duplicate choice texts
  const choiceTexts = page.choices.map(c => c.text.toLowerCase());
  const uniqueTexts = new Set(choiceTexts);
  if (uniqueTexts.size !== choiceTexts.length) {
    errors.push('Duplicate choice texts detected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that a page's choices don't create cycles
 * (choice doesn't point back to an ancestor page)
 */
export function validateNoCycle(
  page: Page,
  getPage: (id: PageId) => Page | undefined
): ValidationResult {
  const errors: string[] = [];
  const ancestorIds = new Set<PageId>();

  // Build set of all ancestor page IDs
  let current: Page | undefined = page;
  while (current && current.parentPageId !== null) {
    ancestorIds.add(current.id);
    current = getPage(current.parentPageId);
  }
  if (current) {
    ancestorIds.add(current.id); // Add page 1
  }

  // Check if any choice points to an ancestor
  for (let i = 0; i < page.choices.length; i++) {
    const choice = page.choices[i];
    if (choice?.nextPageId !== null && ancestorIds.has(choice.nextPageId)) {
      errors.push(`Choice ${i} creates a cycle by pointing to ancestor page ${choice.nextPageId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate entire story structure for consistency
 */
export function validateStoryIntegrity(
  story: Story,
  pages: Map<PageId, Page>
): ValidationResult {
  const errors: string[] = [];

  // Must have at least page 1
  const page1 = pages.get(1 as PageId);
  if (!page1) {
    errors.push('Story must have page 1');
    return { valid: false, errors };
  }

  // Page 1 cannot be an ending (unless story is very short)
  if (page1.isEnding && pages.size === 1) {
    // This is acceptable - a one-page story
  } else if (page1.isEnding && pages.size > 1) {
    errors.push('Page 1 cannot be an ending if there are more pages');
  }

  // Check all page references are valid
  for (const [pageId, page] of pages) {
    // Validate parent reference
    if (page.parentPageId !== null && !pages.has(page.parentPageId)) {
      errors.push(`Page ${pageId} references non-existent parent ${page.parentPageId}`);
    }

    // Validate choice references
    for (let i = 0; i < page.choices.length; i++) {
      const choice = page.choices[i];
      if (choice?.nextPageId !== null && !pages.has(choice.nextPageId)) {
        errors.push(`Page ${pageId} choice ${i} references non-existent page ${choice.nextPageId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### `src/models/index.ts`

```typescript
// ID types and utilities
export {
  StoryId,
  PageId,
  ChoiceIndex,
  generateStoryId,
  generatePageId,
  isStoryId,
  isPageId,
  parseStoryId,
  parsePageId,
} from './id.js';

// Choice type
export {
  Choice,
  createChoice,
  isChoice,
  isChoiceExplored,
} from './choice.js';

// State types
export {
  StateChange,
  StateChanges,
  CanonFact,
  GlobalCanon,
  AccumulatedState,
  createEmptyAccumulatedState,
  accumulateState,
  addCanonFact,
  mergeCanonFacts,
} from './state.js';

// Page type
export {
  Page,
  CreatePageData,
  createPage,
  isPage,
  isPageFullyExplored,
  getUnexploredChoiceIndices,
} from './page.js';

// Story type
export {
  Story,
  StoryTone,
  StoryMetadata,
  CreateStoryData,
  createStory,
  isStory,
  updateStoryCanon,
  updateStoryArc,
} from './story.js';

// Validation
export {
  ValidationResult,
  validateStory,
  validatePage,
  validateNoCycle,
  validateStoryIntegrity,
} from './validation.js';
```

## Invariants

1. **Unique Story IDs**: Every StoryId is a valid UUID v4, globally unique
2. **Unique Page IDs**: Every PageId within a story is a positive integer, unique within that story
3. **Choice Distinctness**: No two choices on the same page have identical text
4. **Ending Consistency**: `isEnding === true` ⟺ `choices.length === 0`
5. **Non-Ending Choices**: Non-ending pages have 2-5 choices
6. **Parent Integrity**: Page 1 has no parent; all other pages have valid parent references
7. **State Accumulation**: AccumulatedState equals parent's state + page's stateChanges
8. **Canon Immutability**: Canon facts are strings, never modified after addition (only appended)
9. **Type Safety**: All type guards correctly identify valid objects

## Test Cases

### Unit Tests

**File**: `test/unit/models/id.test.ts`

```typescript
import {
  generateStoryId,
  generatePageId,
  isStoryId,
  isPageId,
  parseStoryId,
  parsePageId,
} from '@/models/id';

describe('ID Generation', () => {
  describe('generateStoryId', () => {
    it('should generate valid UUID v4', () => {
      const id = generateStoryId();
      expect(isStoryId(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateStoryId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('generatePageId', () => {
    it('should return 1 for empty story', () => {
      expect(generatePageId(0)).toBe(1);
    });

    it('should return next sequential number', () => {
      expect(generatePageId(5)).toBe(6);
    });
  });

  describe('isStoryId', () => {
    it('should return true for valid UUID', () => {
      expect(isStoryId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isStoryId('not-a-uuid')).toBe(false);
      expect(isStoryId('')).toBe(false);
      expect(isStoryId(123)).toBe(false);
    });
  });

  describe('isPageId', () => {
    it('should return true for positive integers', () => {
      expect(isPageId(1)).toBe(true);
      expect(isPageId(100)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isPageId(0)).toBe(false);
      expect(isPageId(-1)).toBe(false);
      expect(isPageId(1.5)).toBe(false);
      expect(isPageId('1')).toBe(false);
    });
  });

  describe('parseStoryId', () => {
    it('should return valid StoryId', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      expect(parseStoryId(id)).toBe(id);
    });

    it('should throw for invalid input', () => {
      expect(() => parseStoryId('invalid')).toThrow();
    });
  });

  describe('parsePageId', () => {
    it('should return valid PageId', () => {
      expect(parsePageId(5)).toBe(5);
    });

    it('should throw for invalid input', () => {
      expect(() => parsePageId(0)).toThrow();
      expect(() => parsePageId(-1)).toThrow();
    });
  });
});
```

**File**: `test/unit/models/choice.test.ts`

```typescript
import { createChoice, isChoice, isChoiceExplored } from '@/models/choice';
import { PageId } from '@/models/id';

describe('Choice', () => {
  describe('createChoice', () => {
    it('should create choice with text and null nextPageId', () => {
      const choice = createChoice('Go north');
      expect(choice.text).toBe('Go north');
      expect(choice.nextPageId).toBeNull();
    });

    it('should create choice with specified nextPageId', () => {
      const choice = createChoice('Go north', 5 as PageId);
      expect(choice.nextPageId).toBe(5);
    });

    it('should trim whitespace from text', () => {
      const choice = createChoice('  Go north  ');
      expect(choice.text).toBe('Go north');
    });

    it('should throw for empty text', () => {
      expect(() => createChoice('')).toThrow();
      expect(() => createChoice('   ')).toThrow();
    });
  });

  describe('isChoice', () => {
    it('should return true for valid choice', () => {
      expect(isChoice({ text: 'Go', nextPageId: null })).toBe(true);
      expect(isChoice({ text: 'Go', nextPageId: 5 })).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isChoice(null)).toBe(false);
      expect(isChoice({ text: '' })).toBe(false);
      expect(isChoice({ nextPageId: 1 })).toBe(false);
    });
  });

  describe('isChoiceExplored', () => {
    it('should return false for null nextPageId', () => {
      expect(isChoiceExplored({ text: 'Go', nextPageId: null })).toBe(false);
    });

    it('should return true for set nextPageId', () => {
      expect(isChoiceExplored({ text: 'Go', nextPageId: 5 as PageId })).toBe(true);
    });
  });
});
```

**File**: `test/unit/models/state.test.ts`

```typescript
import {
  createEmptyAccumulatedState,
  accumulateState,
  addCanonFact,
  mergeCanonFacts,
} from '@/models/state';

describe('State Management', () => {
  describe('createEmptyAccumulatedState', () => {
    it('should create state with empty changes array', () => {
      const state = createEmptyAccumulatedState();
      expect(state.changes).toEqual([]);
    });
  });

  describe('accumulateState', () => {
    it('should combine parent state with new changes', () => {
      const parent = { changes: ['Event A'] };
      const newState = accumulateState(parent, ['Event B', 'Event C']);
      expect(newState.changes).toEqual(['Event A', 'Event B', 'Event C']);
    });

    it('should not mutate parent state', () => {
      const parent = { changes: ['Event A'] };
      accumulateState(parent, ['Event B']);
      expect(parent.changes).toEqual(['Event A']);
    });
  });

  describe('addCanonFact', () => {
    it('should add new fact to canon', () => {
      const canon = ['Fact A'];
      const newCanon = addCanonFact(canon, 'Fact B');
      expect(newCanon).toEqual(['Fact A', 'Fact B']);
    });

    it('should not add duplicate facts (case-insensitive)', () => {
      const canon = ['The kingdom exists'];
      const newCanon = addCanonFact(canon, 'THE KINGDOM EXISTS');
      expect(newCanon).toEqual(['The kingdom exists']);
    });

    it('should not mutate original canon', () => {
      const canon = ['Fact A'];
      addCanonFact(canon, 'Fact B');
      expect(canon).toEqual(['Fact A']);
    });
  });

  describe('mergeCanonFacts', () => {
    it('should merge multiple facts', () => {
      const canon = ['Fact A'];
      const newCanon = mergeCanonFacts(canon, ['Fact B', 'Fact C']);
      expect(newCanon).toEqual(['Fact A', 'Fact B', 'Fact C']);
    });

    it('should skip duplicates', () => {
      const canon = ['Fact A'];
      const newCanon = mergeCanonFacts(canon, ['Fact A', 'Fact B']);
      expect(newCanon).toEqual(['Fact A', 'Fact B']);
    });
  });
});
```

**File**: `test/unit/models/page.test.ts`

```typescript
import { createPage, isPage, isPageFullyExplored, getUnexploredChoiceIndices } from '@/models/page';
import { PageId } from '@/models/id';
import { createChoice } from '@/models/choice';

describe('Page', () => {
  describe('createPage', () => {
    it('should create valid page 1 (no parent)', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'The story begins...',
        choices: [createChoice('Go left'), createChoice('Go right')],
        stateChanges: [],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(page.id).toBe(1);
      expect(page.parentPageId).toBeNull();
      expect(page.accumulatedState.changes).toEqual([]);
    });

    it('should create page with parent and accumulate state', () => {
      const parentState = { changes: ['Event A'] };
      const page = createPage({
        id: 2 as PageId,
        narrativeText: 'The story continues...',
        choices: [createChoice('Go left'), createChoice('Go right')],
        stateChanges: ['Event B'],
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
        parentAccumulatedState: parentState,
      });

      expect(page.accumulatedState.changes).toEqual(['Event A', 'Event B']);
    });

    it('should create ending page with no choices', () => {
      const page = createPage({
        id: 5 as PageId,
        narrativeText: 'The story ends...',
        choices: [],
        stateChanges: ['Hero died'],
        isEnding: true,
        parentPageId: 4 as PageId,
        parentChoiceIndex: 1,
      });

      expect(page.isEnding).toBe(true);
      expect(page.choices).toEqual([]);
    });

    it('should throw if ending page has choices', () => {
      expect(() =>
        createPage({
          id: 5 as PageId,
          narrativeText: 'The story ends...',
          choices: [createChoice('Continue')],
          stateChanges: [],
          isEnding: true,
          parentPageId: 4 as PageId,
          parentChoiceIndex: 1,
        })
      ).toThrow('Ending pages must have no choices');
    });

    it('should throw if non-ending page has < 2 choices', () => {
      expect(() =>
        createPage({
          id: 2 as PageId,
          narrativeText: 'The story continues...',
          choices: [createChoice('Only option')],
          stateChanges: [],
          isEnding: false,
          parentPageId: 1 as PageId,
          parentChoiceIndex: 0,
        })
      ).toThrow('Non-ending pages must have at least 2 choices');
    });

    it('should throw if page 1 has parent', () => {
      expect(() =>
        createPage({
          id: 1 as PageId,
          narrativeText: 'Start...',
          choices: [createChoice('A'), createChoice('B')],
          stateChanges: [],
          isEnding: false,
          parentPageId: 5 as PageId,
          parentChoiceIndex: 0,
        })
      ).toThrow('Page 1 cannot have a parent');
    });

    it('should throw if page > 1 has no parent', () => {
      expect(() =>
        createPage({
          id: 2 as PageId,
          narrativeText: 'Continue...',
          choices: [createChoice('A'), createChoice('B')],
          stateChanges: [],
          isEnding: false,
          parentPageId: null,
          parentChoiceIndex: null,
        })
      ).toThrow('Pages after page 1 must have a parent');
    });
  });

  describe('isPageFullyExplored', () => {
    it('should return true if all choices have nextPageId', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Story...',
        choices: [
          { text: 'A', nextPageId: 2 as PageId },
          { text: 'B', nextPageId: 3 as PageId },
        ],
        stateChanges: [],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(isPageFullyExplored(page)).toBe(true);
    });

    it('should return false if any choice has null nextPageId', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Story...',
        choices: [
          { text: 'A', nextPageId: 2 as PageId },
          { text: 'B', nextPageId: null },
        ],
        stateChanges: [],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(isPageFullyExplored(page)).toBe(false);
    });
  });

  describe('getUnexploredChoiceIndices', () => {
    it('should return indices of unexplored choices', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'Story...',
        choices: [
          { text: 'A', nextPageId: 2 as PageId },
          { text: 'B', nextPageId: null },
          { text: 'C', nextPageId: null },
        ],
        stateChanges: [],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      expect(getUnexploredChoiceIndices(page)).toEqual([1, 2]);
    });
  });
});
```

**File**: `test/unit/models/story.test.ts`

```typescript
import { createStory, isStory, updateStoryCanon, updateStoryArc } from '@/models/story';
import { isStoryId } from '@/models/id';

describe('Story', () => {
  describe('createStory', () => {
    it('should create story with required fields', () => {
      const story = createStory({
        characterConcept: 'A brave knight seeking adventure',
      });

      expect(isStoryId(story.id)).toBe(true);
      expect(story.characterConcept).toBe('A brave knight seeking adventure');
      expect(story.worldbuilding).toBe('');
      expect(story.tone).toBe('fantasy adventure');
      expect(story.globalCanon).toEqual([]);
      expect(story.storyArc).toBeNull();
    });

    it('should create story with all fields', () => {
      const story = createStory({
        characterConcept: 'A cunning rogue',
        worldbuilding: 'A world of endless dungeons',
        tone: 'dark and mysterious',
      });

      expect(story.worldbuilding).toBe('A world of endless dungeons');
      expect(story.tone).toBe('dark and mysterious');
    });

    it('should trim whitespace', () => {
      const story = createStory({
        characterConcept: '  Hero  ',
        worldbuilding: '  World  ',
        tone: '  Tone  ',
      });

      expect(story.characterConcept).toBe('Hero');
      expect(story.worldbuilding).toBe('World');
      expect(story.tone).toBe('Tone');
    });

    it('should throw for empty character concept', () => {
      expect(() => createStory({ characterConcept: '' })).toThrow();
      expect(() => createStory({ characterConcept: '   ' })).toThrow();
    });

    it('should set timestamps', () => {
      const before = new Date();
      const story = createStory({ characterConcept: 'Hero' });
      const after = new Date();

      expect(story.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(story.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(story.updatedAt.getTime()).toEqual(story.createdAt.getTime());
    });
  });

  describe('isStory', () => {
    it('should return true for valid story', () => {
      const story = createStory({ characterConcept: 'Hero' });
      expect(isStory(story)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isStory(null)).toBe(false);
      expect(isStory({})).toBe(false);
      expect(isStory({ id: 'not-uuid' })).toBe(false);
    });
  });

  describe('updateStoryCanon', () => {
    it('should update canon and timestamp', () => {
      const story = createStory({ characterConcept: 'Hero' });
      const updated = updateStoryCanon(story, ['New fact']);

      expect(updated.globalCanon).toEqual(['New fact']);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(story.createdAt.getTime());
    });

    it('should not mutate original story', () => {
      const story = createStory({ characterConcept: 'Hero' });
      updateStoryCanon(story, ['New fact']);
      expect(story.globalCanon).toEqual([]);
    });
  });

  describe('updateStoryArc', () => {
    it('should update story arc and timestamp', () => {
      const story = createStory({ characterConcept: 'Hero' });
      const updated = updateStoryArc(story, 'Defeat the dragon king');

      expect(updated.storyArc).toBe('Defeat the dragon king');
    });
  });
});
```

**File**: `test/unit/models/validation.test.ts`

```typescript
import { validateStory, validatePage, validateStoryIntegrity } from '@/models/validation';
import { createStory } from '@/models/story';
import { createPage } from '@/models/page';
import { createChoice } from '@/models/choice';
import { PageId } from '@/models/id';

describe('Validation', () => {
  describe('validateStory', () => {
    it('should pass for valid story', () => {
      const story = createStory({
        characterConcept: 'A brave knight seeking glory and adventure',
      });
      const result = validateStory(story);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail for short character concept', () => {
      const story = { ...createStory({ characterConcept: 'Short concept' }), characterConcept: 'Hi' };
      const result = validateStory(story);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Character concept is too short (minimum 10 characters)');
    });
  });

  describe('validatePage', () => {
    it('should pass for valid page', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(100),
        choices: [createChoice('Option A'), createChoice('Option B')],
        stateChanges: [],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const result = validatePage(page);
      expect(result.valid).toBe(true);
    });

    it('should fail for duplicate choice texts', () => {
      const page = createPage({
        id: 1 as PageId,
        narrativeText: 'A'.repeat(100),
        choices: [createChoice('Go north'), createChoice('Go north')],
        stateChanges: [],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const result = validatePage(page);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate choice texts detected');
    });
  });

  describe('validateStoryIntegrity', () => {
    it('should pass for valid story with page 1', () => {
      const story = createStory({ characterConcept: 'Hero' });
      const pages = new Map<PageId, ReturnType<typeof createPage>>();
      pages.set(
        1 as PageId,
        createPage({
          id: 1 as PageId,
          narrativeText: 'A'.repeat(100),
          choices: [createChoice('A'), createChoice('B')],
          stateChanges: [],
          isEnding: false,
          parentPageId: null,
          parentChoiceIndex: null,
        })
      );

      const result = validateStoryIntegrity(story, pages);
      expect(result.valid).toBe(true);
    });

    it('should fail for story without page 1', () => {
      const story = createStory({ characterConcept: 'Hero' });
      const pages = new Map<PageId, ReturnType<typeof createPage>>();

      const result = validateStoryIntegrity(story, pages);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Story must have page 1');
    });
  });
});
```

## Acceptance Criteria

- [ ] All model files compile without TypeScript errors
- [ ] All type guards correctly identify valid/invalid objects
- [ ] ID generation produces unique, valid identifiers
- [ ] State accumulation works correctly across page chains
- [ ] Canon facts can be added without duplicates
- [ ] Page creation enforces invariants (choices, endings, parents)
- [ ] Story creation requires character concept
- [ ] All unit tests pass
- [ ] Type coverage is complete (no implicit any)

## Implementation Notes

1. Use branded types for IDs to prevent accidental mixing
2. All state changes are strings (not complex JSON) per requirements
3. `createPage` computes accumulated state automatically
4. Validation functions are pure and return result objects (not throwing)
5. Factory functions (`create*`) throw on invalid input for fail-fast behavior
6. Type guards are useful for deserializing data from JSON files

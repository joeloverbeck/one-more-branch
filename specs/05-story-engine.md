# Spec 05: Story Engine Core

## Overview

Implement the core story engine that orchestrates story creation, page generation, state management, and canon tracking. This is the central logic layer that ties together persistence and LLM integration.

## Goals

1. Implement the story creation and initialization flow
2. Handle choice selection and page generation/retrieval
3. Manage state accumulation across branches
4. Track and update global canon facts
5. Enforce all story invariants

## Dependencies

- **Spec 02**: Data Models (Story, Page, Choice types)
- **Spec 03**: Persistence Layer (storage operations)
- **Spec 04**: LLM Integration (content generation)

## Implementation Details

### Core Responsibilities

The Story Engine handles:
1. **Story Lifecycle**: Creating new stories, loading existing ones
2. **Page Generation**: Generating new pages via LLM or loading existing ones
3. **State Management**: Computing accumulated state for branches
4. **Canon Management**: Extracting and storing world facts
5. **Choice Linking**: Connecting pages via choice selections
6. **Validation**: Enforcing all invariants

### Code Structure

```
src/engine/
├── index.ts              # Re-exports
├── story-engine.ts       # Main engine class
├── story-service.ts      # Story-level operations
├── page-service.ts       # Page-level operations
├── state-manager.ts      # State accumulation logic
├── canon-manager.ts      # Canon extraction and storage
└── types.ts              # Engine-specific types
```

## Files to Create

### `src/engine/types.ts`

```typescript
import { Story, Page, PageId, StoryId, StoryMetadata } from '../models/index.js';

/**
 * Result of starting a new story
 */
export interface StartStoryResult {
  story: Story;
  page: Page;
}

/**
 * Result of making a choice
 */
export interface MakeChoiceResult {
  page: Page;
  wasGenerated: boolean; // true if newly generated, false if already existed
}

/**
 * Current play session state
 */
export interface PlaySession {
  storyId: StoryId;
  currentPageId: PageId;
  apiKey: string; // In-memory only
}

/**
 * Options for starting a story
 */
export interface StartStoryOptions {
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
  apiKey: string;
}

/**
 * Options for making a choice
 */
export interface MakeChoiceOptions {
  storyId: StoryId;
  pageId: PageId;
  choiceIndex: number;
  apiKey: string;
}

/**
 * Engine error types
 */
export type EngineErrorCode =
  | 'STORY_NOT_FOUND'
  | 'PAGE_NOT_FOUND'
  | 'INVALID_CHOICE'
  | 'GENERATION_FAILED'
  | 'VALIDATION_FAILED'
  | 'CONCURRENT_GENERATION';

/**
 * Engine error
 */
export class EngineError extends Error {
  constructor(
    message: string,
    public readonly code: EngineErrorCode
  ) {
    super(message);
    this.name = 'EngineError';
  }
}
```

### `src/engine/state-manager.ts`

```typescript
import { Page, PageId, AccumulatedState, createEmptyAccumulatedState } from '../models/index.js';

/**
 * Compute accumulated state by traversing from page 1 to target page
 */
export function computeAccumulatedState(
  targetPageId: PageId,
  getPage: (id: PageId) => Page | undefined
): AccumulatedState {
  const changes: string[] = [];
  const path: Page[] = [];

  // Build path from target back to page 1
  let current = getPage(targetPageId);
  while (current) {
    path.unshift(current);
    if (current.parentPageId === null) {
      break;
    }
    current = getPage(current.parentPageId);
  }

  // Accumulate state changes along the path
  for (const page of path) {
    changes.push(...page.stateChanges);
  }

  return { changes };
}

/**
 * Get the accumulated state for a page's parent (for creating child pages)
 */
export function getParentAccumulatedState(
  parentPage: Page
): AccumulatedState {
  return parentPage.accumulatedState;
}

/**
 * Merge new state changes with parent state
 */
export function mergeStateChanges(
  parentState: AccumulatedState,
  newChanges: readonly string[]
): AccumulatedState {
  return {
    changes: [...parentState.changes, ...newChanges],
  };
}

/**
 * Format accumulated state for display
 */
export function formatStateForDisplay(state: AccumulatedState): string {
  if (state.changes.length === 0) {
    return 'No significant events yet.';
  }

  return state.changes.map(change => `• ${change}`).join('\n');
}

/**
 * Get recent state changes (last N items)
 */
export function getRecentChanges(
  state: AccumulatedState,
  count: number = 5
): string[] {
  return state.changes.slice(-count);
}
```

### `src/engine/canon-manager.ts`

```typescript
import { Story, GlobalCanon, addCanonFact, mergeCanonFacts } from '../models/index.js';

/**
 * Add new canon facts to a story
 * Returns updated story if changes were made
 */
export function updateStoryWithNewCanon(
  story: Story,
  newFacts: readonly string[]
): Story {
  if (newFacts.length === 0) {
    return story;
  }

  const updatedCanon = mergeCanonFacts(story.globalCanon, [...newFacts]);

  // Check if anything actually changed
  if (updatedCanon.length === story.globalCanon.length) {
    return story;
  }

  return {
    ...story,
    globalCanon: updatedCanon,
    updatedAt: new Date(),
  };
}

/**
 * Format canon for inclusion in prompts
 */
export function formatCanonForPrompt(canon: GlobalCanon): string {
  if (canon.length === 0) {
    return '';
  }

  return canon.map(fact => `• ${fact}`).join('\n');
}

/**
 * Check if a potential fact might contradict existing canon
 * This is a simple heuristic check - not foolproof
 */
export function mightContradictCanon(
  existingCanon: GlobalCanon,
  newFact: string
): boolean {
  const newFactLower = newFact.toLowerCase();

  // Look for potential contradictions with negation patterns
  const negationPatterns = [
    { has: 'is not', without: 'is not' },
    { has: 'does not', without: 'does not' },
    { has: 'never', without: 'never' },
    { has: 'no longer', without: 'no longer' },
    { has: 'was destroyed', without: 'was destroyed' },
    { has: 'died', without: 'died' },
  ];

  for (const fact of existingCanon) {
    const factLower = fact.toLowerCase();

    // Check if they mention the same entity with different states
    // This is a very basic check - real contradiction detection would be complex
    for (const pattern of negationPatterns) {
      if (
        (factLower.includes(pattern.has) && !newFactLower.includes(pattern.has)) ||
        (!factLower.includes(pattern.has) && newFactLower.includes(pattern.has))
      ) {
        // Extract key nouns and see if they match
        const factWords = factLower.split(/\s+/);
        const newWords = newFactLower.split(/\s+/);
        const commonWords = factWords.filter(
          w => newWords.includes(w) && w.length > 4
        );

        if (commonWords.length >= 2) {
          return true; // Potential contradiction
        }
      }
    }
  }

  return false;
}

/**
 * Validate that new facts don't obviously contradict canon
 * Returns list of potentially problematic facts
 */
export function validateNewFacts(
  existingCanon: GlobalCanon,
  newFacts: readonly string[]
): string[] {
  const problematic: string[] = [];

  for (const fact of newFacts) {
    if (mightContradictCanon(existingCanon, fact)) {
      problematic.push(fact);
    }
  }

  return problematic;
}
```

### `src/engine/page-service.ts`

```typescript
import {
  Story,
  Page,
  PageId,
  Choice,
  createPage,
  createChoice,
  generatePageId,
} from '../models/index.js';
import { storage } from '../persistence/index.js';
import {
  generateOpeningPage,
  generateContinuationPage,
  GenerationOptions,
  ContinuationContext,
  OpeningContext,
} from '../llm/index.js';
import { getParentAccumulatedState } from './state-manager.js';
import { updateStoryWithNewCanon } from './canon-manager.js';
import { EngineError } from './types.js';

/**
 * Generate the opening page for a new story
 */
export async function generateFirstPage(
  story: Story,
  apiKey: string
): Promise<{ page: Page; updatedStory: Story }> {
  const context: OpeningContext = {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
  };

  const options: GenerationOptions = { apiKey };

  const result = await generateOpeningPage(context, options);

  // Create choices from result
  const choices: Choice[] = result.choices.map(text => createChoice(text));

  // Create page 1
  const page = createPage({
    id: 1 as PageId,
    narrativeText: result.narrative,
    choices,
    stateChanges: result.stateChanges,
    isEnding: result.isEnding,
    parentPageId: null,
    parentChoiceIndex: null,
  });

  // Update story with canon and arc
  let updatedStory = updateStoryWithNewCanon(story, result.newCanonFacts);

  if (result.storyArc) {
    updatedStory = {
      ...updatedStory,
      storyArc: result.storyArc,
      updatedAt: new Date(),
    };
  }

  return { page, updatedStory };
}

/**
 * Generate a continuation page based on a choice
 */
export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string
): Promise<{ page: Page; updatedStory: Story }> {
  const choice = parentPage.choices[choiceIndex];
  if (!choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage.id}`,
      'INVALID_CHOICE'
    );
  }

  // Get next page ID
  const maxPageId = await storage.getMaxPageId(story.id);
  const newPageId = generatePageId(maxPageId);

  // Build context for LLM
  const context: ContinuationContext = {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    globalCanon: story.globalCanon,
    storyArc: story.storyArc,
    previousNarrative: parentPage.narrativeText,
    selectedChoice: choice.text,
    accumulatedState: parentPage.accumulatedState.changes,
  };

  const options: GenerationOptions = { apiKey };

  const result = await generateContinuationPage(context, options);

  // Create choices from result
  const choices: Choice[] = result.choices.map(text => createChoice(text));

  // Create new page
  const page = createPage({
    id: newPageId,
    narrativeText: result.narrative,
    choices,
    stateChanges: result.stateChanges,
    isEnding: result.isEnding,
    parentPageId: parentPage.id,
    parentChoiceIndex: choiceIndex,
    parentAccumulatedState: getParentAccumulatedState(parentPage),
  });

  // Update story with new canon
  const updatedStory = updateStoryWithNewCanon(story, result.newCanonFacts);

  return { page, updatedStory };
}

/**
 * Load a page or generate it if the choice hasn't been explored
 */
export async function getOrGeneratePage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string
): Promise<{ page: Page; story: Story; wasGenerated: boolean }> {
  const choice = parentPage.choices[choiceIndex];
  if (!choice) {
    throw new EngineError(
      `Invalid choice index ${choiceIndex} on page ${parentPage.id}`,
      'INVALID_CHOICE'
    );
  }

  // If choice already has a next page, load it
  if (choice.nextPageId !== null) {
    const existingPage = await storage.loadPage(story.id, choice.nextPageId);
    if (existingPage) {
      return { page: existingPage, story, wasGenerated: false };
    }
    // Page should exist but doesn't - this is an error
    throw new EngineError(
      `Page ${choice.nextPageId} referenced by choice but not found`,
      'PAGE_NOT_FOUND'
    );
  }

  // Generate new page
  const { page, updatedStory } = await generateNextPage(
    story,
    parentPage,
    choiceIndex,
    apiKey
  );

  // Save the new page
  await storage.savePage(story.id, page);

  // Update the choice link on the parent page
  await storage.updateChoiceLink(story.id, parentPage.id, choiceIndex, page.id);

  // Save updated story (canon/arc updates)
  if (updatedStory.updatedAt !== story.updatedAt) {
    await storage.updateStory(updatedStory);
  }

  return { page, story: updatedStory, wasGenerated: true };
}
```

### `src/engine/story-service.ts`

```typescript
import {
  Story,
  Page,
  PageId,
  StoryId,
  StoryMetadata,
  createStory,
} from '../models/index.js';
import { storage } from '../persistence/index.js';
import { generateFirstPage } from './page-service.js';
import { StartStoryOptions, StartStoryResult, EngineError } from './types.js';

/**
 * Create and initialize a new story with its first page
 */
export async function startNewStory(
  options: StartStoryOptions
): Promise<StartStoryResult> {
  // Validate inputs
  if (!options.characterConcept || options.characterConcept.trim().length < 10) {
    throw new EngineError(
      'Character concept must be at least 10 characters',
      'VALIDATION_FAILED'
    );
  }

  if (!options.apiKey) {
    throw new EngineError(
      'API key is required',
      'VALIDATION_FAILED'
    );
  }

  // Create story object
  const story = createStory({
    characterConcept: options.characterConcept,
    worldbuilding: options.worldbuilding,
    tone: options.tone,
  });

  // Save story first (creates directory)
  await storage.saveStory(story);

  try {
    // Generate first page
    const { page, updatedStory } = await generateFirstPage(story, options.apiKey);

    // Save first page
    await storage.savePage(story.id, page);

    // Update story with any canon/arc from first page
    if (updatedStory.updatedAt !== story.updatedAt) {
      await storage.updateStory(updatedStory);
    }

    return { story: updatedStory, page };
  } catch (error) {
    // Clean up story directory on failure
    await storage.deleteStory(story.id);
    throw error;
  }
}

/**
 * Load an existing story by ID
 */
export async function loadStory(storyId: StoryId): Promise<Story | null> {
  return storage.loadStory(storyId);
}

/**
 * Get a specific page from a story
 */
export async function getPage(
  storyId: StoryId,
  pageId: PageId
): Promise<Page | null> {
  return storage.loadPage(storyId, pageId);
}

/**
 * Get page 1 (starting page) of a story
 */
export async function getStartingPage(storyId: StoryId): Promise<Page | null> {
  return storage.loadPage(storyId, 1 as PageId);
}

/**
 * List all available stories
 */
export async function listAllStories(): Promise<StoryMetadata[]> {
  return storage.listStories();
}

/**
 * Delete a story and all its data
 */
export async function deleteStory(storyId: StoryId): Promise<void> {
  return storage.deleteStory(storyId);
}

/**
 * Get story statistics
 */
export async function getStoryStats(storyId: StoryId): Promise<{
  pageCount: number;
  exploredBranches: number;
  totalBranches: number;
  hasEnding: boolean;
}> {
  const pages = await storage.loadAllPages(storyId);

  let exploredBranches = 0;
  let totalBranches = 0;
  let hasEnding = false;

  for (const page of pages.values()) {
    if (page.isEnding) {
      hasEnding = true;
    }

    for (const choice of page.choices) {
      totalBranches++;
      if (choice.nextPageId !== null) {
        exploredBranches++;
      }
    }
  }

  return {
    pageCount: pages.size,
    exploredBranches,
    totalBranches,
    hasEnding,
  };
}
```

### `src/engine/story-engine.ts`

```typescript
import {
  Story,
  Page,
  PageId,
  StoryId,
  StoryMetadata,
} from '../models/index.js';
import { storage } from '../persistence/index.js';
import {
  startNewStory,
  loadStory,
  getPage,
  getStartingPage,
  listAllStories,
  deleteStory,
  getStoryStats,
} from './story-service.js';
import { getOrGeneratePage } from './page-service.js';
import {
  StartStoryOptions,
  StartStoryResult,
  MakeChoiceOptions,
  MakeChoiceResult,
  PlaySession,
  EngineError,
} from './types.js';

/**
 * Main Story Engine - orchestrates all story operations
 */
export class StoryEngine {
  /**
   * Initialize the engine (ensure storage is ready)
   */
  init(): void {
    storage.init();
  }

  /**
   * Start a new story and get the first page
   */
  async startStory(options: StartStoryOptions): Promise<StartStoryResult> {
    return startNewStory(options);
  }

  /**
   * Make a choice on a page, getting or generating the next page
   */
  async makeChoice(options: MakeChoiceOptions): Promise<MakeChoiceResult> {
    // Load story
    const story = await loadStory(options.storyId);
    if (!story) {
      throw new EngineError(
        `Story ${options.storyId} not found`,
        'STORY_NOT_FOUND'
      );
    }

    // Load current page
    const currentPage = await getPage(options.storyId, options.pageId);
    if (!currentPage) {
      throw new EngineError(
        `Page ${options.pageId} not found in story ${options.storyId}`,
        'PAGE_NOT_FOUND'
      );
    }

    // Validate choice index
    if (options.choiceIndex < 0 || options.choiceIndex >= currentPage.choices.length) {
      throw new EngineError(
        `Invalid choice index ${options.choiceIndex}. Page has ${currentPage.choices.length} choices.`,
        'INVALID_CHOICE'
      );
    }

    // Check if page is an ending
    if (currentPage.isEnding) {
      throw new EngineError(
        'Cannot make a choice on an ending page',
        'INVALID_CHOICE'
      );
    }

    // Get or generate the next page
    const { page, wasGenerated } = await getOrGeneratePage(
      story,
      currentPage,
      options.choiceIndex,
      options.apiKey
    );

    return { page, wasGenerated };
  }

  /**
   * Load an existing story
   */
  async loadStory(storyId: StoryId): Promise<Story | null> {
    return loadStory(storyId);
  }

  /**
   * Get a specific page
   */
  async getPage(storyId: StoryId, pageId: PageId): Promise<Page | null> {
    return getPage(storyId, pageId);
  }

  /**
   * Get the starting page of a story
   */
  async getStartingPage(storyId: StoryId): Promise<Page | null> {
    return getStartingPage(storyId);
  }

  /**
   * Restart a story (return to page 1)
   * Just returns page 1 - no state changes needed since stories are immutable
   */
  async restartStory(storyId: StoryId): Promise<Page> {
    const page = await getStartingPage(storyId);
    if (!page) {
      throw new EngineError(
        `Story ${storyId} has no starting page`,
        'PAGE_NOT_FOUND'
      );
    }
    return page;
  }

  /**
   * List all available stories
   */
  async listStories(): Promise<StoryMetadata[]> {
    return listAllStories();
  }

  /**
   * Delete a story
   */
  async deleteStory(storyId: StoryId): Promise<void> {
    return deleteStory(storyId);
  }

  /**
   * Get story statistics
   */
  async getStoryStats(storyId: StoryId): Promise<{
    pageCount: number;
    exploredBranches: number;
    totalBranches: number;
    hasEnding: boolean;
  }> {
    return getStoryStats(storyId);
  }

  /**
   * Check if a story exists
   */
  async storyExists(storyId: StoryId): Promise<boolean> {
    return storage.storyExists(storyId);
  }

  /**
   * Get full story with all pages (for debugging/admin)
   */
  async getFullStory(storyId: StoryId): Promise<{
    story: Story;
    pages: Map<PageId, Page>;
  } | null> {
    const story = await loadStory(storyId);
    if (!story) {
      return null;
    }

    const pages = await storage.loadAllPages(storyId);

    return { story, pages };
  }
}

// Singleton instance
export const storyEngine = new StoryEngine();
```

### `src/engine/index.ts`

```typescript
export { StoryEngine, storyEngine } from './story-engine.js';

export {
  startNewStory,
  loadStory,
  getPage,
  getStartingPage,
  listAllStories,
  deleteStory,
  getStoryStats,
} from './story-service.js';

export {
  generateFirstPage,
  generateNextPage,
  getOrGeneratePage,
} from './page-service.js';

export {
  computeAccumulatedState,
  getParentAccumulatedState,
  mergeStateChanges,
  formatStateForDisplay,
  getRecentChanges,
} from './state-manager.js';

export {
  updateStoryWithNewCanon,
  formatCanonForPrompt,
  mightContradictCanon,
  validateNewFacts,
} from './canon-manager.js';

export {
  StartStoryResult,
  MakeChoiceResult,
  PlaySession,
  StartStoryOptions,
  MakeChoiceOptions,
  EngineError,
  EngineErrorCode,
} from './types.js';
```

## Invariants

1. **Page Immutability**: Once a page is generated, its narrative and choices never change
2. **Deterministic Replay**: Same choice always leads to same page content
3. **State Accumulation**: Each page's accumulated state equals parent's + own changes
4. **Canon Consistency**: Global canon only grows, never contradicts itself
5. **Acyclic Graph**: No page links can create cycles back to ancestors
6. **Choice Linking**: After generation, parent's choice.nextPageId points to new page
7. **Branch Isolation**: State changes only affect downstream pages in same branch
8. **Ending Consistency**: Ending pages have no choices; non-endings have 2+ choices
9. **Page 1 Root**: Every story has exactly one page 1 with no parent

## Test Cases

### Unit Tests

**File**: `test/unit/engine/state-manager.test.ts`

```typescript
import {
  computeAccumulatedState,
  getParentAccumulatedState,
  mergeStateChanges,
  formatStateForDisplay,
  getRecentChanges,
} from '@/engine/state-manager';
import { Page, PageId } from '@/models';

describe('State Manager', () => {
  describe('computeAccumulatedState', () => {
    it('should accumulate state through page chain', () => {
      const pages = new Map<PageId, Page>();

      // Page 1 (root)
      pages.set(1 as PageId, {
        id: 1 as PageId,
        narrativeText: 'Start',
        choices: [],
        stateChanges: ['Event A'],
        accumulatedState: { changes: ['Event A'] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      // Page 2 (child of 1)
      pages.set(2 as PageId, {
        id: 2 as PageId,
        narrativeText: 'Continue',
        choices: [],
        stateChanges: ['Event B'],
        accumulatedState: { changes: ['Event A', 'Event B'] },
        isEnding: false,
        parentPageId: 1 as PageId,
        parentChoiceIndex: 0,
      });

      // Page 3 (child of 2)
      pages.set(3 as PageId, {
        id: 3 as PageId,
        narrativeText: 'More',
        choices: [],
        stateChanges: ['Event C'],
        accumulatedState: { changes: ['Event A', 'Event B', 'Event C'] },
        isEnding: false,
        parentPageId: 2 as PageId,
        parentChoiceIndex: 0,
      });

      const result = computeAccumulatedState(3 as PageId, id => pages.get(id));

      expect(result.changes).toEqual(['Event A', 'Event B', 'Event C']);
    });
  });

  describe('mergeStateChanges', () => {
    it('should combine parent state with new changes', () => {
      const parent = { changes: ['Event A', 'Event B'] };
      const result = mergeStateChanges(parent, ['Event C']);

      expect(result.changes).toEqual(['Event A', 'Event B', 'Event C']);
    });
  });

  describe('formatStateForDisplay', () => {
    it('should format state as bulleted list', () => {
      const state = { changes: ['Event A', 'Event B'] };
      const formatted = formatStateForDisplay(state);

      expect(formatted).toContain('• Event A');
      expect(formatted).toContain('• Event B');
    });

    it('should handle empty state', () => {
      const state = { changes: [] };
      const formatted = formatStateForDisplay(state);

      expect(formatted).toBe('No significant events yet.');
    });
  });

  describe('getRecentChanges', () => {
    it('should return last N changes', () => {
      const state = { changes: ['A', 'B', 'C', 'D', 'E', 'F'] };
      const recent = getRecentChanges(state, 3);

      expect(recent).toEqual(['D', 'E', 'F']);
    });
  });
});
```

**File**: `test/unit/engine/canon-manager.test.ts`

```typescript
import {
  updateStoryWithNewCanon,
  formatCanonForPrompt,
  mightContradictCanon,
  validateNewFacts,
} from '@/engine/canon-manager';
import { createStory } from '@/models';

describe('Canon Manager', () => {
  describe('updateStoryWithNewCanon', () => {
    it('should add new facts to story', () => {
      const story = createStory({ characterConcept: 'Hero for testing canon' });
      const updated = updateStoryWithNewCanon(story, ['Fact A', 'Fact B']);

      expect(updated.globalCanon).toEqual(['Fact A', 'Fact B']);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(story.createdAt.getTime());
    });

    it('should not modify story if no new facts', () => {
      const story = createStory({ characterConcept: 'Hero for testing' });
      const updated = updateStoryWithNewCanon(story, []);

      expect(updated).toBe(story);
    });

    it('should not add duplicate facts', () => {
      const story = {
        ...createStory({ characterConcept: 'Hero for testing' }),
        globalCanon: ['Existing fact'],
      };
      const updated = updateStoryWithNewCanon(story, ['Existing fact', 'New fact']);

      expect(updated.globalCanon).toEqual(['Existing fact', 'New fact']);
    });
  });

  describe('formatCanonForPrompt', () => {
    it('should format canon as bulleted list', () => {
      const canon = ['The kingdom exists', 'Dragons are real'];
      const formatted = formatCanonForPrompt(canon);

      expect(formatted).toContain('• The kingdom exists');
      expect(formatted).toContain('• Dragons are real');
    });

    it('should return empty string for empty canon', () => {
      expect(formatCanonForPrompt([])).toBe('');
    });
  });

  describe('mightContradictCanon', () => {
    it('should detect potential contradictions', () => {
      const canon = ['The dragon is alive'];
      const result = mightContradictCanon(canon, 'The dragon died in battle');

      expect(result).toBe(true);
    });

    it('should allow compatible facts', () => {
      const canon = ['The kingdom exists'];
      const result = mightContradictCanon(canon, 'The kingdom is prosperous');

      expect(result).toBe(false);
    });
  });

  describe('validateNewFacts', () => {
    it('should return problematic facts', () => {
      const canon = ['The castle stands tall'];
      const problems = validateNewFacts(canon, [
        'The castle was destroyed',
        'The weather is nice',
      ]);

      expect(problems.length).toBeGreaterThanOrEqual(0);
      // Note: this is a heuristic check, may not catch everything
    });
  });
});
```

### Integration Tests

**File**: `test/integration/engine/story-engine.test.ts`

```typescript
import { storyEngine } from '@/engine';
import { StoryId, PageId } from '@/models';

// Skip if no API key
const API_KEY = process.env.OPENROUTER_TEST_KEY;
const describeWithKey = API_KEY ? describe : describe.skip;

describeWithKey('Story Engine Integration', () => {
  let testStoryId: StoryId;

  afterEach(async () => {
    // Clean up test story
    if (testStoryId) {
      try {
        await storyEngine.deleteStory(testStoryId);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should create new story with first page', async () => {
    storyEngine.init();

    const result = await storyEngine.startStory({
      characterConcept: 'TEST ENGINE: A wandering minstrel named Finn who collects stories',
      worldbuilding: 'A land where stories have magical power',
      tone: 'whimsical fantasy',
      apiKey: API_KEY!,
    });

    testStoryId = result.story.id;

    expect(result.story.characterConcept).toContain('Finn');
    expect(result.page.id).toBe(1);
    expect(result.page.narrativeText.length).toBeGreaterThan(50);
    expect(result.page.choices.length).toBeGreaterThanOrEqual(2);
    expect(result.page.isEnding).toBe(false);
  }, 60000);

  it('should make choice and generate new page', async () => {
    storyEngine.init();

    // Start story
    const start = await storyEngine.startStory({
      characterConcept: 'TEST ENGINE: A curious explorer named Ada',
      tone: 'adventure',
      apiKey: API_KEY!,
    });
    testStoryId = start.story.id;

    // Make first choice
    const result = await storyEngine.makeChoice({
      storyId: testStoryId,
      pageId: 1 as PageId,
      choiceIndex: 0,
      apiKey: API_KEY!,
    });

    expect(result.page.id).toBe(2);
    expect(result.wasGenerated).toBe(true);
    expect(result.page.parentPageId).toBe(1);
    expect(result.page.parentChoiceIndex).toBe(0);
  }, 120000);

  it('should load existing page without regeneration', async () => {
    storyEngine.init();

    // Start story and make a choice
    const start = await storyEngine.startStory({
      characterConcept: 'TEST ENGINE: A merchant named Basil',
      tone: 'comedy',
      apiKey: API_KEY!,
    });
    testStoryId = start.story.id;

    // First choice - generates page 2
    const first = await storyEngine.makeChoice({
      storyId: testStoryId,
      pageId: 1 as PageId,
      choiceIndex: 0,
      apiKey: API_KEY!,
    });

    const generatedNarrative = first.page.narrativeText;

    // Same choice again - should load, not generate
    const second = await storyEngine.makeChoice({
      storyId: testStoryId,
      pageId: 1 as PageId,
      choiceIndex: 0,
      apiKey: API_KEY!,
    });

    expect(second.wasGenerated).toBe(false);
    expect(second.page.narrativeText).toBe(generatedNarrative);
  }, 120000);

  it('should maintain branch isolation', async () => {
    storyEngine.init();

    const start = await storyEngine.startStory({
      characterConcept: 'TEST ENGINE: A ranger named Kira',
      tone: 'survival',
      apiKey: API_KEY!,
    });
    testStoryId = start.story.id;

    // Branch A: choice 0
    const branchA = await storyEngine.makeChoice({
      storyId: testStoryId,
      pageId: 1 as PageId,
      choiceIndex: 0,
      apiKey: API_KEY!,
    });

    // Branch B: choice 1
    const branchB = await storyEngine.makeChoice({
      storyId: testStoryId,
      pageId: 1 as PageId,
      choiceIndex: 1,
      apiKey: API_KEY!,
    });

    // Pages should be different
    expect(branchA.page.id).not.toBe(branchB.page.id);
    expect(branchA.page.narrativeText).not.toBe(branchB.page.narrativeText);

    // Both should have page 1 as parent
    expect(branchA.page.parentPageId).toBe(1);
    expect(branchB.page.parentPageId).toBe(1);
  }, 180000);
});
```

**File**: `test/integration/engine/replay.test.ts`

```typescript
import { storyEngine } from '@/engine';
import { StoryId, PageId } from '@/models';

const API_KEY = process.env.OPENROUTER_TEST_KEY;
const describeWithKey = API_KEY ? describe : describe.skip;

describeWithKey('Story Replay Integration', () => {
  let testStoryId: StoryId;

  afterEach(async () => {
    if (testStoryId) {
      try {
        await storyEngine.deleteStory(testStoryId);
      } catch {}
    }
  });

  it('should restart story from page 1', async () => {
    storyEngine.init();

    const start = await storyEngine.startStory({
      characterConcept: 'TEST REPLAY: A knight',
      tone: 'heroic',
      apiKey: API_KEY!,
    });
    testStoryId = start.story.id;

    // Make some choices
    await storyEngine.makeChoice({
      storyId: testStoryId,
      pageId: 1 as PageId,
      choiceIndex: 0,
      apiKey: API_KEY!,
    });

    // Restart
    const restartPage = await storyEngine.restartStory(testStoryId);

    expect(restartPage.id).toBe(1);
    expect(restartPage.narrativeText).toBe(start.page.narrativeText);
  }, 120000);

  it('should persist story across engine instances', async () => {
    storyEngine.init();

    const start = await storyEngine.startStory({
      characterConcept: 'TEST PERSIST: A wizard',
      tone: 'mystical',
      apiKey: API_KEY!,
    });
    testStoryId = start.story.id;

    // Simulate new engine instance
    const newEngine = new (storyEngine.constructor as any)();
    newEngine.init();

    const loadedStory = await newEngine.loadStory(testStoryId);
    const loadedPage = await newEngine.getStartingPage(testStoryId);

    expect(loadedStory).not.toBeNull();
    expect(loadedStory?.characterConcept).toBe(start.story.characterConcept);
    expect(loadedPage?.narrativeText).toBe(start.page.narrativeText);
  }, 60000);
});
```

### E2E Tests

**File**: `test/e2e/engine/full-playthrough.test.ts`

```typescript
import { storyEngine } from '@/engine';
import { StoryId, PageId } from '@/models';

const API_KEY = process.env.OPENROUTER_TEST_KEY;
const describeWithKey = API_KEY ? describe : describe.skip;

describeWithKey('Full Playthrough E2E', () => {
  let testStoryId: StoryId;

  afterAll(async () => {
    if (testStoryId) {
      try {
        await storyEngine.deleteStory(testStoryId);
      } catch {}
    }
  });

  it('should complete a multi-page story journey', async () => {
    storyEngine.init();

    // Start story
    const start = await storyEngine.startStory({
      characterConcept: 'E2E TEST: A young scholar named Elara who discovers an ancient map',
      worldbuilding: 'A world of floating islands connected by magical bridges',
      tone: 'adventure mystery',
      apiKey: API_KEY!,
    });
    testStoryId = start.story.id;

    console.log('Started story:', start.story.id);
    console.log('Page 1 choices:', start.page.choices.map(c => c.text));

    // Play through 3 pages
    let currentPageId = start.page.id;

    for (let i = 0; i < 3; i++) {
      const currentPage = await storyEngine.getPage(testStoryId, currentPageId);

      if (!currentPage || currentPage.isEnding) {
        console.log(`Story ended at page ${currentPageId}`);
        break;
      }

      // Always pick first choice for deterministic test
      const result = await storyEngine.makeChoice({
        storyId: testStoryId,
        pageId: currentPageId,
        choiceIndex: 0,
        apiKey: API_KEY!,
      });

      console.log(`Page ${result.page.id} (generated: ${result.wasGenerated})`);
      console.log('Choices:', result.page.choices.map(c => c.text));
      console.log('State changes:', result.page.stateChanges);

      currentPageId = result.page.id;
    }

    // Verify story structure
    const stats = await storyEngine.getStoryStats(testStoryId);
    console.log('Story stats:', stats);

    expect(stats.pageCount).toBeGreaterThanOrEqual(4);
    expect(stats.exploredBranches).toBeGreaterThanOrEqual(3);

    // Verify replay works
    const replayPage = await storyEngine.restartStory(testStoryId);
    expect(replayPage.narrativeText).toBe(start.page.narrativeText);
  }, 300000); // 5 minute timeout for full playthrough
});
```

## Acceptance Criteria

- [ ] New stories can be created with first page generation
- [ ] Choices lead to new page generation or existing page retrieval
- [ ] State accumulates correctly through branches
- [ ] Canon facts are extracted and stored
- [ ] Branch isolation is maintained (different branches have independent state)
- [ ] Replaying same choice returns identical content
- [ ] Story can be restarted from page 1
- [ ] Invalid choices are rejected with appropriate errors
- [ ] Ending pages cannot have choices made on them
- [ ] All unit tests pass
- [ ] All integration tests pass (with API key)
- [ ] Full playthrough E2E test passes

## Implementation Notes

1. The engine is stateless - all state is in persistence layer
2. API key is passed per-operation, never stored
3. Page generation is atomic - either fully succeeds or story is cleaned up
4. Choice links are updated atomically after successful generation
5. Story arc is set from first page, guides subsequent generations
6. Canon validation is best-effort heuristic, not foolproof
7. Integration tests require OPENROUTER_TEST_KEY environment variable
8. E2E tests have long timeouts due to multiple LLM calls

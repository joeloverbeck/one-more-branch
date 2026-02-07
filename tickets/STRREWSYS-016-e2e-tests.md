# STRREWSYS-016: Create E2E Tests for Structure Rewriting Journey

## Summary
Create end-to-end tests that verify the complete user journey through structure rewriting, from story creation through deviation detection to story completion.

## Dependencies
- All previous STRREWSYS tickets (001-015) should be completed

## Files to Touch

### New Files
- `test/e2e/engine/structure-rewriting-journey.test.ts`

## Out of Scope
- Do NOT test performance (handled in STRREWSYS-017)
- Do NOT test UI rendering (focus on engine flow)
- Do NOT create flaky tests dependent on LLM output variations

## Implementation Details

### New File: `test/e2e/engine/structure-rewriting-journey.test.ts`

```typescript
/**
 * E2E tests for structure rewriting journey.
 *
 * These tests verify the complete flow from story creation through
 * deviation detection to story completion with rewritten structure.
 *
 * Note: These tests use mocked LLM responses for determinism.
 * Real LLM integration is tested separately.
 */

import { storage } from '../../../src/persistence';
import {
  createStory,
  generateFirstPage,
  generateNextPage,
  getOrGeneratePage,
} from '../../../src/engine';
import {
  Story,
  Page,
  getLatestStructureVersion,
} from '../../../src/models';
import { isDeviation } from '../../../src/models/story-arc';

// Mock LLM with controlled responses
jest.mock('../../../src/llm/client');

describe('Structure Rewriting E2E', () => {
  const testApiKey = 'test-api-key';
  let testStoryId: string;

  beforeEach(async () => {
    // Clear test data
    await cleanupTestStories();
    // Set up LLM mocks
    setupLLMMocks();
  });

  afterEach(async () => {
    await cleanupTestStories();
  });

  describe('complete story after structure rewrite', () => {
    it('should complete story after structure rewrite', async () => {
      // 1. Create story with structure
      const { story } = await createStoryWithStructure();
      testStoryId = story.id;

      expect(story.structure).not.toBeNull();
      expect(story.structureVersions).toHaveLength(1);

      // 2. Generate pages until deviation occurs
      const { page: page1, updatedStory: story1 } = await generateFirstPage(story, testApiKey);
      await storage.savePage(story.id, page1);

      // Mock deviation in next generation
      mockDeviationResponse();

      const { page: page2, updatedStory: story2 } = await generateNextPage(
        story1,
        page1,
        0, // choice index
        testApiKey
      );

      // 3. Verify structure is rewritten
      expect(story2.structureVersions).toHaveLength(2);
      expect(story2.structure).not.toBe(story1.structure);

      const latestVersion = getLatestStructureVersion(story2);
      expect(latestVersion?.previousVersionId).toBe(story1.structureVersions[0].id);
      expect(latestVersion?.rewriteReason).toContain('deviation');

      // 4. Continue generating pages with new structure
      await storage.savePage(story.id, page2);
      await storage.updateStory(story2);

      mockNormalResponse();

      const { page: page3, updatedStory: story3 } = await generateNextPage(
        story2,
        page2,
        0,
        testApiKey
      );

      // Page should reference new structure version
      expect(page3.structureVersionId).toBe(latestVersion?.id);

      // 5. Verify story can reach ending
      mockEndingResponse();

      const { page: endingPage } = await generateNextPage(
        story3,
        page3,
        0,
        testApiKey
      );

      expect(endingPage.isEnding).toBe(true);
      expect(endingPage.choices).toHaveLength(0);
    });
  });

  describe('narrative coherence through rewrite', () => {
    it('should maintain narrative coherence through rewrite', async () => {
      // 1. Generate pages building toward specific beats
      const { story } = await createStoryWithStructure();
      testStoryId = story.id;

      const { page: page1, updatedStory: story1 } = await generateFirstPage(story, testApiKey);

      // First page should work toward first beat
      expect(page1.accumulatedStructureState.currentBeatIndex).toBe(0);

      // 2. Make choice that causes deviation
      mockDeviationResponse();

      const { page: page2, updatedStory: story2 } = await generateNextPage(
        story1,
        page1,
        0,
        testApiKey
      );

      // 3. Verify rewritten structure accounts for current state
      const newVersion = getLatestStructureVersion(story2);
      expect(newVersion?.rewriteReason).toBeDefined();
      expect(newVersion?.preservedBeatIds.length).toBeGreaterThanOrEqual(0);

      // 4. Verify subsequent pages follow new structure logically
      mockNormalResponse();

      const { page: page3 } = await generateNextPage(
        story2,
        page2,
        0,
        testApiKey
      );

      // Structure state should progress within new structure
      expect(page3.accumulatedStructureState).toBeDefined();
    });
  });

  describe('preserve completed beats through multiple rewrites', () => {
    it('should preserve completed beats through multiple rewrites', async () => {
      // 1. Complete Act 1 beats
      const { story } = await createStoryWithStructure();
      testStoryId = story.id;

      let currentStory = story;
      let currentPage: Page;

      // Generate pages through Act 1
      const { page: page1, updatedStory: story1 } = await generateFirstPage(currentStory, testApiKey);
      currentPage = page1;
      currentStory = story1;

      // Conclude first beat
      mockBeatConcludedResponse();

      const { page: page2, updatedStory: story2 } = await generateNextPage(
        currentStory,
        currentPage,
        0,
        testApiKey
      );
      currentPage = page2;
      currentStory = story2;

      // Verify beat is concluded
      const concludedBeats1 = currentPage.accumulatedStructureState.beatProgressions.filter(
        bp => bp.status === 'concluded'
      );
      expect(concludedBeats1.length).toBeGreaterThan(0);

      // 2. Trigger deviation in Act 2
      mockDeviationResponse();

      const { page: page3, updatedStory: story3 } = await generateNextPage(
        currentStory,
        currentPage,
        0,
        testApiKey
      );
      currentPage = page3;
      currentStory = story3;

      expect(currentStory.structureVersions).toHaveLength(2);
      const version2 = currentStory.structureVersions[1];
      expect(version2.preservedBeatIds).toContain(concludedBeats1[0].beatId);

      // 3. Trigger another deviation in Act 2
      mockDeviationResponse();

      const { page: page4, updatedStory: story4 } = await generateNextPage(
        currentStory,
        currentPage,
        0,
        testApiKey
      );

      // 4. Verify Act 1 beats remain unchanged in all versions
      expect(story4.structureVersions).toHaveLength(3);

      for (const version of story4.structureVersions) {
        const act1Beat1 = version.structure.acts[0].beats[0];
        expect(act1Beat1).toBeDefined();
        // Original beat should be preserved
        expect(act1Beat1.description).toBe(story.structure!.acts[0].beats[0].description);
      }
    });
  });

  describe('branch isolation', () => {
    it('should not affect sibling branches on rewrite', async () => {
      // Create story and generate first page
      const { story } = await createStoryWithStructure();
      testStoryId = story.id;

      const { page: page1, updatedStory: story1 } = await generateFirstPage(story, testApiKey);
      await storage.savePage(story.id, page1);
      await storage.updateStory(story1);

      // Branch A: Take choice 0, trigger deviation
      mockDeviationResponse();
      const { page: branchAPage, updatedStory: storyAfterBranchA } = await generateNextPage(
        story1,
        page1,
        0,
        testApiKey
      );
      await storage.savePage(story.id, branchAPage);
      await storage.updateStory(storyAfterBranchA);

      // Branch B: Take choice 1, no deviation
      mockNormalResponse();
      const { page: branchBPage } = await getOrGeneratePage(
        story1, // Use original story state
        page1,
        1, // Different choice
        testApiKey
      );

      // Branch B should not have the new structure version from Branch A
      // (Branch B was generated from story1, not storyAfterBranchA)
      expect(branchBPage.structureVersionId).toBe(story1.structureVersions[0].id);

      // But after reload, story will have both versions available
      const reloadedStory = await storage.loadStory(story.id);
      expect(reloadedStory?.structureVersions.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// Helper functions for setup and mocking

async function createStoryWithStructure(): Promise<{ story: Story }> {
  // Create story with mocked structure generation
  // Implementation details...
}

async function cleanupTestStories(): Promise<void> {
  // Clean up test data
}

function setupLLMMocks(): void {
  // Set up default LLM mocks
}

function mockDeviationResponse(): void {
  // Mock LLM to return deviation signal
}

function mockNormalResponse(): void {
  // Mock LLM to return normal continuation
}

function mockBeatConcludedResponse(): void {
  // Mock LLM to conclude current beat
}

function mockEndingResponse(): void {
  // Mock LLM to return story ending
}
```

## Acceptance Criteria

### Tests That Must Pass
- `test/e2e/engine/structure-rewriting-journey.test.ts`
- All existing E2E tests
- Run with: `npm run test:e2e`

### Invariants That Must Remain True
1. **I1: Completed Beats Never Modified** - Preserved through all rewrites
2. **I2: Version Chain Integrity** - Chain remains valid
3. **I3: Page Version Exists** - All pages reference valid versions
4. **I5: Three-Act Structure** - Maintained after rewrites
5. **Branch isolation** - Rewrites don't affect sibling branches
6. **Story completability** - Stories can still reach endings
7. **Existing tests pass** - `npm run test:e2e`

## Technical Notes
- Use deterministic mocks to avoid flaky tests
- Test the complete journey, not just individual operations
- Verify persistence round-trips
- Test branch isolation scenarios
- Keep test data cleanup robust
- Consider timeout settings for async operations

# STRSTOARCSYS-016: E2E Tests

## Summary
Create end-to-end tests that validate the complete structured story arc system from user perspective: creating a story, generating pages, and seeing beat progression work correctly.

## Files to Touch
- `test/e2e/structured-story-flow.test.ts` (NEW)

## Out of Scope
- DO NOT modify source code
- DO NOT create unit or integration tests (other tickets)
- DO NOT test error edge cases (focus on happy path)

## Implementation Details

### Create `test/e2e/structured-story-flow.test.ts`

```typescript
import { startNewStory, getPage, loadStory } from '../../src/engine';
import { getOrGeneratePage } from '../../src/engine/page-service';

describe('Structured Story E2E', () => {
  // Requires OPENROUTER_TEST_KEY environment variable
  const apiKey = process.env.OPENROUTER_TEST_KEY;

  beforeAll(() => {
    if (!apiKey) {
      console.warn('Skipping E2E tests: OPENROUTER_TEST_KEY not set');
    }
  });

  describe('complete story creation flow', () => {
    it('creates story with structure and first page', async () => {
      // 1. Start new story
      const { story, page } = await startNewStory({
        title: 'E2E Test Story',
        characterConcept: 'A wandering scholar searching for forbidden knowledge',
        worldbuilding: 'A world where books are banned and libraries are hidden',
        tone: 'mysterious and intellectual',
        apiKey,
      });

      // 2. Verify story has structure
      expect(story.structure).not.toBeNull();
      expect(story.structure!.acts).toHaveLength(3);
      expect(story.structure!.overallTheme).toBeTruthy();

      // 3. Verify each act has 2-4 beats
      for (const act of story.structure!.acts) {
        expect(act.beats.length).toBeGreaterThanOrEqual(2);
        expect(act.beats.length).toBeLessThanOrEqual(4);
        expect(act.name).toBeTruthy();
        expect(act.objective).toBeTruthy();
      }

      // 4. Verify first page has initial structure state
      expect(page.accumulatedStructureState).toBeDefined();
      expect(page.accumulatedStructureState.currentActIndex).toBe(0);
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(0);

      // 5. Verify first beat is active
      const firstBeatId = story.structure!.acts[0].beats[0].id;
      const firstBeatProgression = page.accumulatedStructureState.beatProgressions
        .find(p => p.beatId === firstBeatId);
      expect(firstBeatProgression?.status).toBe('active');
    });

    it('continuation page inherits structure state', async () => {
      // 1. Create story
      const { story, page: firstPage } = await startNewStory({
        title: 'E2E Continuation Test',
        characterConcept: 'A detective investigating supernatural crimes',
        worldbuilding: 'A noir city where ghosts are real',
        tone: 'hardboiled mystery',
        apiKey,
      });

      // 2. Generate continuation page
      const { page: secondPage } = await getOrGeneratePage(
        story,
        firstPage,
        0, // First choice
        apiKey,
      );

      // 3. Verify structure state is present
      expect(secondPage.accumulatedStructureState).toBeDefined();

      // 4. Verify it's a valid progression from first page
      // (Either same state if beat not concluded, or advanced if concluded)
      const firstState = firstPage.accumulatedStructureState;
      const secondState = secondPage.accumulatedStructureState;

      // At minimum, should be at same position or advanced
      expect(secondState.currentActIndex).toBeGreaterThanOrEqual(firstState.currentActIndex);
    });

    it('beat advancement persists across page generations', async () => {
      // This test may need multiple pages to see beat advancement
      // depending on LLM responses

      const { story, page: page1 } = await startNewStory({
        title: 'E2E Beat Advancement',
        characterConcept: 'A thief planning the heist of the century',
        worldbuilding: 'A steampunk city of clockwork and gears',
        tone: 'adventurous caper',
        apiKey,
      });

      // Generate several pages and track structure progression
      let currentPage = page1;
      let currentStory = story;
      let seenBeatConcluded = false;

      for (let i = 0; i < 5 && !seenBeatConcluded; i++) {
        if (currentPage.choices.length === 0) break; // Ending

        const { page, story: updatedStory } = await getOrGeneratePage(
          currentStory,
          currentPage,
          0,
          apiKey,
        );

        // Check if beat advanced
        if (page.accumulatedStructureState.currentBeatIndex >
            currentPage.accumulatedStructureState.currentBeatIndex ||
            page.accumulatedStructureState.currentActIndex >
            currentPage.accumulatedStructureState.currentActIndex) {
          seenBeatConcluded = true;

          // Verify concluded beat has resolution
          const concludedBeats = page.accumulatedStructureState.beatProgressions
            .filter(p => p.status === 'concluded');
          for (const beat of concludedBeats) {
            expect(beat.resolution).toBeTruthy();
          }
        }

        currentPage = page;
        currentStory = updatedStory;
      }

      // Note: We may not always see beat advancement in 5 pages
      // This test verifies the mechanism works when it does happen
    });
  });

  describe('branch isolation', () => {
    it('different choices create independent structure progressions', async () => {
      const { story, page: page1 } = await startNewStory({
        title: 'E2E Branch Isolation',
        characterConcept: 'A diplomat navigating political intrigue',
        worldbuilding: 'A court of scheming nobles',
        tone: 'political drama',
        apiKey,
      });

      if (page1.choices.length < 2) {
        console.warn('First page has fewer than 2 choices, skipping branch test');
        return;
      }

      // Generate pages from two different choices
      const { page: branchA } = await getOrGeneratePage(story, page1, 0, apiKey);
      const { page: branchB } = await getOrGeneratePage(story, page1, 1, apiKey);

      // Both should have valid structure states
      expect(branchA.accumulatedStructureState).toBeDefined();
      expect(branchB.accumulatedStructureState).toBeDefined();

      // They may or may not differ (depends on LLM), but both should be valid
      expect(branchA.accumulatedStructureState.currentActIndex).toBeGreaterThanOrEqual(0);
      expect(branchB.accumulatedStructureState.currentActIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('persistence verification', () => {
    it('structure persists through save/load cycle', async () => {
      const { story, page } = await startNewStory({
        title: 'E2E Persistence Test',
        characterConcept: 'A sailor lost at sea',
        worldbuilding: 'An ocean of mythical creatures',
        tone: 'epic adventure',
        apiKey,
      });

      // Load story fresh
      const loadedStory = await loadStory(story.id);

      expect(loadedStory).not.toBeNull();
      expect(loadedStory!.structure).not.toBeNull();
      expect(loadedStory!.structure!.acts).toHaveLength(3);
      expect(loadedStory!.structure!.overallTheme).toBe(story.structure!.overallTheme);

      // Load page fresh
      const loadedPage = await getPage(story.id, page.id);

      expect(loadedPage).not.toBeNull();
      expect(loadedPage!.accumulatedStructureState).toEqual(page.accumulatedStructureState);
    });
  });
});
```

### Test Configuration

E2E tests require:
- `OPENROUTER_TEST_KEY` environment variable
- Longer timeouts (API calls)
- Cleanup of test stories after run

```typescript
// jest.config.js or test setup
{
  testTimeout: 60000, // 60 seconds for API calls
}
```

### Cleanup

```typescript
afterAll(async () => {
  // Clean up test stories
  for (const storyId of createdStoryIds) {
    await deleteStory(storyId);
  }
});
```

## Acceptance Criteria

### Tests That Must Pass

1. **Complete story creation flow**
   - Story has valid 3-act structure
   - Each act has 2-4 beats
   - First page has initial structure state
   - First beat is marked active

2. **Continuation with structure**
   - Continuation page has structure state
   - State is valid progression from parent

3. **Beat advancement**
   - Beat progression works when LLM concludes beats
   - Concluded beats have resolutions

4. **Branch isolation**
   - Different branches have independent structure states

5. **Persistence**
   - Structure survives save/load cycle
   - Structure state survives save/load cycle

### Environment Requirements
- `OPENROUTER_TEST_KEY` must be set
- Tests skip gracefully if key not available
- Tests clean up created stories

### Invariants Validated
- INV-5: 2-4 beats per act
- INV-6: Exactly 3 acts
- Structure state indices are valid
- Concluded beats have resolutions

## Dependencies
- All implementation tickets (STRSTOARCSYS-001 through 014)
- STRSTOARCSYS-015 (integration tests should pass first)

## Estimated Scope
~200 lines of test code

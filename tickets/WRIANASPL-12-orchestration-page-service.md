# WRIANASPL-12: Wire Two-Call Orchestration into page-service.ts

## Summary

Replace the single `generateContinuationPage()` call in `generateNextPage()` with the two-call writer/analyst pipeline: call `generateWriterPage()`, optionally call `generateAnalystEvaluation()` (only when structure exists), merge results via `mergeWriterAndAnalystResults()`. All downstream code remains untouched.

## Files to Touch

- `src/engine/page-service.ts` — Modify `generateNextPage()` function
- `test/unit/engine/page-service.test.ts` — Update mocks for two-call pattern

## Out of Scope

- Do NOT modify `generateFirstPage()` — it uses `generateOpeningPage()`, not continuation
- Do NOT modify `getOrGeneratePage()` — it delegates to `generateNextPage()`, no changes needed
- Do NOT modify any downstream code: `handleDeviation`, `applyStructureProgression`, `buildContinuationPage`, `updateStoryWithAllCanon`
- Do NOT modify the page builder, canon manager, or storage layer
- Do NOT modify any LLM layer files (those are done in prior tickets)

## Implementation Details

### Import Changes

**Add** imports:
```typescript
import { generateWriterPage, generateAnalystEvaluation, mergeWriterAndAnalystResults } from '../llm';
import type { AnalystResult } from '../llm';
import { logger } from '../logging/index.js';
```

**Remove** from imports: `generateContinuationPage` (no longer used in this file). Leave it exported from `../llm` for backward compat — just stop importing it here.

### `generateNextPage()` Changes

Replace lines 81-102 (the single `generateContinuationPage` call) with:

```typescript
// Writer call (always runs)
const writerResult = await generateWriterPage(
  {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    npcs: story.npcs,
    globalCanon: story.globalCanon,
    globalCharacterCanon: story.globalCharacterCanon,
    structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
    accumulatedStructureState: parentState.structureState,
    previousNarrative: parentPage.narrativeText,
    selectedChoice: choice.text,
    accumulatedInventory: parentState.accumulatedInventory,
    accumulatedHealth: parentState.accumulatedHealth,
    accumulatedCharacterState: parentState.accumulatedCharacterState,
    parentProtagonistAffect: parentPage.protagonistAffect,
    activeState: parentState.accumulatedActiveState,
    grandparentNarrative: grandparentPage?.narrativeText ?? null,
  },
  { apiKey },
);

// Analyst call (only when structure exists)
let analystResult: AnalystResult | null = null;
const activeStructure = currentStructureVersion?.structure ?? story.structure;
if (activeStructure && parentState.structureState) {
  try {
    analystResult = await generateAnalystEvaluation(
      {
        narrative: writerResult.narrative,
        structure: activeStructure,
        accumulatedStructureState: parentState.structureState,
        activeState: parentState.accumulatedActiveState,
      },
      { apiKey },
    );
  } catch (error) {
    // Graceful degradation: log warning, continue without analyst data
    logger.warn('Analyst evaluation failed, continuing with defaults', { error });
  }
}

// Merge into ContinuationGenerationResult
const result = mergeWriterAndAnalystResults(writerResult, analystResult);
```

Everything after `const result = ...` remains **completely unchanged**: deviation handling, structure progression, page building, canon update, storage.

### Test Updates

The test file `test/unit/engine/page-service.test.ts` currently mocks `generateContinuationPage`. This must be updated to mock `generateWriterPage` and `generateAnalystEvaluation` instead.

Key mock changes:
- Replace `mockedGenerateContinuationPage` with `mockedGenerateWriterPage` + `mockedGenerateAnalystEvaluation`
- `mockedGenerateWriterPage` returns a `WriterResult` (no deviation/beat fields)
- `mockedGenerateAnalystEvaluation` returns an `AnalystResult` or `null`
- For stories without structure: `mockedGenerateAnalystEvaluation` should NOT be called
- For analyst failure: `mockedGenerateAnalystEvaluation` rejects, but `generateNextPage` still succeeds with defaults
- Also mock `mergeWriterAndAnalystResults` OR let it run for real (it's a pure function) — letting it run real is simpler

New test cases to add:
- **Analyst skipped when no structure**: Verify `generateAnalystEvaluation` is not called when `story.structure` is null/undefined
- **Analyst failure graceful degradation**: Mock analyst to throw, verify page is still generated with default beat/deviation values
- **Beat progression from analyst**: Mock analyst returning `beatConcluded: true`, verify structure progression is applied
- **Deviation from analyst**: Mock analyst returning deviation, verify deviation handling triggers

## Acceptance Criteria

### Tests that must pass

- `test/unit/engine/page-service.test.ts` — All updated tests pass:
  - Writer call is always made with correct context
  - Analyst call is made when structure exists
  - Analyst call is skipped when no structure
  - Analyst failure doesn't prevent page generation
  - Merged result drives downstream deviation handling
  - Merged result drives downstream structure progression
  - Page is built correctly from merged result
  - Canon facts from writer result are applied
- All other tests in `test/unit/engine/` still pass

### Invariants that must remain true

- `generateFirstPage()` is unchanged
- `getOrGeneratePage()` is unchanged (it just calls `generateNextPage`)
- All downstream processing (deviation handler, structure progression, page builder, canon manager, storage) is unchanged
- `generateContinuationPage()` still exists in `client.ts` (deprecated, not removed)
- Pages generated via the two-call pipeline produce the exact same `ContinuationGenerationResult` shape as the single-call pipeline
- `npm run typecheck` passes
- `npm run build` passes
- `npm run test:unit` passes

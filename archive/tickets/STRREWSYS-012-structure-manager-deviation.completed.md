# STRREWSYS-012: Update Structure Manager for Deviation Support

## Status
Completed (2026-02-07)

## Summary
Add deviation-support helper functions to `structure-manager` so downstream rewrite work can consume completed-beat and preservation context without changing existing progression APIs.

## Dependencies
- STRREWSYS-005 (deviation types)
- STRREWSYS-006 (StructureRewriteContext, CompletedBeat types)

## Reassessed Assumptions
1. `src/engine/structure-manager.ts` currently contains only baseline structure progression helpers and does not yet expose deviation-support helpers.
2. `src/engine/structure-rewriter.ts` does not exist yet on this branch; this ticket must not depend on it.
3. `src/llm/types.ts` currently defines `CompletedBeat` with a required `beatId` field; helpers must populate it.
4. Existing `structure-manager` unit tests cover only progression behavior and need additive helper coverage.

## Scope Update
- Keep this ticket strictly additive in `structure-manager` and its unit tests.
- Preserve existing exported progression APIs (`createStoryStructure`, `createInitialStructureState`, `advanceStructureState`, `applyStructureProgression`).
- Do not implement rewrite orchestration or page-service integration here.

## Files to Touch

### Modified Files
- `src/engine/structure-manager.ts`
- `test/unit/engine/structure-manager.test.ts`

## Out of Scope
- Do NOT implement the actual structure rewriting (handled in STRREWSYS-013)
- Do NOT modify page-service.ts (handled in STRREWSYS-011)
- Do NOT modify LLM prompts or parsing

## Implementation Details

### `src/engine/structure-manager.ts` Additions

Added imports for `BeatDeviation`, rewrite-context types, `Story`, and `VersionedStoryStructure`.

Added helper exports:
- `extractCompletedBeats(structure, structureState)`: reads concluded progressions, parses hierarchical beat IDs (`X.Y`), resolves source beats, includes `beatId` and `resolution`, warns and skips invalid/missing beats, and returns beat-sorted output.
- `buildRewriteContext(story, structureVersion, structureState, deviation)`: composes `StructureRewriteContext` from story fields, current structure position, completed beats, deviation reason/summary, and original theme.
- `getPreservedBeatIds(structureState)`: returns concluded beat IDs only.
- `validatePreservedBeats(originalStructure, newStructure, structureState)`: validates every concluded beat ID maps to an unchanged beat (description + objective) in the same act/beat index; fails on invalid beat IDs or missing beats.

### `test/unit/engine/structure-manager.test.ts` Updates

```typescript
describe('extractCompletedBeats', () => {
  it('should return empty array when no beats concluded');
  it('should return all concluded beats with resolutions');
  it('should preserve beat order by ID');
  it('should include act and beat indices');
  it('should handle missing beats gracefully');
  it('should exclude pending and active beats');
});

describe('buildRewriteContext', () => {
  it('should include all story fields');
  it('should include completed beats from state');
  it('should include deviation reason and summary');
  it('should include original theme');
  it('should include current act/beat indices');
});

describe('getPreservedBeatIds', () => {
  it('should return IDs of concluded beats only');
  it('should return empty array when no concluded beats');
  it('should exclude active and pending beats');
});

describe('validatePreservedBeats', () => {
  it('should return true when all completed beats preserved');
  it('should return false when completed beat is missing');
  it('should return false when completed beat description changed');
  it('should return false when completed beat objective changed');
  it('should return true when new beats added after preserved');
  it('should handle empty completed beats');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/engine/structure-manager.test.ts`
- Run with: `npm test -- test/unit/engine/structure-manager.test.ts`

### Invariants That Must Remain True
1. **I1: Completed Beats Never Modified** - `validatePreservedBeats` enforces this
2. **Beat ordering** - Extracted beats are in chronological order
3. **Complete context** - Rewrite context has all fields needed for regeneration
4. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- These are helper functions used by page-service and structure-rewriter
- Beat ID format "X.Y" is parsed to get act/beat indices
- Validation is a safeguard, not enforcement (caller decides action)
- Console warnings for missing beats aid debugging without crashing

## Outcome
- **Originally planned:** Add deviation-support helper functions and companion unit tests in `structure-manager`.
- **Actually changed:** Added `extractCompletedBeats`, `buildRewriteContext`, `getPreservedBeatIds`, and `validatePreservedBeats` in `src/engine/structure-manager.ts` while preserving existing progression APIs and behavior.
- **Test hardening added:** Extended `test/unit/engine/structure-manager.test.ts` with helper-focused suites plus an additional invalid beat-ID invariant test for preservation validation.

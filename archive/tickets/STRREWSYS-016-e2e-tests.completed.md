# STRREWSYS-016: Create E2E Tests for Structure Rewriting Journey

## Status
Completed (2026-02-07)

## Summary
Add end-to-end coverage for the structure rewriting journey through the public `storyEngine` API, with deterministic mocks for continuation generation and rewrite generation.

## Dependencies
- STRREWSYS-001 through STRREWSYS-015

## Reassessed Assumptions (Discrepancies Corrected)
- The prior ticket draft used non-existent engine APIs (`createStory` from `src/engine`, direct `generateFirstPage`/`generateNextPage` E2E flow, and placeholder helpers). Actual E2E entrypoint is `storyEngine.startStory()` / `storyEngine.makeChoice()`.
- Existing integration coverage (`test/integration/engine/story-engine.test.ts`) already verifies core deviation-triggered rewrite mechanics; E2E should validate full journey behavior and persistence/replay at engine boundary, not duplicate lower-level tests.
- Rewrite generation in production goes through `fetch` in `structure-rewriter`; E2E tests must mock `global.fetch` to keep runs deterministic and offline.
- The overview marks multi-branch structure divergence as a non-goal; this ticket should not require branch-specific rewrite lineage behavior that conflicts with the current linear `structureVersions` model.

## Updated Scope
### Files to Touch
- `test/e2e/engine/structure-rewriting-journey.test.ts` (NEW)

### Out of Scope
- Performance benchmarks (STRREWSYS-017)
- Route/UI rendering checks
- Introducing branch-divergent structure lineage behavior
- Breaking API changes

## Acceptance Criteria
- `npm run test:e2e` passes.
- E2E coverage demonstrates:
1. Rewrite-triggered story journey reaches completion with deterministic mocks.
2. Rewrite creates a valid version chain (`previousVersionId`, `createdAtPageId`, `rewriteReason`, `preservedBeatIds`).
3. Generated pages reference expected structure versions across the journey.
4. Replayed choices reuse generated pages (no duplicate generation) and survive engine reload.

## Outcome
### What changed vs originally planned
- Replaced outdated assumptions and non-compilable sketch code with current API-aligned scope.
- Added `test/e2e/engine/structure-rewriting-journey.test.ts` with focused scenarios:
1. Full rewrite-aware playthrough to completion with lineage assertions.
2. Replay/reload verification for rewritten pages and persisted structure versions.
- No production source changes were required; behavior is validated through E2E tests.

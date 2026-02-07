# STRSTOARCSYS-015: Integration Tests

## Status
Completed

## Summary
Expand existing integration coverage for the structured story arc system, focusing on end-to-end engine progression behavior and persistence guarantees.

## Reassessed Assumptions (2026-02-07)
- Structured-story implementation tickets are already in the codebase (`src/models/story-arc.ts`, structure manager, story/page services, persistence, and schemas).
- Integration tests already exist and are passing in:
  - `test/integration/engine/story-engine.test.ts`
  - `test/integration/persistence/story-repository.test.ts`
  - `test/integration/persistence/page-repository.test.ts`
- Creating new files `test/integration/engine/structure-flow.test.ts` and `test/integration/persistence/story-structure.test.ts` is unnecessary duplication.
- The correct scope is to add missing structure-flow and structure-persistence assertions to existing integration suites.

## Updated Scope
### Files to Touch
- `test/integration/engine/story-engine.test.ts` (MODIFY)
- `test/integration/persistence/page-repository.test.ts` (MODIFY)
- `test/integration/persistence/story-repository.test.ts` (optional, only if gap found)

### Out of Scope
- Source/runtime behavior changes unless a test exposes a real defect.
- New E2E tests (covered by STRSTOARCSYS-016).
- New duplicate integration files that overlap current suites.

## Implementation Plan
1. Strengthen `story-engine` integration tests to verify structure initialization and progression behavior:
- Story is created with a 3-act structure and hierarchical beat IDs.
- First page uses initial structure state (`1.1` active).
- `beatConcluded: true` advances progression and stores resolution.
- `beatConcluded: false` preserves parent progression.
- Branches diverge independently in `accumulatedStructureState`.

2. Strengthen persistence integration tests for structure-state branch divergence:
- Distinct sibling pages persist distinct structure states.
- Reloaded pages preserve concluded beat resolutions and active beat index per branch.

## Acceptance Criteria
- `npm run test:integration` passes.
- Added assertions verify key invariants in integration context:
  - INV-1/INV-2: current indices are valid for the structure.
  - INV-3: active/concluded status is coherent around current beat.
  - INV-4: concluded beats include non-empty resolution.
  - INV-6/INV-7: generated structure is 3-act with unique hierarchical beat IDs.
- No unnecessary source code changes.

## Dependencies
- STRSTOARCSYS-001 through STRSTOARCSYS-014
- STRSTOARCSYS-017 (mock updates)

## Outcome
### What changed vs originally planned
- Planned: create two new integration files dedicated to structure flow and structure persistence.
- Actual: updated existing integration suites to avoid duplication and align with current repository structure.
- Added coverage in `test/integration/engine/story-engine.test.ts` for:
  - initial structure state on first page,
  - beat conclusion progression (including stored resolution),
  - act advancement when concluding the final beat of an act,
  - branch-isolated structure progression.
- Added coverage in `test/integration/persistence/page-repository.test.ts` for:
  - persistence of branch-divergent `accumulatedStructureState` across sibling pages.
- No source/runtime files were changed; only integration tests and this ticket were updated.

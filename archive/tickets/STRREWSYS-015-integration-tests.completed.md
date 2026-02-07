# STRREWSYS-015: Create Integration Tests for Structure Rewriting

## Status
Completed (2026-02-07)

## Summary
Add or strengthen integration coverage for structure rewriting behavior using the existing integration suites.

## Reassessed Assumptions (Discrepancies Corrected)
- Existing integration coverage lives in established suites (especially `test/integration/engine/story-engine.test.ts` and persistence integration tests). Creating a brand-new integration file is unnecessary unless coverage gaps cannot be cleanly added to existing suites.
- The prior ticket sketch included non-compilable stubs (`/* ... */`) and example signatures that do not match current code organization.
- Current code places `extractCompletedBeats`, `buildRewriteContext`, and `validatePreservedBeats` in `src/engine/structure-manager.ts`; `mergePreservedWithRegenerated` is in `src/engine/structure-rewriter.ts`.
- `createStructureRewriter` in current implementation uses the default rewrite generator path and does not require wiring through `src/llm/client` in integration tests.
- Rewrite flow in integration tests must avoid real API calls by mocking external LLM/fetch behavior.

## Updated Scope
### Files to Touch
- `test/integration/engine/story-engine.test.ts` (MODIFY)
- `test/integration/persistence/story-repository.test.ts` (MODIFY only if a persistence gap exists)

### Out of Scope
- New E2E tests (STRREWSYS-016)
- New performance tests (STRREWSYS-017)
- Route/UI tests
- Production source changes unless a real defect is exposed by integration tests

## Implementation Plan
1. Extend `story-engine` integration tests with a deviation-triggered rewrite scenario that verifies:
- rewrite path executes with mocked upstream calls,
- a new structure version is created and chained to the previous version,
- generated page references the active rewritten structure version.

2. Strengthen persistence integration to verify `structureVersions` lineage fields survive save/load when versions are present.

3. Run integration suite and keep changes minimal/surgical.

## Acceptance Criteria
- `npm run test:integration` passes.
- Integration coverage explicitly checks:
1. **I2: Structure Versions Form Linear Chain**
2. **I3: Page Structure Version Exists**
3. **I5: Three-Act Structure Maintained** (via existing generation/rewrite flow assertions where applicable)
- No unnecessary production-code/API changes.

## Dependencies
- STRREWSYS-001 through STRREWSYS-014

## Outcome
### What changed vs originally planned
- Planned in earlier draft: create a new dedicated `test/integration/engine/structure-rewriting.test.ts`.
- Actual: added targeted coverage to existing integration suites to match repository conventions and avoid duplicate harness setup.
- Added rewrite-flow integration assertions in `test/integration/engine/story-engine.test.ts`:
1. Deviation-triggered rewrite creates a new structure version.
2. New version forms a linear chain via `previousVersionId`.
3. Generated page references the rewritten `structureVersionId`.
- Added persistence lineage assertions in `test/integration/persistence/story-repository.test.ts`:
1. `structureVersions` round-trip with preserved `previousVersionId`, `createdAtPageId`, `rewriteReason`, and `preservedBeatIds`.
- No production code changes were needed; integration tests passed with existing runtime behavior.

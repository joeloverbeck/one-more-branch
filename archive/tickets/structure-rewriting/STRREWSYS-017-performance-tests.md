# STRREWSYS-017: Create Performance Tests for Structure Rewriting

## Summary
Create performance-oriented tests for structure rewriting operations, focused on in-process behavior and local persistence overhead.

## Status
Completed

## Dependencies
- STRREWSYS-001 through STRREWSYS-016 implemented

## Reassessed Assumptions
- Tests must match current APIs:
  - `createRewrittenVersionedStructure(..., createdAtPageId)` requires a branded `PageId` (use `parsePageId`), not a raw number.
  - `extractCompletedBeats` and `buildRewriteContext` live in `src/engine/structure-manager.ts`.
  - `mergePreservedWithRegenerated` lives in `src/engine/structure-rewriter.ts`.
- CI and local timing vary, so fixed micro-thresholds are brittle. The suite should use conservative thresholds and scaling checks.
- Persistence performance tests must isolate filesystem effects using a temporary directory and isolated module loading.

## Files to Touch
### New Files
- `test/performance/engine/structure-rewriting.test.ts`

## Out of Scope
- Actual LLM API/network performance
- Multi-user load/perf benchmarking
- End-to-end latency across external services

## Updated Scope
- Add one performance suite under `test/performance/engine/`.
- Validate repeated-call performance for:
  - structure version ID/version creation,
  - version lookup with many versions,
  - completed-beat extraction and rewrite-context building,
  - preserved/regenerated merge,
  - story save/load with many structure versions.
- Keep assertions deterministic and tolerant to machine variance.

## Acceptance Criteria
### Tests That Must Pass
- `test/performance/engine/structure-rewriting.test.ts`
- `npm run test:performance`

### Performance Requirements
| Operation | Requirement |
|-----------|-------------|
| `createStructureVersionId` | Low average latency across repeated calls (sub-millisecond target, conservative upper bound) |
| `createInitialVersionedStructure` | Repeated creation remains fast with conservative bound |
| `createRewrittenVersionedStructure` | Repeated creation remains fast with conservative bound |
| `getStructureVersion` | Lookup remains efficient with 15+ versions |
| `getLatestStructureVersion` | Constant-time-like behavior with 15+ versions |
| `extractCompletedBeats` | Repeated extraction remains low-latency and deterministic |
| `buildRewriteContext` | Repeated context build remains low-latency and deterministic |
| `mergePreservedWithRegenerated` | Repeated merge remains bounded and returns valid 3-act shape |
| `saveStory`/`loadStory` for 10 versions | Completes in reasonable local FS time and preserves data |

### Invariants
1. Performance does not regress pathologically as version count grows.
2. Correctness is preserved under repeated operations.
3. Test data is cleaned up after persistence checks.

## Technical Notes
- Use `performance.now()` for timing.
- Warm up hot paths before measuring where useful.
- Use temporary working directories for persistence checks.
- Keep all tests free of network/LLM API calls.

## Outcome
- Updated this ticket to match actual codebase APIs and realistic CI-stable performance assumptions.
- Implemented `test/performance/engine/structure-rewriting.test.ts` with bounded and scaling-oriented checks.
- Kept production code and public APIs unchanged; only added the new performance tests and archive moves.

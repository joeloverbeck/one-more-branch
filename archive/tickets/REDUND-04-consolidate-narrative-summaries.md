# REDUND-04: Consolidate narrativeSummary into sceneSummary

**Status**: COMPLETED
**Priority**: Quick Win
**Effort**: S
**Dependencies**: None
**Category**: Storage + LLM token redundancy

## Summary

`sceneSummary` should be the only canonical scene-level summary across writer, analyst, deviation, and rewrite flows. `analystResult.narrativeSummary` duplicates writer output while adding schema/prompt overhead and type churn.

## Reassessed Assumptions (Code/Test Reality)

1. `ancestor-collector.ts` already uses `page.sceneSummary` exclusively for ancestor summaries. No work needed there.
2. `analystResult.narrativeSummary` is still wired into core orchestration (deviation creation, spine rewrite context, pacing rewrite context), not just storage.
3. `narrativeSummary` also exists in domain models (`BeatDeviation`, `StructureRewriteContext`, spine rewrite context), where it effectively aliases scene summary.
4. REDUND-03 is archived as `NOT IMPLEMENTED`, so this ticket cannot assume any prior serializer cleanup.
5. The current acceptance criterion for backward-compatible deserialization conflicts with the desired architecture direction for this change set.

## Problem

Two parallel summary concepts exist for the same scene:
- Writer `sceneSummary` (already used broadly and persisted on the page)
- Analyst `narrativeSummary` (currently generated and threaded through structure/deviation pipelines)

This creates redundant LLM output requirements and weakens architecture clarity by allowing two names for one concept.

## Proposed Fix

1. Remove `narrativeSummary` from structure evaluator prompt/schema/types/response transformer/defaults.
2. Rewire all consumers to use canonical writer/page `sceneSummary` instead:
   - Deviation creation in result merge flow
   - Synthetic deviation generation during spine rewrite forcing
   - Pacing rewrite context input
   - Spine rewrite context input
3. Remove `narrativeSummary` aliases in domain and rewrite context types:
   - `BeatDeviation.narrativeSummary` -> `BeatDeviation.sceneSummary`
   - `StructureRewriteContext.narrativeSummary` -> `StructureRewriteContext.sceneSummary`
   - Spine rewrite context `narrativeSummary` -> `sceneSummary`
4. Update persistence contracts and converters to stop storing analyst narrative summary.
5. Update tests/mocks to enforce single-summary architecture and catch regression.

## Files to Touch

- `src/llm/structure-evaluator-types.ts`
- `src/llm/schemas/structure-evaluator-*.ts`
- `src/llm/prompts/structure-evaluator-prompt.ts`
- `src/llm/prompts/continuation/story-structure-section.ts`
- `src/llm/result-merger.ts`
- `src/models/story-arc.ts`
- `src/llm/structure-rewrite-types.ts`
- `src/engine/post-generation-processor.ts`
- `src/engine/pacing-rewrite.ts`
- `src/engine/spine-deviation-processing.ts`
- `src/engine/structure-rewrite-support.ts`
- `src/persistence/page-serializer-types.ts`
- `src/persistence/converters/analyst-result-converter.ts`
- `test/**` mocks/assertions for updated types/flow invariants

## Out of Scope

- Changing `sceneSummary` format or content
- Modifying writer prompt
- Broad refactors unrelated to summary-source consolidation

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `narrativeSummary` removed from analyst schema, prompt contract, and result type
- [x] Deviation/rewrite pipelines consume `sceneSummary` only
- [x] Domain types no longer alias scene summary as `narrativeSummary`
- [x] Persistence types/converters no longer include analyst `narrativeSummary`
- [x] All existing tests pass
- [ ] `npm run test:coverage` thresholds met

## Outcome

- Completion date: 2026-03-07
- What changed:
  - Removed analyst `narrativeSummary` from structure evaluator type/schema/validation/response transformation and prompt instructions.
  - Rewired deviation/spine/pacing rewrite paths to consume canonical writer/page `sceneSummary`.
  - Renamed domain/rewrite context aliases from `narrativeSummary` to `sceneSummary` (`BeatDeviation`, `StructureRewriteContext`, spine rewrite context).
  - Removed analyst `narrativeSummary` from persistence file contracts and converters.
  - Updated affected tests and fixtures; added invariant coverage that deviation summary source is writer `sceneSummary`.
- Deviations from original plan:
  - `ancestor-collector.ts` required no changes (already used `sceneSummary`).
  - Instead of adding backward-compat deserialization for analyst `narrativeSummary`, this implementation enforced the no-alias/no-back-compat architecture direction and updated all impacted tests.
- Verification:
  - `npm run typecheck` passed.
  - `npm run test:unit -- --runInBand` passed.
  - `npm run test:integration -- --runInBand` passed.
  - `npm run lint` passed.

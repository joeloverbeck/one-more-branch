# REDUND-04: Consolidate narrativeSummary into sceneSummary

**Priority**: Quick Win
**Effort**: S
**Dependencies**: REDUND-03 (strip analyst diagnostics)
**Category**: Storage + LLM token redundancy

## Summary

Both `Page.sceneSummary` (from writer) and `Page.analystResult.narrativeSummary` (from analyst) are summaries of the same scene. The analyst's version adds no unique structural insight. Consolidate into `sceneSummary` only.

## Problem

Two separate LLM stages independently summarize the same narrative:
- **Writer** produces `sceneSummary` (2-3 sentences, ~500 chars)
- **Structure Evaluator** produces `narrativeSummary` (~200 chars)

Both are used in `ancestor-collector.ts` for building ancestor context. The writer's version is more detailed and used more broadly (recap collector, continuation context). The analyst's version is redundant.

## Proposed Fix

1. Update `ancestor-collector.ts` to use `sceneSummary` instead of `analystResult.narrativeSummary`
2. Remove `narrativeSummary` from `StructureEvaluatorResult` type
3. Remove `narrativeSummary` from the analyst LLM output schema
4. Remove the instruction in the analyst prompt that asks for a narrative summary
5. Strip from serialization (covered by REDUND-03 if done first, otherwise add here)

**Important**: Unlike REDUND-03, this ticket also removes the field from the LLM schema. The analyst does not need to generate a summary to reason well — its chain-of-thought is driven by beat analysis, deviation detection, and pacing evaluation, not by summarization.

## Files to Touch

- `src/engine/ancestor-collector.ts` — use `sceneSummary` where `narrativeSummary` was used
- `src/llm/structure-evaluator-types.ts` — remove `narrativeSummary` from result type
- `src/llm/schemas/` — remove `narrativeSummary` from analyst output schema
- `src/llm/prompts/` — remove narrative summary instruction from analyst prompt
- `src/persistence/page-serializer.ts` — backward-compat: ignore on read
- `test/` — update mocks and assertions

## Out of Scope

- Changing `sceneSummary` format or content
- Modifying writer prompt

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] `narrativeSummary` removed from analyst schema and result type
- [ ] `ancestor-collector.ts` uses `sceneSummary` exclusively
- [ ] Old page files with `narrativeSummary` still deserialize without error
- [ ] All existing tests pass
- [ ] `npm run test:coverage` thresholds met

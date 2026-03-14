# STOARCGEN-012: Pipeline Orchestration — Wire 3-Call Pipeline

**Status**: TODO
**Depends on**: STOARCGEN-009, STOARCGEN-010, STOARCGEN-011
**Blocks**: STOARCGEN-013

## Summary

Replace the current single-call `generateStoryStructure()` in `structure-generator.ts` with the 3-call pipeline: Macro Architecture (Call 1) → Milestone Generator (Call 2) → Structure Validator (Call 3). Update `story-service.ts` to use the new pipeline and add progress stage reporting.

## Files to Touch

- `src/llm/structure-generator.ts` — Rewrite to orchestrate 3-call pipeline
- `src/engine/story-service.ts` — Update structure generation call (if interface changes)
- `src/server/services/generation-progress-service.ts` — Add new progress stages
- `public/js/src/01-constants.js` — Add new stage display names/phrases (if stage names are enumerated client-side)
- `public/js/src/00-stage-metadata.js` — Add new stage metadata
- Run `node scripts/concat-client-js.js` to regenerate `app.js`

## Detailed Changes

### `structure-generator.ts` rewrite

Replace `generateStoryStructure()` internals:

```typescript
export async function generateStoryStructure(
  context: StructureContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<StructureGenerationResult> {
  // Call 1: Macro Architecture
  const macroResult = await generateMacroArchitecture(context, apiKey, options);

  // Call 2: Milestone Generation
  const milestoneResult = await generateMilestones(macroResult, context, apiKey, options);

  // Call 3: Validate + Repair
  const validated = await validateAndRepair(macroResult, milestoneResult, context, apiKey, options);

  // Merge into final StructureGenerationResult
  return mergeToStructureResult(macroResult, validated);
}
```

The public interface (`StructureGenerationResult`) stays the same — downstream consumers don't need to know about the internal 3-call split.

### Progress stages

Add new granular stages for the spinner UI:
- `DESIGNING_ARCHITECTURE` — Call 1 in progress
- `GENERATING_MILESTONES` — Call 2 in progress
- `VALIDATING_STRUCTURE` — Call 3 in progress

These replace (or subdivide) the existing `STRUCTURING_STORY` stage.

### Merge function

`mergeToStructureResult()` combines:
- `MacroArchitectureResult` fields → top-level `StructureGenerationResult` fields
- `MacroAct` fields → `GeneratedAct` fields (actQuestion, exitReversal, etc.)
- Validated milestones → `GeneratedAct.milestones`
- `anchorMoments` → `StructureGenerationResult.anchorMoments`
- Raw responses concatenated or structured

### Existing validation helpers

Keep the existing `countUniqueSetpieceIndices()` and `collectTaggedObligations()` helpers — they now operate on the merged result (same as before, but reading `milestones` instead of `beats`).

## Out of Scope

- Prompt content (already done in STOARCGEN-009, STOARCGEN-010)
- Validator implementation (already done in STOARCGEN-011)
- Rewrite pipeline (STOARCGEN-013)
- Downstream consumer changes (STOARCGEN-014)

## Acceptance Criteria

### Tests that must pass
- New test: `test/integration/llm/structure-generation-pipeline.test.ts` — Full 3-call pipeline with mocked LLM responses for each call
- New test: Pipeline handles Call 1 failure gracefully (throws LLMError)
- New test: Pipeline handles Call 2 failure gracefully
- New test: Pipeline handles validation failure with repair
- Existing test: `test/integration/engine/structure-modules.test.ts` passes (may need mock updates)
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- `generateStoryStructure()` public signature unchanged
- `StructureGenerationResult` output shape unchanged (plus new fields)
- Retry and model fallback behavior preserved (each call uses `withRetry` + `withModelFallback`)
- Prompt logging preserved for each call
- Progress stages reported at each pipeline step
- Existing story creation flow works end-to-end
- Error in any call propagates correctly (no silent swallowing)

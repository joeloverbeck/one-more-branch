# STOARCGEN-007: Test Files Rename — beat to milestone

**Status**: TODO
**Depends on**: STOARCGEN-001 through STOARCGEN-006
**Blocks**: None (final rename ticket)

## Summary

Update all test files to use `milestone` terminology. This includes mock objects, test descriptions, variable names, import paths, and file renames. This ticket comes last in the rename chain because tests must align with the already-renamed source files.

## Files to Touch

### File renames
- `test/unit/engine/beat-alignment-skip.test.ts` → `test/unit/engine/milestone-alignment-skip.test.ts`
- `test/unit/engine/beat-utils.test.ts` → `test/unit/engine/milestone-utils.test.ts`

### Content updates (rename beat refs)

**Unit tests:**
- `test/unit/models/story-arc.test.ts`
- `test/unit/engine/structure-state.test.ts`
- `test/unit/engine/structure-rewriter.test.ts`
- `test/unit/engine/structure-rewriter-model-selection.test.ts`
- `test/unit/engine/structure-rewrite-support.test.ts`
- `test/unit/engine/page-service.test.ts`
- `test/unit/engine/page-builder.test.ts`
- `test/unit/engine/state-lifecycle.test.ts`
- `test/unit/engine/continuation-context-builder.test.ts`
- `test/unit/engine/deviation-handler.test.ts`
- `test/unit/engine/ancestor-collector.test.ts`
- `test/unit/engine/pacing-rewrite.test.ts`
- `test/unit/llm/types.test.ts`
- `test/unit/llm/result-merger.test.ts`
- `test/unit/llm/prompts.test.ts`
- `test/unit/llm/prompts/choice-generator-prompt.test.ts`
- `test/unit/llm/prompts/continuation-prompt.test.ts`
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
- `test/unit/llm/prompts/continuation/story-structure-section.test.ts`
- `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts`
- `test/unit/llm/prompts/continuation/writer-structure-context.test.ts`
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- `test/unit/llm/schemas/writer-schema.test.ts`
- `test/unit/persistence/page-serializer.test.ts`
- `test/unit/persistence/page-repository.test.ts`
- `test/unit/server/routes/play.test.ts`
- `test/unit/server/utils/page-panel-data.test.ts`
- `test/unit/server/utils/view-helpers.test.ts`
- `test/unit/models/page.test.ts`

**Integration tests:**
- `test/integration/engine/page-service.test.ts`
- `test/integration/engine/story-engine.test.ts`
- `test/integration/engine/page-builder-pipeline.test.ts`
- `test/integration/engine/continuation-post-processing.test.ts`
- `test/integration/engine/structure-modules.test.ts`
- `test/integration/persistence/page-repository.test.ts`
- `test/integration/persistence/page-serializer-converters.test.ts`

**E2E tests:**
- `test/e2e/engine/structure-rewriting-journey.test.ts`
- `test/e2e/engine/structured-story-flow.test.ts`

**Performance tests:**
- `test/performance/engine/structure-rewriting.test.ts`

**Fixtures:**
- `test/fixtures/llm-results.ts`

## Detailed Changes

For each test file:
1. Update imports to use new type/function names
2. Update mock objects: `beats` → `milestones`, `beatId` → `milestoneId`, `currentBeatIndex` → `currentMilestoneIndex`, etc.
3. Update `describe`/`it` block descriptions where they reference "beat"
4. Update local variable names
5. Update assertions referencing renamed fields

## Out of Scope

- Source code changes (already done in STOARCGEN-001 through STOARCGEN-006)
- New test cases for new features (covered by STOARCGEN-008 through STOARCGEN-015)
- Changing test logic — only names change

## Acceptance Criteria

### Tests that must pass
- `npm test` — All existing tests pass with renamed references
- `npm run test:unit` passes
- `npm run test:integration` passes
- `npm run test:e2e` passes
- `npm run test:performance` passes
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Same number of test cases before and after
- Same test coverage percentages (within margin of error)
- No test logic changes — only names
- All mock shapes match the renamed source types exactly

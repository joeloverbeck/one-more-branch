# STRREWSYS-013: Implement Structure Rewriter Core

## Status
Completed (2026-02-07)

## Summary
Implement a structure-rewriter module that orchestrates structure regeneration using the rewrite prompt and merges regenerated structure with preserved completed beats.

## Dependencies
- STRREWSYS-006 (rewrite context/result types)
- STRREWSYS-012 (completed-beat extraction/rewrite-context helpers)
- STRREWSYS-014 (structure rewrite prompt)

## Reassessed Assumptions
1. `src/engine/structure-rewriter.ts` and `test/unit/engine/structure-rewriter.test.ts` do not exist yet.
2. There is no exported `LLMClient` interface in `src/llm/client.ts`; orchestration must use a local injected adapter type.
3. `buildStructureRewritePrompt(...)` returns `ChatMessage[]` (system + user), not a raw string prompt.
4. Existing structure parsing logic in `src/llm/structure-generator.ts` is private and JSON-oriented; this ticket must either implement minimal rewrite-response parsing or use an injected adapter that returns already-parsed structure-generation data.
5. `CompletedBeat` requires `beatId` and tests must include it.

## Scope Update
- Keep this ticket focused on a minimal engine-level orchestrator and merge helper.
- Preserve current public APIs; only additive exports are allowed.
- Avoid changing page-service integration here (handled by later integration work).
- Add focused unit tests for orchestration and merge invariants.

## Files to Touch

### New Files
- `src/engine/structure-rewriter.ts`
- `test/unit/engine/structure-rewriter.test.ts`

### Modified Files
- `src/engine/index.ts` (add exports)

## Out of Scope
- Do NOT modify `src/engine/page-service.ts`
- Do NOT modify persistence/repository layers
- Do NOT introduce breaking API changes in models or llm public contracts

## Implementation Details

### `src/engine/structure-rewriter.ts`
- Add `StructureRewriter` interface with:
  - `rewriteStructure(context, apiKey): Promise<StructureRewriteResult>`
- Add `createStructureRewriter(...)` factory with injectable generation dependency for testability.
- Build rewrite prompt via `buildStructureRewritePrompt(context)` before generation.
- Parse/normalize regenerated structure data into `StoryStructure` using existing `createStoryStructure(...)` pathway.
- Merge preserved beats and regenerated structure via `mergePreservedWithRegenerated(...)`.
- Return merged structure, preserved beat IDs, and raw response.

### Merge behavior requirements
- Preserve completed beats unchanged at their original `beatId` positions.
- Keep exactly 3 acts in the merged structure.
- Ensure beat IDs are hierarchical and sequential per act (`X.Y`).
- Keep `overallTheme` anchored to original theme.

### `src/engine/index.ts`
Add additive exports for:
- `StructureRewriter`
- `createStructureRewriter`
- `mergePreservedWithRegenerated`

### `test/unit/engine/structure-rewriter.test.ts`
Cover:
- rewrite orchestration calls injected generator with prompt-derived messages
- preserved beat IDs are returned from `completedBeats`
- merged structure preserves completed beat text/objective
- merged output has 3 acts and hierarchical beat IDs
- overall theme remains the original theme

## Acceptance Criteria

### Tests That Must Pass
- `npm test -- test/unit/engine/structure-rewriter.test.ts`
- `npm run test:unit`

### Invariants That Must Remain True
1. **I1: Completed Beats Never Modified**
2. **I5: Three-Act Structure Maintained**
3. **I6: Beat Count remains valid for merged outputs used in tests**
4. **I7: Hierarchical Beat IDs**
5. Existing unit suite remains green

## Technical Notes
- Prefer small pure helpers and injected dependencies over direct network calls in tests.
- Keep parsing/merge logic explicit and deterministic.

## Validation
- `npm run test -- test/unit/engine/structure-rewriter.test.ts`
- `npm run test:unit -- --coverage=false`

## Outcome
- **Originally planned:** Implement a structure-rewriter core module with orchestration + merge behavior and add unit tests.
- **Actually changed:** Added `src/engine/structure-rewriter.ts` with an injectable rewrite generator, default OpenRouter-backed generation path, local structure-response parsing, and `mergePreservedWithRegenerated` logic that preserves completed beats and enforces three-act output shape.
- **Additional alignment:** Added additive engine barrel exports in `src/engine/index.ts` and updated `test/unit/engine/index.test.ts` to cover the new public exports.

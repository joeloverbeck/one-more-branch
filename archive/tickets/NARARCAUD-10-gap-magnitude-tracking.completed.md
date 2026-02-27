# NARARCAUD-10: Gap Magnitude Tracking

**Status**: COMPLETED
**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A5 — Beat Architecture gaps

## Summary

Add `expectedGapMagnitude` to `StoryBeat` to track how wide the gap between expectation and result should be at each beat. Gap magnitude should generally increase through the story. The analyst evaluates whether the delivered gap matches the expected magnitude.

## Reassessed Assumptions (Codebase Reality)

- `src/engine/structure-types.ts` does not duplicate beat fields; it only re-exports `StructureGenerationResult`. No change needed there.
- The actual generated-beat contract originates in `src/models/structure-generation.ts` and `src/llm/structure-response-parser.ts`; these must be updated for new beat fields.
- Beat-level structural quality checks used by analyst are centralized in `src/llm/prompts/continuation/story-structure-section.ts`, not primarily in `src/llm/prompts/analyst-prompt.ts`. Any "evaluate delivered gap" behavior belongs in continuation structure evaluation guidance.
- Structure rewrite path has dedicated beat DTOs and prompt plumbing (`src/llm/structure-rewrite-types.ts`, `src/engine/structure-rewrite-support.ts`, `src/llm/prompts/structure-rewrite-prompt.ts`). For architectural consistency and long-term extensibility, new beat metadata must be propagated there too.
- Existing architecture is strict-schema + typed parsing + factory mapping + prompt guidance. Adding `expectedGapMagnitude` within that same pipeline is beneficial and cleaner than ad hoc prompt-only handling.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly expectedGapMagnitude: 'NARROW' | 'MODERATE' | 'WIDE' | 'CHASM' | null` to `StoryBeat`
- `src/llm/schemas/structure-schema.ts` — add `expectedGapMagnitude` (nullable enum)
- `src/llm/prompts/structure-prompt.ts` — add gap magnitude instruction (should increase through story)
- `src/models/structure-generation.ts` — add `expectedGapMagnitude?: string | null` to generated beat contract
- `src/llm/structure-response-parser.ts` — parse `expectedGapMagnitude`
- `src/engine/structure-factory.ts` — thread field
- `src/llm/prompts/continuation/story-structure-section.ts` — evaluate delivered gap vs expected in beat-quality checks
- `src/llm/structure-rewrite-types.ts` — add field to completed/planned beat DTOs
- `src/engine/structure-rewrite-support.ts` — thread field into rewrite context
- `src/llm/prompts/structure-rewrite-prompt.ts` — preserve/use expected gap magnitude in rewrite constraints
- `prompts/structure-prompt.md` — update doc
- `prompts/structure-rewrite-prompt.md` — update doc

## Out of Scope

- Planner context
- New persistence or runtime state models beyond existing beat metadata flow

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: structure schema requires/accepts `expectedGapMagnitude` nullable enum
- [x] Unit test: structure response parser preserves `expectedGapMagnitude`
- [x] Unit test: `createStoryStructure` maps `expectedGapMagnitude`
- [x] Unit test: continuation structure evaluation includes gap-magnitude quality guidance when active beat defines it
- [x] Unit test: rewrite support/prompt preserve and surface `expectedGapMagnitude`
- [x] Invariant: All existing tests pass

## Outcome

- **Completion date**: 2026-02-27
- **What changed**:
  - Added `expectedGapMagnitude` as first-class beat metadata in model, generation contract, schema, parser, factory mapping, persistence serialization, and rewrite merge pipeline.
  - Updated structure and structure-rewrite prompts/docs to require `expectedGapMagnitude` for escalation/turning-point beats with monotonic-growth guidance.
  - Added analyst structural quality guidance (continuation structure section) to evaluate expected vs delivered gap magnitude.
  - Strengthened tests across schema, parser, factory, continuation prompt checks, rewrite support/prompt, structure generator, serializer/repository, and structure rewriter.
- **Deviations from original plan**:
  - Original ticket assumed `src/engine/structure-types.ts` and `src/llm/prompts/analyst-prompt.ts` were primary implementation points. Actual architecture required changes in `src/models/structure-generation.ts`, `src/llm/structure-response-parser.ts`, `src/llm/prompts/continuation/story-structure-section.ts`, rewrite support/types/prompt, `src/engine/structure-rewriter.ts`, and persistence serializer/types.
  - Original ticket listed structure rewrite as out of scope. Rewrite propagation was included to keep beat metadata architecture coherent and avoid split behavior between generation and rewrite paths.
- **Verification**:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit`
  - Targeted suite reruns for updated structure/gap-magnitude modules and prompts

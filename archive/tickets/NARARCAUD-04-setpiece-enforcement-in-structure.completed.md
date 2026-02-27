# NARARCAUD-04: Setpiece Enforcement in Structure

**Status**: COMPLETED
**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: None
**Spec reference**: D3 — Concept-to-Delivery Pipeline gaps

## Summary

Strengthen setpiece delivery by adding a `setpieceSourceIndex` to `StoryBeat` that traces each beat back to its originating setpiece. Add a post-parse enforcement warning when fewer than 4 unique setpieces are traced into the generated structure (only when concept verification data exists).

## Reassessed Assumptions and Scope Corrections

- `ConceptVerification.escalatingSetpieces` is validated to exactly 6 items in the current codebase, so `setpieceSourceIndex` range `0..5` is valid today.
- The original ticket placed warning logic in `parseStructureResponse`, but that function does not receive `StructureContext` (and therefore cannot know whether concept verification data was provided). Warning logic should run at the generation boundary where both parsed output and `context.conceptVerification` are available.
- `StructureGenerationResult` is currently duplicated in `src/llm/structure-generator.ts` and `src/engine/structure-types.ts`. Adding another beat field to both duplicates increases architectural drift risk. Scope is corrected to consolidate this type into a single source of truth.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly setpieceSourceIndex: number | null` to `StoryBeat`
- `src/llm/schemas/structure-schema.ts` — add `setpieceSourceIndex` (nullable integer 0-5)
- `src/llm/prompts/structure-prompt.ts` — strengthen from "at least 3" to "at least 4 MUST appear"; add `setpieceSourceIndex` instruction
- `src/llm/structure-generator.ts` — parse/validate `setpieceSourceIndex`; emit warning at generation boundary when <4 unique setpieces are traced and concept verification exists
- `src/engine/structure-types.ts` and `src/llm/structure-generator.ts` — consolidate `StructureGenerationResult` into one shared type definition (no duplicate interfaces)
- `src/engine/structure-factory.ts` — thread `setpieceSourceIndex` in beat mapping
- `prompts/structure-prompt.md` — update doc

## Out of Scope

- Structure rewrite prompt (setpieces are first-gen only)
- Analyst evaluation

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: structure generation logs warning when concept verification exists and <4 unique setpieces are mapped
- [x] Unit test: no warning is logged when concept verification is absent
- [x] Unit test: `createStoryStructure` maps `setpieceSourceIndex` from result to `StoryBeat`
- [x] Invariant: Structure schema validates correctly with new field
- [x] Invariant: `StructureGenerationResult` is defined in one place only
- [x] Invariant: All existing structure tests pass (new field added to mocks)

## Outcome

- Completion date: February 27, 2026
- What changed:
  - Added `setpieceSourceIndex` to beat contract and propagated it through schema, prompt instructions, parser, structure factory, rewrite support, and persistence serialization/deserialization.
  - Raised setpiece-traceability requirement from 3 to 4 and added explicit zero-based mapping instructions in prompt/docs.
  - Added post-parse warning in `generateStoryStructure` flow (context-aware) when concept verification exists but fewer than 4 unique setpieces are mapped.
  - Consolidated `StructureGenerationResult` into a single shared model type (`src/models/structure-generation.ts`) and removed duplicate interface definitions.
  - Added/updated tests for schema, prompt, generator warnings, mapping behavior, and persistence/rewrite propagation.
- Deviations from original plan:
  - Warning enforcement was implemented at the generation boundary (not inside `parseStructureResponse`) to keep it context-aware and avoid false positives when concept verification is absent.
  - Persistence and rewrite support were updated as required follow-through to preserve the new beat field end-to-end.
- Verification:
  - `npm run typecheck`
  - `npm run lint`
  - `npx jest test/unit/llm/schemas/structure-schema.test.ts test/unit/llm/prompts/structure-prompt.test.ts test/unit/llm/structure-generator.test.ts test/unit/engine/structure-factory.test.ts test/unit/persistence/story-repository.test.ts test/unit/engine/structure-rewriter.test.ts test/unit/engine/structure-rewrite-support.test.ts --coverage=false`

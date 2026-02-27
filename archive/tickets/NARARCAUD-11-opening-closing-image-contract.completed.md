# NARARCAUD-11: Opening/Closing Image Contract

**Status**: COMPLETED
**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: None
**Spec reference**: D2 — Concept-to-Delivery Pipeline gaps

## Summary

Add `openingImage` and `closingImage` as required `StoryStructure` fields to establish a thematic bookend contract. The opening writer prompt must receive `openingImage` as a concrete scene constraint, and planner continuation guidance must surface `closingImage` when planning the final resolution beat.

## Reassessed Assumptions (Codebase Reality)

- `src/engine/structure-types.ts` does not own a duplicate structure contract; it only re-exports `StructureGenerationResult`. The real generation DTO lives in `src/models/structure-generation.ts`.
- Strict structure ingestion is split across schema + response parser + factory mapping (`src/llm/schemas/structure-schema.ts`, `src/llm/structure-response-parser.ts`, `src/engine/structure-factory.ts`). New required structure fields must be added in all three, not only schema/model.
- Structure metadata is propagated through rewrite and persistence layers (`src/llm/structure-rewrite-types.ts`, `src/engine/structure-rewrite-support.ts`, `src/engine/structure-rewriter.ts`, `src/persistence/story-serializer-types.ts`, `src/persistence/story-serializer.ts`). To stay robust/extensible, new required fields must be threaded there too.
- Planner structural guidance is centralized through shared continuation prompt builders (`src/llm/prompts/sections/planner/continuation-context.ts` and `src/llm/prompts/continuation/story-structure-section.ts`), so final-resolution closing-image guidance belongs there rather than ad hoc in unrelated prompt code.

## Architectural Decision

Implement `openingImage` and `closingImage` as first-class required structure contract fields end-to-end.

Why this is better than current architecture:
- Makes bookend intent explicit and deterministic instead of implicit prose inference.
- Keeps generation, rewrite, planner, and persistence on one contract with no shadow fields.
- Preserves long-term extensibility: future analyst checks can consume typed bookend data without extra parsing heuristics.

Alternatives rejected:
- Prompt-only bookend instructions without schema/model fields (not enforceable, brittle).
- Opening/planner local ad hoc fields disconnected from `StoryStructure` (contract drift risk).

## Files Touched

### Models and contracts
- `src/models/story-arc.ts` — added required `openingImage` and `closingImage` on `StoryStructure`
- `src/models/structure-generation.ts` — added required `openingImage` and `closingImage` on `StructureGenerationResult`
- `src/models/story.ts` and `src/models/structure-version.ts` — updated runtime guards to require both fields
- `src/llm/structure-rewrite-types.ts` — added original bookend fields on rewrite context

### Schema, parsing, mapping, rewrite, persistence
- `src/llm/schemas/structure-schema.ts` — required `openingImage` and `closingImage`
- `src/llm/structure-response-parser.ts` — required/parsed both fields
- `src/engine/structure-factory.ts` — mapped both fields into `StoryStructure`
- `src/engine/structure-rewrite-support.ts` and `src/engine/structure-rewriter.ts` — propagated bookend data through rewrite flow (preserve opening image; regenerate closing image)
- `src/persistence/story-serializer-types.ts` and `src/persistence/story-serializer.ts` — serialized/deserialized both fields

### Prompt behavior and docs
- `src/llm/prompts/structure-prompt.ts` — added opening/closing image requirements and output shape
- `src/llm/prompts/structure-rewrite-prompt.ts` — preserved opening image + regenerated closing image contract
- `src/llm/prompts/opening-prompt.ts` — injected opening-image contract section for writer prompt
- `src/llm/prompts/sections/planner/continuation-context.ts` — added final-resolution closing-image directive
- `src/llm/prompts/continuation/story-structure-section.ts` — surfaced opening/closing image in shared structure context
- `prompts/structure-prompt.md`, `prompts/opening-prompt.md`, `prompts/page-planner-prompt.md` — updated docs to match runtime behavior

### Tests
- Added/updated tests in:
  - `test/unit/llm/schemas/structure-schema.test.ts`
  - `test/unit/llm/structure-response-parser.test.ts`
  - `test/unit/engine/structure-factory.test.ts`
  - `test/unit/llm/prompts/opening-prompt.test.ts`
  - `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
  - `test/unit/models/story.test.ts`
- Updated structure fixtures/usages across unit/integration test files to include required structure bookend fields.

## Out of Scope

- New analyst scoring fields for bookend fulfillment
- Backward-compat alias fields or nullable fallbacks

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Unit test: structure schema requires `openingImage` and `closingImage`
- [x] Unit test: structure response parser/factory preserve both fields
- [x] Unit test: `buildOpeningPrompt` includes opening-image constraint when structure is present
- [x] Unit test: `buildEscalationDirective`/planner continuation context includes closing-image guidance only for final resolution beat
- [x] Prompt docs reflect runtime ownership for opening/planner bookend guidance
- [x] Relevant tests pass (`npm run test:unit -- --coverage=false`)
- [x] Invariant: no backward-compat alias fields introduced

## Outcome

- **Completion date**: 2026-02-27
- **What was actually changed vs originally planned**:
  - Implemented the bookend contract as required fields across generation, rewrite, model guards, persistence, and prompt runtime layers.
  - Added final-resolution planner directive (closing image) and opening writer directive (opening image) using shared structure context so behavior stays centralized.
  - Updated broad test coverage where `StoryStructure` fixtures now require new fields.
- **Deviations from original plan**:
  - Extended changes into `src/models/story.ts`, `src/models/structure-version.ts`, and rewrite prompt/context plumbing to keep runtime validators and rewrite flow contract-consistent.
  - Preserved original opening image during rewrites while allowing closing image to regenerate with new downstream structure.
- **Verification results**:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit -- --coverage=false`

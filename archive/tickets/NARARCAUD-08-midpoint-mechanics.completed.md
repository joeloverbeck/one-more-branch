# NARARCAUD-08: Midpoint Mechanics

**Status**: COMPLETED
**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A2 — Beat Architecture gaps

## Summary

Add midpoint flagging to `StoryBeat` with `isMidpoint: boolean` and `midpointType: 'FALSE_VICTORY' | 'FALSE_DEFEAT' | null`. The structure prompt should require exactly one midpoint per story, and runtime analyst guidance should evaluate midpoint delivery when the active beat is midpoint-tagged.

## Reassessed Assumptions

1. `src/engine/structure-types.ts` is only a re-export of `StructureGenerationResult`; midpoint fields must be added in `src/models/structure-generation.ts`, not in `structure-types.ts`.
2. Analyst beat-evaluation behavior is implemented in `src/llm/prompts/continuation/story-structure-section.ts` and consumed by `buildAnalystPrompt`; changing only `src/llm/prompts/analyst-prompt.ts` is incomplete.
3. Beat contracts are propagated across generation, rewrite, and persistence layers. Midpoint fields must be threaded through:
   - `src/models/structure-generation.ts`
   - `src/llm/structure-rewrite-types.ts`
   - `src/engine/structure-rewrite-support.ts`
   - `src/engine/structure-rewriter.ts`
   - `src/persistence/story-serializer-types.ts`
   - `src/persistence/story-serializer.ts`
4. Prompt docs in `prompts/*.md` must reflect the real runtime ownership split (structure prompt, structure rewrite prompt, analyst prompt, planner prompt).

## Architectural Decision

Implement midpoint metadata as required beat-level fields (`isMidpoint`, `midpointType`) across all structure contracts.

Why this is better than the current architecture:
- Midpoint intent becomes explicit and machine-checkable instead of inferred late from prose.
- Planner/analyst guidance can evaluate narrative delivery against deterministic structure intent.
- Extensibility stays clean: additional midpoint semantics can be added via typed enums without alias fields.

Alternatives rejected:
- Analyst-only midpoint inference (non-deterministic and too late for planning).
- Prompt-only midpoint instructions without schema/model fields (not enforceable).

## Files to Touch

### Models and contracts
- `src/models/story-arc.ts` — add midpoint enum/type and fields to `StoryBeat`
- `src/models/structure-generation.ts` — add midpoint fields to `GeneratedBeat`
- `src/llm/structure-rewrite-types.ts` — include midpoint fields in `CompletedBeat`/`PlannedBeat`

### Schema, parsing, mapping, persistence
- `src/llm/schemas/structure-schema.ts` — add required midpoint fields
- `src/llm/structure-generator.ts` — parse midpoint fields from model output
- `src/engine/structure-factory.ts` — parse/map midpoint fields into `StoryBeat`
- `src/engine/structure-rewriter.ts` — preserve/map midpoint fields during merge/parse
- `src/engine/structure-rewrite-support.ts` — include midpoint fields in rewrite context beats
- `src/persistence/story-serializer-types.ts` — include midpoint fields in serialized beat shape
- `src/persistence/story-serializer.ts` — serialize/deserialize midpoint fields

### Runtime prompts and prompt docs
- `src/llm/prompts/structure-prompt.ts` — require exactly one midpoint and `midpointType` semantics
- `src/llm/prompts/structure-rewrite-prompt.ts` — preserve midpoint info for completed beats and require midpoint handling for regenerated beats
- `src/llm/prompts/continuation/story-structure-section.ts` — midpoint-specific analyst evaluation guidance when active beat is midpoint
- `src/llm/prompts/sections/planner/continuation-context.ts` — midpoint directive to keep planning aligned with midpoint intent
- `prompts/structure-prompt.md` — update doc
- `prompts/structure-rewrite-prompt.md` — update doc
- `prompts/analyst-prompt.md` — update doc
- `prompts/page-planner-prompt.md` — update doc

### Tests
- `test/unit/llm/schemas/structure-schema.test.ts`
- `test/unit/engine/structure-factory.test.ts`
- `test/unit/llm/prompts/analyst-prompt.test.ts`
- `test/unit/llm/prompts/continuation/story-structure-section.test.ts`
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- Additional affected persistence/rewrite tests where beat shape is asserted

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Unit test: structure schema validates midpoint fields
- [x] Unit test: `createStoryStructure` maps midpoint fields
- [x] Unit test: analyst structure evaluation includes midpoint quality checks when active beat is midpoint
- [x] Unit test: planner continuation context includes midpoint guidance when active beat is midpoint
- [x] Prompt docs reflect runtime midpoint guidance ownership
- [x] Relevant test suites pass (`npm run test:unit -- --coverage=false`)
- [x] Invariant: no backward-compat alias fields introduced

## Outcome

**Completion date**: 2026-02-27

**What changed vs originally planned**:
- Implemented midpoint as a first-class beat contract (`isMidpoint`, `midpointType`) across models, schema, generation parsing, structure mapping, rewrite context/types, rewrite merge path, and persistence serialization.
- Added midpoint-specific runtime guidance in shared continuation prompt builders so analyst and planner both evaluate midpoint delivery from the same structure signals.
- Updated structure and rewrite prompts to require midpoint invariants (exactly one midpoint in generated/re-generated structures, typed midpoint semantics).
- Updated prompt docs (`prompts/structure-prompt.md`, `prompts/structure-rewrite-prompt.md`, `prompts/analyst-prompt.md`, `prompts/page-planner-prompt.md`) to match runtime ownership and midpoint directives.
- Added/updated tests for schema shape, structure mapping, analyst midpoint quality checks, planner midpoint directive, and rewrite/persistence propagation.

**Deviations from original plan**:
- Replaced the original `structure-types.ts` touchpoint with `src/models/structure-generation.ts` because `structure-types.ts` is a re-export-only shim.
- Implemented midpoint analyst behavior in `src/llm/prompts/continuation/story-structure-section.ts` (actual runtime owner) rather than only `analyst-prompt.ts`.
- Included structure rewrite and planner continuation-context updates after reassessment showed midpoint guidance had to propagate through those layers for architectural consistency.

**Verification results**:
- `npm run test:unit -- --coverage=false` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.

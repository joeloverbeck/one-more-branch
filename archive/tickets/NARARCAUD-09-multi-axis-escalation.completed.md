# NARARCAUD-09: Multi-Axis Escalation

**Status**: COMPLETED
**Wave**: 2 (Beat Architecture Enrichment)
**Effort**: M
**Dependencies**: None (Wave 1 independent)
**Spec reference**: A4 — Beat Architecture gaps

## Reassessed Assumptions (2026-02-27)

1. `StoryBeat` already includes Wave 1/2 fields (`causalLink`, `crisisType`, `reflection` role, midpoint fields, setpiece mapping). This ticket layers `secondaryEscalationType` on top of the current richer contract, not the older baseline.
2. `src/engine/structure-types.ts` is not the source of beat-generation field shape. `GeneratedBeat` lives in `src/models/structure-generation.ts` and is parsed by `src/llm/structure-response-parser.ts`.
3. Structure rewrite and persistence flows carry beat-level architecture fields and must remain isomorphic with structure generation:
   - rewrite context/types (`src/llm/structure-rewrite-types.ts`, `src/engine/structure-rewrite-support.ts`, `src/engine/structure-rewriter.ts`)
   - serialization contracts (`src/persistence/story-serializer.ts`, `src/persistence/story-serializer-types.ts`)
4. Planner escalation guidance is already role-aware (escalation/turning-point/reflection + midpoint), so adding a second escalation axis is an additive enhancement in `buildEscalationDirective`, not a new directive subsystem.

## Architectural Decision

Adopt `secondaryEscalationType` as a first-class `StoryBeat` field (`EscalationType | null`) across generation, parsing, rewrite, planner context, and persistence.

Why this is better than the previous architecture:
- Preserves a single canonical beat contract shared by generation/rewrite/persistence/planner.
- Improves expressive power for high-pressure beats without introducing alias fields or parallel structures.
- Keeps escalation semantics typed and enum-constrained (robust + extensible), rather than embedding secondary escalation in free-text hooks.

Non-goals:
- No analyst scoring changes.
- No writer prompt changes.
- No backward-compatibility aliases.

## Scope Implemented

### Core model + schema + prompt wiring

- `src/models/story-arc.ts`
  - Added `readonly secondaryEscalationType: EscalationType | null` to `StoryBeat`.
- `src/llm/schemas/structure-schema.ts`
  - Added required nullable `secondaryEscalationType` on beats (same enum as `escalationType`).
- `src/llm/prompts/structure-prompt.ts`
  - Added instruction and output-shape entry for optional secondary escalation on escalation/turning-point beats.
- `src/llm/prompts/structure-rewrite-prompt.ts`
  - Added same instruction/output-shape entry and preservation guidance for completed beats.

### Parsing + engine threading

- `src/models/structure-generation.ts`
  - Added beat field for parsed generation payload.
- `src/llm/structure-response-parser.ts`
  - Parses and returns `secondaryEscalationType`.
- `src/engine/structure-factory.ts`
  - Parses/maps `secondaryEscalationType` into `StoryBeat`.

### Planner/rewrite/persistence coherence

- `src/llm/prompts/sections/planner/continuation-context.ts`
  - Extended `buildEscalationDirective` to surface both escalation axes.
- `src/llm/structure-rewrite-types.ts`
  - Added field to `CompletedBeat` and `PlannedBeat`.
- `src/engine/structure-rewrite-support.ts`
  - Threaded field into extracted rewrite context.
- `src/engine/structure-rewriter.ts`
  - Preserves/maps field when merging regenerated structures.
- `src/persistence/story-serializer-types.ts`
  - Added beat field to file contract.
- `src/persistence/story-serializer.ts`
  - Serializes/deserializes field.

### Prompt docs

- `prompts/structure-prompt.md`
- `prompts/page-planner-prompt.md`

## Out of Scope

- Analyst evaluation of secondary escalation.
- Writer prompt changes.

## Acceptance Criteria

- [x] `npm run typecheck` passes.
- [x] Unit: `buildEscalationDirective` includes both primary and secondary escalation guidance when present.
- [x] Unit: `createStoryStructure` maps `secondaryEscalationType` (valid + invalid/null coercion behavior).
- [x] Unit: structure response parser carries `secondaryEscalationType`.
- [x] Unit: serializer round-trip preserves `secondaryEscalationType`.
- [x] Invariant: existing relevant tests pass.

## Outcome

**Completion date**: 2026-02-27

**What changed vs. originally planned**:
- Added missing scope that the original ticket omitted: parser, rewrite context/merge path, and persistence file contract wiring.
- Corrected the original assumption that `src/engine/structure-types.ts` should carry the generation field; actual source is `src/models/structure-generation.ts`.
- Strengthened test coverage beyond original acceptance criteria with explicit schema and parser assertions for `secondaryEscalationType`.

**Verification results**:
- `npm run typecheck` (pass)
- `npm run lint` (pass)
- `npm test -- test/unit/engine/structure-factory.test.ts test/unit/llm/structure-response-parser.test.ts test/unit/llm/schemas/structure-schema.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/persistence/story-serializer.test.ts test/unit/engine/structure-rewrite-support.test.ts test/unit/engine/structure-rewriter.test.ts` (pass)
- `npm test -- test/unit/llm/structure-generator.test.ts test/unit/engine/structure-state.test.ts test/unit/engine/story-service.test.ts test/integration/engine/structure-modules.test.ts` (pass)

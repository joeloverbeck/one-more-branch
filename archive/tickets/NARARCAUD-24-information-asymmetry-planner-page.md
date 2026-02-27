# NARARCAUD-24: Information Asymmetry — Planner & Page Wiring

**Status**: COMPLETED
**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: NARARCAUD-23
**Spec reference**: F3 (part 2) — Subsystem gaps

## Reassessed Context (Code vs Ticket)

Current code already captures per-scene knowledge asymmetry in `AnalystResult.knowledgeAsymmetryDetected`, but there is no accumulated branch state surfaced as first-class page state or continuation planner input.

Discrepancies found:
- `Page` currently does **not** carry `accumulatedKnowledgeState`.
- `ContinuationContext` currently does **not** carry accumulated knowledge asymmetry.
- Planner continuation prompt section currently has no dramatic-irony section.
- Parent state plumbing is required via `CollectedParentState` and page build contexts; the original ticket omitted this threading path.
- Serializer converters already handle `AnalystResult.knowledgeAsymmetryDetected`; this ticket must avoid duplicating responsibility there and instead persist the accumulated page-level state.

## Summary

Add a first-class, accumulated branch knowledge state to `Page`, persist it, thread it through continuation context, and render a dedicated planner section:

`=== DRAMATIC IRONY OPPORTUNITIES ===`

This section should appear only when accumulated asymmetries exist.

## Architectural Decision

Use page-level accumulated state (`Page.accumulatedKnowledgeState`) as the single source of truth for planner context, derived at page build time by merging parent accumulated state with current analyst detections by `characterName` (latest observation wins per character).

Rationale:
- Keeps accumulation deterministic and branch-local.
- Decouples planner context from raw analyst payload shape.
- Scales to future asymmetry-driven systems (scene ideator, tension budgeting) without rereading full ancestor chains.

## Files Touched

- `src/models/page.ts`
- `src/engine/page-builder.ts`
- `src/engine/parent-state-collector.ts`
- `src/engine/post-generation-processor.ts`
- `src/persistence/page-serializer-types.ts`
- `src/persistence/page-serializer.ts`
- `src/llm/context-types.ts`
- `src/engine/continuation-context-builder.ts`
- `src/llm/prompts/sections/planner/continuation-context.ts`
- `prompts/page-planner-prompt.md`
- `test/unit/persistence/page-serializer.test.ts`
- `test/unit/engine/continuation-context-builder.test.ts`
- `test/unit/engine/parent-state-collector.test.ts`
- `test/unit/engine/page-builder.test.ts`
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- `test/unit/engine/analyst-feedback-loop.test.ts`
- `test/integration/engine/lorekeeper-writer-pipeline.test.ts`
- `test/unit/llm/types.test.ts`
- `test/unit/llm/prompts/continuation-prompt.test.ts`
- `test/unit/llm/index.test.ts`

## Out of Scope

- Analyst detection/schema changes (`knowledgeAsymmetryDetected`, `dramaticIronyOpportunities`) from NARARCAUD-23
- Writer prompt changes
- Non-planner consumers of accumulated knowledge state

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: page serializer round-trips `accumulatedKnowledgeState`
- [x] Unit test: continuation context builder threads `accumulatedKnowledgeState`
- [x] Unit test: planner continuation context renders `DRAMATIC IRONY OPPORTUNITIES` section only when asymmetries exist
- [x] Unit test: page builder merge semantics preserve prior characters and replace updated character entries
- [x] Invariant: relevant test suites pass

## Outcome

**Completion date**: 2026-02-27

**What changed vs originally planned**:
- Implemented the planned page/persistence/context/planner wiring for accumulated knowledge asymmetry.
- Added missing parent-state plumbing (`CollectedParentState` + post-generation builder threading) that the original ticket did not enumerate but is required by current architecture.
- Enforced deterministic merge semantics (`characterName` keyed replacement) for accumulated knowledge state.

**Deviations from original plan**:
- No changes were made to analyst schema or writer prompts (explicitly left out of scope).
- Additional test fixture updates were required to satisfy new strict continuation-context field requirements and prevent runtime test regressions.

**Verification results**:
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/page-serializer.test.ts test/unit/engine/continuation-context-builder.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/engine/page-builder.test.ts` passed.

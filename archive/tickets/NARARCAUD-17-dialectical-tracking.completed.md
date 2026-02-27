# NARARCAUD-17: Dialectical Tracking

**Status**: COMPLETED
**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: M
**Dependencies**: NARARCAUD-01 (antithesis), NARARCAUD-02 (thematicCharge on AnalystResult)
**Spec reference**: B2 — Thematic Architecture gaps

## Summary

Store the analyst's thematic charge classification on each page as `thematicValence`, build a valence trajectory from ancestor pages, and warn the planner when 3+ consecutive scenes share the same valence (preventing monotonic thematic drift).

## Reassessed Assumptions (2026-02-27)

- `AnalystResult.thematicCharge` already exists and is wired through schema, validation, transformer, prompt instructions, persistence converters, and fixtures.
- `AncestorContext` is defined in `src/engine/ancestor-collector.ts` (not in `src/llm/generation-pipeline-types.ts`), while reusable trajectory item types live in `src/llm/generation-pipeline-types.ts`.
- Momentum trajectory and pacing warnings already exist in planner continuation context; thematic trajectory should follow the same architectural pattern.
- There is currently no dedicated unit test file for `collectAncestorContext`; trajectory behavior is only indirectly covered through continuation-context tests.

## Corrected Scope (source of truth)

### Must implement

- `src/models/page.ts`
  - Add required `thematicValence` field on `Page` using the same enum domain as analyst thematic charge.
  - Ensure `createPage()` assigns `thematicValence` from `analystResult.thematicCharge`, defaulting to `AMBIGUOUS` when analyst data is missing.
  - Validate `thematicValence` in `isPage()`.
- `src/persistence/page-serializer-types.ts`
  - Add required `thematicValence` in `PageFileData`.
- `src/persistence/page-serializer.ts`
  - Serialize/deserialize `thematicValence` with no fallback/migration path.
- `src/llm/generation-pipeline-types.ts`
  - Add thematic trajectory point/list types for continuation context.
- `src/engine/ancestor-collector.ts`
  - Extend `AncestorContext` with thematic trajectory data (parallel to momentum trajectory).
  - Build trajectory in chronological order, capped to recent pages, using parent + ancestors.
- `src/llm/context-types.ts`
  - Add thematic trajectory field to `ContinuationContext`.
- `src/engine/continuation-context-builder.ts`
  - Thread thematic trajectory from `AncestorContext` into continuation context.
- `src/llm/prompts/sections/planner/continuation-context.ts`
  - Add a `THEMATIC TRAJECTORY` section and emit warnings when 3+ consecutive recent scenes share thesis-supporting or antithesis-supporting valence.
- `prompts/page-planner-prompt.md`
  - Document the new trajectory section and warning behavior.

## Out of Scope

- Writer prompt changes
- Analyst prompt changes (thematic charge already in NARARCAUD-02)

## Architectural Rationale

- This change is beneficial vs current architecture because it converts a nested, optional analyst signal into a first-class page-level invariant used by planning logic.
- It reuses the existing trajectory/warning pattern (momentum -> pacing warnings) instead of creating a parallel bespoke pipeline, keeping extension cost low.
- No backward-compatibility behavior is introduced: `thematicValence` is treated as required persisted state.
- Single-source derivation is preserved by computing `Page.thematicValence` from `analystResult` at page creation time (no duplicate write paths).

## Tests to add/update

- `test/unit/engine/page-builder.test.ts`
  - Assert `buildPage()` assigns `thematicValence` from analyst thematic charge.
- `test/unit/persistence/page-serializer.test.ts`
  - Assert serialize/deserialize round-trip preserves `thematicValence`.
- `test/unit/engine/ancestor-collector.test.ts` (new)
  - Assert collector builds chronological, capped thematic trajectory from ancestor chain.
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
  - Assert thematic trajectory warning is included when 3+ consecutive same-valence scenes occur.
- `test/unit/engine/continuation-context-builder.test.ts`
  - Assert thematic trajectory is threaded into `ContinuationContext`.

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Unit test: `buildPage` sets `thematicValence` from analyst result
- [x] Unit test: `serializePage`/`deserializePage` round-trips `thematicValence`
- [x] Unit test: ancestor collector builds thematic trajectory
- [x] Unit test: planner context warns on 3+ consecutive same-valence
- [x] Relevant unit/integration suites pass

## Outcome

- Completion date: 2026-02-27
- What changed vs originally planned:
  - Added required page-level `thematicValence` derived from analyst thematic charge in `createPage()`.
  - Persisted `thematicValence` through page serializer file-data types and round-trip logic.
  - Added thematic valence trajectory types and threaded trajectory from ancestor collection into continuation context.
  - Added planner continuation section/warning for monotonic thematic drift (3+ consecutive same-valence scenes).
  - Updated planner prompt docs with thematic trajectory warning behavior.
  - Added new unit coverage for `ancestor-collector` and expanded existing unit tests for page builder, serializer, continuation context builder, and planner continuation context.
- Deviations from original ticket wording:
  - Corrected architecture references: `AncestorContext` ownership remains in `engine/ancestor-collector`, while reusable trajectory item types are in `llm/generation-pipeline-types`.
  - Expanded test scope to include a dedicated `ancestor-collector` unit suite since no direct tests existed.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/ancestor-collector.test.ts test/unit/engine/continuation-context-builder.test.ts test/unit/engine/page-builder.test.ts test/unit/persistence/page-serializer.test.ts test/unit/llm/prompts/sections/planner/continuation-context.test.ts --coverage=false`
  - `npm run test:integration -- --runTestsByPath test/integration/persistence/page-serializer-converters.test.ts`
  - `npm run typecheck`
  - `npm run lint`

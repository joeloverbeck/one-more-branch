# CONPACASSOVE-06: Update prompt docs and audit downstream content-packet contract references

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: `specs/content-packet-asset-overhaul.md`, `tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.md`, `tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.md`

## Problem

The overhaul changed ownership boundaries between the saved asset and the downstream packet projection. The current repo no longer matches the original ticket assumptions: the v2 saved-asset model and projection boundary already exist in code, and the packeter/one-shot prompt docs were already partially updated. The remaining gap is narrower: some prompt docs still describe downstream inputs too vaguely, and the concept-stage docs still say `ContentPacket[]` without clarifying that these stages consume the lean downstream projection rather than the richer saved asset.

## Assumption Reassessment (2026-03-19)

1. `src/models/saved-content-packet.ts` and `src/models/content-packet.ts` already implement the intended v2 split:
   - `SavedContentPacket` persists `packet`, `context`, `origin`, and optional `evaluation`
   - downstream concept stages still receive the lean `ContentPacket` projection
2. `prompts/content-packeter-prompt.md` and `prompts/content-one-shot-prompt.md` are already mostly aligned with the new architecture:
   - they document `premiseSummary`, `situationFrame`, and `worldState`
   - they already describe those fields as saved-asset candidate context rather than lean downstream packet fields
3. `prompts/content-sparkstormer-prompt.md` documents persistable spark fields, but it does not yet explicitly connect them to `origin.sourceArtifacts` in the saved asset model strongly enough to serve as the contract source of truth.
4. `prompts/content-evaluator-prompt.md` still describes evaluation as a terminal packet-scoring stage without explaining that the evaluator scores the lean packet projection and that its result is later attached to the saved asset as sibling metadata.
5. Several concept-stage markdown docs still describe `contentPackets` too generically as `ContentPacket[]`, without stating that these are lean projection objects, not the full saved asset. The runtime prompt builders already operate on the lean projection, so this is currently a documentation-drift problem more than a runtime bug.
6. Existing tests already cover the content prompt builders and several concept-stage prompt builders, but they do not explicitly protect the projection boundary by asserting that context-only saved-asset fields are not injected downstream.

## Architecture Check

1. Tightening the docs around the projection boundary is beneficial because the current architecture is already the cleaner long-term shape: a richer persisted asset with a lean downstream projection. Reversing that split would make downstream prompts heavier and blur responsibilities again.
2. Adding narrow regression tests around concept prompt builders is also beneficial because it enforces the intended architecture in runtime behavior, not just prose.
3. No document should describe compatibility loading, alias payloads, or old packet-only saved assets as still valid.
4. This ticket should stay documentation-and-guardrail focused. Renaming `ContentPacket` to something like `ConceptSeedPacket` may still be architecturally attractive, but it is broader than this pass and should not be bundled into prompt-doc cleanup.

## What to Change

### 1. Tighten only the stale content-generation docs

Revise only the docs that still need clarification:

- `prompts/content-sparkstormer-prompt.md`
- `prompts/content-evaluator-prompt.md`

They must explain:

- that spark outputs are later persisted as saved-asset `origin.sourceArtifacts`
- that the evaluator scores the lean downstream packet projection
- that evaluator output is later attached to the richer saved asset as `evaluation`
- that old packet-only saved assets are not the current contract

### 2. Audit downstream concept-stage docs

Review concept-stage prompt docs that mention content packets and update any stale wording so they clearly describe the lean projection being injected downstream.

### 3. Add regression coverage where runtime prompt builders enforce the boundary

Use the existing concept prompt-builder tests to assert the runtime side of the contract:

- concept stages should include only the lean downstream packet fields they actually consume
- concept stages should not rely on saved-asset-only fields like `premiseSummary`, `situationFrame`, `worldState`, `origin`, or `evaluation`

## Files to Touch

- `prompts/content-sparkstormer-prompt.md` (modify)
- `prompts/content-evaluator-prompt.md` (modify)
- `prompts/concept-seeder-prompt.md` (modify)
- `prompts/concept-architect-prompt.md` (modify)
- `prompts/concept-engineer-prompt.md` (modify)
- `prompts/concept-evolver-seeder-prompt.md` (modify)
- `prompts/concept-scenario-prompt.md` (modify)
- `prompts/concept-stress-tester-prompt.md` (modify)
- `prompts/concept-specificity-prompt.md` (modify)
- `prompts/concept-evaluator-prompt.md` (modify)
- `test/unit/llm/content-sparkstormer.test.ts` (modify only if runtime wording changes)
- `test/unit/llm/content-evaluator.test.ts` (modify only if runtime wording changes)
- `test/unit/llm/prompts/concept-seeder-prompt.test.ts` (modify)
- `test/unit/llm/prompts/concept-architect-prompt.test.ts` (modify)
- `test/unit/llm/prompts/concept-engineer-prompt.test.ts` (modify)
- `test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts` (modify)

## Out of Scope

- Runtime route or repository changes
- UI rendering work
- Renaming the `ContentPacket` type across the codebase
- Renaming every `ContentPacket` identifier in code if the implementation deliberately defers that rename
- Rewriting unrelated prompt guidance outside the saved-asset boundary audit

## Acceptance Criteria

### Tests That Must Pass

1. Prompt docs consistently describe the current ownership model:
   - saved assets are richer than the lean downstream packet projection
   - concept stages consume the lean projection, not the full saved asset
2. Runtime prompt-builder tests cover the downstream boundary explicitly enough to catch accidental leakage of saved-asset-only fields into concept prompts.
3. Any content prompt-builder tests affected by wording changes continue to pass.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/content-sparkstormer.test.ts test/unit/llm/content-evaluator.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts`

### Invariants

1. Prompt docs consistently describe one ownership model: saved assets are richer than the lean packet projection passed downstream.
2. No prompt doc claims old saved packet files or packet-only save payloads remain supported.
3. Concept-stage runtime prompts do not require saved-asset-only fields to ground content-packet integration.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-sparkstormer.test.ts` — update wording assertions only if the runtime prompt text changes while clarifying persistable spark fields.
2. `test/unit/llm/content-evaluator.test.ts` — update wording assertions only if the runtime prompt text changes while clarifying lean-packet evaluation semantics.
3. `test/unit/llm/prompts/concept-seeder-prompt.test.ts` — add a regression assertion that concept-seeder grounding uses lean packet fields and does not depend on saved-asset context fields.
4. `test/unit/llm/prompts/concept-architect-prompt.test.ts` — add the same projection-boundary regression coverage for architect grounding.
5. `test/unit/llm/prompts/concept-engineer-prompt.test.ts` — add the same projection-boundary regression coverage for engineer grounding.
6. `test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts` — add the same projection-boundary regression coverage for evolver grounding.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/content-sparkstormer.test.ts test/unit/llm/content-evaluator.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completion date: 2026-03-19
- Actual changes:
  - corrected the ticket to match the implemented v2 saved-asset/projection split already present in code
  - updated the stale prompt markdown docs to describe lean downstream `ContentPacket` projections consistently across concept stages
  - clarified spark persistence and evaluator attachment semantics in the content prompt docs
  - added regression tests proving concept-stage runtime prompts do not leak or depend on saved-asset-only fields
- Deviations from original plan:
  - `prompts/content-packeter-prompt.md` and `prompts/content-one-shot-prompt.md` did not need changes because they were already aligned
  - no runtime content prompt-builder code changes were necessary; the architecture was already correct and the gap was documentation plus guardrail coverage
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/content-sparkstormer.test.ts test/unit/llm/content-evaluator.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts` ✅
  - `npm run typecheck` ✅
  - `npm run lint` ✅

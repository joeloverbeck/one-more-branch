# CONPACASSOVE-06: Update prompt docs and audit downstream content-packet contract references

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: `specs/content-packet-asset-overhaul.md`, `tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.md`, `tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.md`

## Problem

The overhaul changes ownership boundaries between the saved asset and the downstream packet projection. The prompt docs currently describe the old packet-only save story, and several concept-stage docs still refer to `ContentPacket[]` without clarifying that they consume the lean projection rather than the saved asset.

## Assumption Reassessment (2026-03-19)

1. `prompts/content-packeter-prompt.md` and `prompts/content-one-shot-prompt.md` currently describe plain `ContentPacket[]` outputs and do not explain the new context fields as saved-asset context.
2. `prompts/content-sparkstormer-prompt.md` and `prompts/content-evaluator-prompt.md` do not currently describe how spark artifacts are persisted or how evaluation attaches to the richer saved asset.
3. `prompts/concept-seeder-prompt.md`, `prompts/concept-architect-prompt.md`, `prompts/concept-engineer-prompt.md`, and related concept-stage docs still need an audit so none of them accidentally imply they receive the full saved asset.

## Architecture Check

1. Updating the prompt docs in the same implementation pass prevents the codebase from carrying stale ownership claims that would mislead the next change.
2. No document should describe compatibility loading or old packet-only saved assets as still valid.

## What to Change

### 1. Update required content-generation docs

Revise these docs to describe the new contract split and required fields:

- `prompts/content-packeter-prompt.md`
- `prompts/content-one-shot-prompt.md`
- `prompts/content-sparkstormer-prompt.md`
- `prompts/content-evaluator-prompt.md`

They must explain:

- the difference between saved asset context and downstream packet projection
- the meaning of `premiseSummary`, `situationFrame`, and `worldState`
- that pipeline packets persist selected spark artifacts
- that quick packets persist exemplar-derived source artifacts
- that old saved packet files are incompatible

### 2. Audit downstream concept-stage docs

Review concept-stage prompt docs that mention content packets and update any stale wording so they clearly describe the lean projection being injected downstream.

### 3. Add documentation regression coverage where the repo already tests prompt builders

If existing prompt-builder tests assert strings affected by these contract changes, update them in the same pass so the docs and runtime prompts stay aligned.

## Files to Touch

- `prompts/content-packeter-prompt.md` (modify)
- `prompts/content-one-shot-prompt.md` (modify)
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
- `test/unit/llm/content-packeter.test.ts` (modify)
- `test/unit/llm/content-one-shot.test.ts` (modify)
- `test/unit/llm/content-sparkstormer.test.ts` (modify)
- `test/unit/llm/content-evaluator.test.ts` (modify)

## Out of Scope

- Runtime route or repository changes
- UI rendering work
- Renaming every `ContentPacket` identifier in code if the implementation deliberately defers that rename
- Rewriting unrelated prompt guidance outside the saved-asset boundary audit

## Acceptance Criteria

### Tests That Must Pass

1. Prompt builder tests that assert generation-contract wording are updated to reflect the new context-rich packet contract and persisted-lineage language.
2. Any prompt-builder tests affected by downstream packet wording continue to pass after the doc and prompt-string audit.
3. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/content-packeter.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/llm/content-evaluator.test.ts`

### Invariants

1. Prompt docs consistently describe one ownership model: saved assets are richer than the lean packet projection passed downstream.
2. No prompt doc claims old saved packet files or packet-only save payloads remain supported.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-packeter.test.ts` — adjust prompt wording assertions for context fields and source-artifact persistence language.
2. `test/unit/llm/content-one-shot.test.ts` — adjust prompt wording assertions for quick-generation context requirements.
3. `test/unit/llm/content-sparkstormer.test.ts` — adjust prompt wording assertions for persistable spark artifact fields.
4. `test/unit/llm/content-evaluator.test.ts` — update any affected wording assertions around evaluator inputs and saved-asset attachment semantics.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/content-packeter.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/llm/content-evaluator.test.ts`
2. `npm run typecheck`

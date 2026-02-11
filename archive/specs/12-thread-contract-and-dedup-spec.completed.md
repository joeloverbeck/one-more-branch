**Status**: ✅ COMPLETED

# Spec 12: Thread Contract and Deterministic Dedup

## Objective

Fix thread quality and duplication by enforcing an explicit open-loop thread contract and deterministic refinement rules.

## Thread Contract

Threads represent unresolved loops only, never current facts.

Allowed forms:

1. Question loop (MYSTERY/INFORMATION/MORAL/RELATIONSHIP)
2. Goal loop with success condition (QUEST/RESOURCE)
3. Prevention loop for long-horizon risk (DANGER)

Disallowed forms:

1. Current events (`THREAT`/`CONSTRAINT` instead)
2. Inventory facts (`INVENTORY` instead)
3. Emotional snapshots (narrative or protagonist affect instead)
4. Completed questions

## Prompt-Side Changes

Update prompt sections:

- `src/llm/prompts/sections/shared/state-tracking.ts`
- `src/llm/prompts/sections/continuation/continuation-quality-criteria.ts`
- `src/llm/prompts/sections/opening/opening-quality-criteria.ts`

Required additions:

1. New open-loop definition block.
2. Canonical phrasing templates by `ThreadType`.
3. Hard dedup/refinement algorithm text.
4. Updated GOOD/BAD examples that match current failure modes.

## Deterministic Dedup Rules (Reconciler)

### Text normalization

1. Lowercase
2. Collapse punctuation and repeated whitespace
3. Trim filler stop-phrases (`currently`, `right now`, `at this point`, etc.)

### Similarity check

1. Tokenize normalized strings.
2. Compute Jaccard similarity.
3. Thresholds:
   - `RELATIONSHIP`, `MORAL`: `>= 0.58`
   - `MYSTERY`, `INFORMATION`: `>= 0.62`
   - `QUEST`, `RESOURCE`, `DANGER`: `>= 0.66`

### Replacement enforcement

1. If new thread is near-duplicate of active thread and unresolved loop is equivalent, reject direct add.
2. Allowed path is replacement only: resolve old `td-*` and add one refined successor.
3. Reconciler rejects payload when duplicate-like add appears without corresponding resolve.

## Threat vs Danger Separation

1. Active threat: danger that can affect this or next scene immediately.
2. Danger thread: looming structural risk framed as prevention/avoidance.

Reconciler rule:
- If a `DANGER` thread text is immediate-present-tense scene hazard, reject as misclassified.

## Acceptance Criteria

1. Duplicate open loops are rejected deterministically.
2. Equivalent loops require explicit replace semantics.
3. Prompt examples and quality criteria enforce thread contract.
4. Threat-vs-danger confusion is reduced in regression fixtures.

## Required Tests

1. Unit: per-thread-type template/form validation.
2. Unit: near-duplicate detection thresholds.
3. Unit: replacement enforcement (must resolve old `td-*`).
4. Regression: fixture covering duplicate relationship and explanation loops.

## Outcome
- Completion date: 2026-02-11
- Actual changes vs original plan:
  - Core spec requirements were implemented incrementally through THRCONANDDEDSPE tickets, including prompt contract updates, deterministic reconciler dedup/replacement rules, danger-vs-threat rejection, and fixture-backed regression coverage.
  - Final regression fixture work was completed in `THRCONANDDEDSPE-05` without additional production reconciler changes.
- Deviations:
  - Regression coverage was consolidated into `test/unit/engine/state-reconciler.test.ts` with a dedicated fixture file rather than splitting into a separate unit test file.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/state-reconciler.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts` passed.
  - `npm run typecheck` passed.

# CONPACPIPIMP-008: Update evaluator scores, add redundancyCluster, make tasteProfile mandatory

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CONPACPIPIMP-001 (TasteProfile must have new fields for tasteAlignment scoring context)

## Problem

The evaluator has three deficiencies: (1) it never scores *taste alignment* — the primary product goal; (2) `antiGenericity` conflates surface novelty with structural originality; (3) `conceptUtility` is too vague to be actionable. Additionally, there's no mechanism for portfolio-level overlap detection, and `tasteProfile` being optional prevents taste alignment scoring.

## Assumption Reassessment (2026-03-25)

1. `ContentEvaluationScores` has 8 dimensions: `imageCharge`, `humanAche`, `socialLoadBearing`, `branchingPressure`, `antiGenericity`, `sceneBurst`, `structuralIrony`, `conceptUtility` — confirmed.
2. `ContentEvaluation` has `contentId`, `scores`, `strengths`, `weaknesses`, `recommendedRole` — confirmed; no `redundancyCluster`.
3. `ContentEvaluatorContext` has `tasteProfile?: TasteProfile` (optional) — confirmed.
4. `SCORE_DIMENSIONS` constant in schema file lists the 8 dimension keys — confirmed.
5. `SCORE_KEYS` in `content-evaluator-generation.ts` mirrors the 8 keys — confirmed; must be updated.
6. `isContentEvaluationScores` guard (if exists) checks all 8 fields — must be updated.
7. `isContentEvaluation` guard checks scores/strengths/weaknesses/recommendedRole — must add redundancyCluster.

## Architecture Check

1. This is a breaking change to `ContentEvaluationScores` (remove 2, add 4 dimensions). Net change: 8 → 10 dimensions.
2. Saved evaluations with old dimensions are handled by the persistence upcaster: set `evaluation` to `undefined` when old score keys are detected, allowing re-evaluation.
3. Making `tasteProfile` required on `ContentEvaluatorContext` is safe — all call sites already pass it (verify during implementation).

## What to Change

### 1. `ContentEvaluationScores` interface

Remove:
- `readonly antiGenericity: number;`
- `readonly conceptUtility: number;`

Add:
- `readonly tasteAlignment: number;`
- `readonly causalSpecificity: number;`
- `readonly surfaceFreshness: number;`
- `readonly deepOriginality: number;`

### 2. `ContentEvaluation` interface

Add:
```typescript
readonly redundancyCluster: string | null;
```

### 3. `ContentEvaluatorContext` interface

Change:
```typescript
readonly tasteProfile?: TasteProfile;
```
To:
```typescript
readonly tasteProfile: TasteProfile;
```

### 4. Type guards

Update `isContentEvaluationScores` (if exists) to check the 10 new dimension keys.
Update `isContentEvaluation` to include `redundancyCluster` validation (string or null).

### 5. Evaluator JSON schema

Update `SCORE_DIMENSIONS` constant:
- Remove: `'antiGenericity'`, `'conceptUtility'`
- Add: `'tasteAlignment'`, `'causalSpecificity'`, `'surfaceFreshness'`, `'deepOriginality'`

Add `redundancyCluster` property to evaluation object schema:
```json
{ "anyOf": [{ "type": "string" }, { "type": "null" }] }
```
Add to required array.

### 6. Evaluator response transformer

Update `SCORE_KEYS` constant in `content-evaluator-generation.ts`:
- Remove: `'antiGenericity'`, `'conceptUtility'`
- Add: `'tasteAlignment'`, `'causalSpecificity'`, `'surfaceFreshness'`, `'deepOriginality'`

Update `parseContentEvaluatorResponse()` to validate `redundancyCluster` is string or null.

### 7. Persistence upcaster for saved evaluations

In the content-packet repository's `parseEntity` hook, detect old evaluation scores (presence of `antiGenericity` or `conceptUtility` keys) and set `evaluation` to `undefined` to allow re-evaluation.

## Files to Touch

- `src/models/content-generation-contracts.ts` (modify)
- `src/llm/schemas/content-evaluator-schema.ts` (modify)
- `src/llm/content-evaluator-generation.ts` (modify)
- `src/models/saved-content-packet.ts` (modify)
- `test/unit/models/content-generation-contracts.test.ts` (modify)
- `test/unit/llm/content-evaluator.test.ts` (modify)
- `test/unit/models/saved-content-packet.test.ts` (modify)
- `test/unit/persistence/saved-content-packet-repository.test.ts` (modify)

## Out of Scope

- Evaluator prompt rewrite (CONPACPIPIMP-009)
- UI presenter/client-side score display changes (CONPACPIPIMP-010)
- TasteProfile field additions (CONPACPIPIMP-001)
- Prompt doc updates (CONPACPIPIMP-009)
- Any other pipeline stage

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `ContentEvaluationScores` with the 10 new dimensions typechecks; old dimension names are compile errors
2. Unit test: `ContentEvaluation` with `redundancyCluster: string | null` typechecks
3. Unit test: `ContentEvaluatorContext` requires `tasteProfile` (not optional)
4. Unit test: `SCORE_DIMENSIONS` has exactly 10 elements with correct names
5. Unit test: `parseContentEvaluatorResponse` accepts valid evaluations with 10 scores + redundancyCluster
6. Unit test: `parseContentEvaluatorResponse` accepts `redundancyCluster: null`
7. Unit test: `parseContentEvaluatorResponse` rejects evaluations missing new score dimensions
8. Unit test: Persistence upcaster clears evaluation when old score keys detected
9. Existing suite: `npm test` — all tests pass with updated mocks

### Invariants

1. Score values remain 0-5 integers for all dimensions
2. `recommendedRole` enum values unchanged
3. Schema `strict: true` mode is preserved
4. Saved packets with old evaluations load without errors (evaluation set to undefined)
5. `redundancyCluster` uses `anyOf` pattern (not mixed nullable) for Anthropic/Bedrock compatibility

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-generation-contracts.test.ts` — update ContentEvaluationScores mocks; add guard tests for new dimensions
2. `test/unit/llm/content-evaluator.test.ts` — update SCORE_DIMENSIONS assertion; add redundancyCluster validation tests; update all mock evaluations
3. `test/unit/models/saved-content-packet.test.ts` — add upcaster test for old evaluation detection
4. `test/unit/persistence/saved-content-packet-repository.test.ts` — test loading legacy packets with old evaluation scores

### Commands

1. `npm run test:unit -- --testPathPattern="content-generation-contracts|content-evaluator|saved-content-packet"`
2. `npm run typecheck && npm run lint && npm test`

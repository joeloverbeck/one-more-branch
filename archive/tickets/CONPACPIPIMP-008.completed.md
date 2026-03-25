# CONPACPIPIMP-008: Update evaluator scores, add redundancyCluster, make tasteProfile mandatory

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CONPACPIPIMP-001 (TasteProfile must have new fields for tasteAlignment scoring context)

## Problem

The evaluator has three deficiencies: (1) it never scores *taste alignment* — the primary product goal; (2) `antiGenericity` conflates surface novelty with structural originality; (3) `conceptUtility` is too vague to be actionable. Additionally, there's no mechanism for portfolio-level overlap detection, and `tasteProfile` being optional prevents taste alignment scoring.

## Assumption Reassessment (2026-03-25)

1. The relevant spec is [specs/content-packets-pipeline-improvements.md](../specs/content-packets-pipeline-improvements.md), not `specs/content-packets.md`.
2. Stages 1-3 from that spec are already implemented in this branch lineage:
   - `TasteProfile` already includes `engagementModes`, `valueTensions`, `deepPatterns`
   - `ContentSpark` already includes `playerRole`, `want`, `counterforce`, `deepPatternRef`
   - `ContentPacketContext` already uses mandatory `playerPosition`
3. `ContentEvaluationScores` still has the legacy 8 dimensions:
   `imageCharge`, `humanAche`, `socialLoadBearing`, `branchingPressure`, `antiGenericity`, `sceneBurst`, `structuralIrony`, `conceptUtility`.
4. `ContentEvaluation` still has `contentId`, `scores`, `strengths`, `weaknesses`, `recommendedRole`; there is no `redundancyCluster` yet.
5. `ContentEvaluatorContext` still makes `tasteProfile` optional even though the current pipeline always supplies it.
6. The evaluator contract is enforced in multiple places, not just the schema/parser:
   - model guards in `src/models/content-generation-contracts.ts`
   - prompt text in `src/llm/prompts/content-evaluator-prompt.ts`
   - saved asset validation in `src/models/saved-content-packet.ts` and `src/server/services/saved-content-packet-artifact.ts`
   - presenter/view-model consumers in `src/server/presenters/content-packet-card.ts`
   - route/service/client tests that hardcode evaluation payloads
7. Legacy saved-packet upcasting already exists in `src/persistence/saved-content-packet-repository.ts` for `viewpointPressure -> playerPosition`; evaluator-score upcasting must be added there, not only in the saved-model guard.

## Architecture Check

1. Replacing `antiGenericity` with `surfaceFreshness` + `deepOriginality` is architecturally better than the current design. The existing single score mixes two different failure modes: stock surface treatment and stock underlying structure.
2. Replacing `conceptUtility` with `causalSpecificity` is also better. The current label is vague and encourages hand-wavy evaluation; the proposed field directly tests whether the packet contains enough mechanism to generate scenes and choices.
3. Adding `tasteAlignment` is a net architectural improvement because the evaluator currently cannot score the product's primary success criterion, despite already receiving the taste profile in normal pipeline execution.
4. `redundancyCluster` is justified because overlap detection belongs with the evaluator's comparative judgment. A nullable pointer to the stronger packet is simpler and more extensible than introducing a separate overlap pass right now.
5. This is an intentional breaking contract change. No aliasing or dual-write support should be added. Current code and tests should be updated to the new architecture, and persisted legacy evaluations should be invalidated during load by clearing `evaluation`.
6. Mandatory `tasteProfile` on `ContentEvaluatorContext` is the right contract. The evaluator prompt already changes behavior when a taste profile is present, and the content-service pipeline already passes it. The optional type is weaker than the actual architecture.
7. The implementation should stay surgical. Do not broaden this ticket into unrelated stage rewrites, UI redesign, or a new persistence version unless the code proves that unavoidable.

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

In the content-packet repository's `parseEntity` hook, detect legacy evaluation scores (presence of `antiGenericity` or `conceptUtility` keys in `evaluation.scores`) and set `evaluation` to `undefined` to allow re-evaluation.

### 8. Prompt and presenter coherence

Update the evaluator prompt to describe the 10-dimension rubric and require `redundancyCluster`.

Update the existing server-side evaluation presenter/view-model registry so saved/generated cards render the new score labels and can expose `redundancyCluster` without breaking current consumers. This is maintenance of the current architecture, not a separate UI feature ticket.

## Files to Touch

- `src/models/content-generation-contracts.ts` (modify)
- `src/llm/schemas/content-evaluator-schema.ts` (modify)
- `src/llm/prompts/content-evaluator-prompt.ts` (modify)
- `src/llm/content-evaluator-generation.ts` (modify)
- `src/models/saved-content-packet.ts` (modify)
- `src/persistence/saved-content-packet-repository.ts` (modify)
- `src/server/presenters/content-packet-card.ts` (modify)
- `src/server/services/saved-content-packet-artifact.ts` (modify)
- `test/unit/models/content-generation-contracts.test.ts` (modify)
- `test/unit/llm/content-evaluator.test.ts` (modify)
- `test/unit/models/saved-content-packet.test.ts` (modify)
- `test/unit/persistence/saved-content-packet-repository.test.ts` (modify)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify)
- `test/unit/server/services/saved-content-packet-artifact.test.ts` (modify)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify)
- `test/unit/client/content-packets-page/controller.test.ts` (modify)
- `prompts/content-evaluator-prompt.md` (modify)

## Out of Scope

- Evaluator prompt rewrite (CONPACPIPIMP-009)
- Broad UI redesign beyond keeping the current presenter/rendering path coherent with the new evaluator contract
- TasteProfile field additions (CONPACPIPIMP-001)
- Stages 1-3 of the content-packets pipeline, which are already implemented here
- Any other pipeline stage or unrelated refactor

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `ContentEvaluationScores` with the 10 new dimensions typechecks; old dimension names are compile errors
2. Unit test: `ContentEvaluation` with `redundancyCluster: string | null` typechecks
3. Unit test: `ContentEvaluatorContext` requires `tasteProfile` (not optional)
4. Unit test: `SCORE_DIMENSIONS` has exactly 10 elements with correct names
5. Unit test: `parseContentEvaluatorResponse` accepts valid evaluations with 10 scores + redundancyCluster
6. Unit test: `parseContentEvaluatorResponse` accepts `redundancyCluster: null`
7. Unit test: `parseContentEvaluatorResponse` rejects evaluations missing new score dimensions
8. Unit test: `buildContentEvaluatorPrompt` always includes the taste profile and updated rubric/output contract
9. Unit test: Persistence upcaster clears evaluation when old score keys detected
10. Presenter/save-path tests using evaluation payloads pass with the new contract
11. Existing relevant suites plus repo-wide verification pass: `npm run typecheck`, `npm run lint`, relevant unit suites, and `npm test`

### Invariants

1. Score values remain 0-5 integers for all dimensions
2. `recommendedRole` enum values unchanged
3. Schema `strict: true` mode is preserved
4. Saved packets with old evaluations load without errors (evaluation set to undefined)
5. `redundancyCluster` uses `anyOf` pattern (not mixed nullable) for Anthropic/Bedrock compatibility

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-generation-contracts.test.ts` — update evaluation guard coverage for the 10-score contract and `redundancyCluster`
2. `test/unit/llm/content-evaluator.test.ts` — update prompt/schema/parser assertions for the new rubric, required taste profile, and `redundancyCluster`
3. `test/unit/models/saved-content-packet.test.ts` — update saved-evaluation validation to the new contract
4. `test/unit/persistence/saved-content-packet-repository.test.ts` — test loading legacy packets with old evaluation scores clears `evaluation`
5. `test/unit/server/presenters/content-packet-card.test.ts` — verify presenter score registry and redundancy rendering stay aligned
6. `test/unit/server/services/saved-content-packet-artifact.test.ts` — verify saved artifacts accept the new evaluation shape
7. Update any route/service/client tests that hardcode evaluator payloads so they exercise the new contract instead of stale score keys

### Commands

1. `npm run test:unit -- --runInBand --testPathPatterns="content-generation-contracts|content-evaluator|saved-content-packet|content-packet-card|saved-content-packet-artifact|content-packets-routes|content-service|content-packets-page/controller"`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completed: 2026-03-25
- Actual changes:
  - Replaced the evaluator's legacy `antiGenericity` / `conceptUtility` contract with `surfaceFreshness`, `deepOriginality`, `tasteAlignment`, and `causalSpecificity`
  - Added required `redundancyCluster` to `ContentEvaluation`
  - Made evaluator `tasteProfile` mandatory through the core evaluator contract and service-layer input
  - Tightened score validation to integer `0-5` in the model guard, schema, and parser
  - Added repository upcasting that clears legacy saved evaluations using removed score keys
  - Updated the server-side content-packet presenter so saved/generated cards preserve new evaluator metadata instead of dropping it
  - Updated the evaluator prompt source and prompt doc to match the new schema and ownership
  - Updated downstream tests and fixtures that hardcoded the legacy evaluator payload
- Deviations from original plan:
  - Expanded scope slightly to include the service-layer evaluator input contract and the presenter wrapper, because both were part of the real enforcement/consumption path
  - Kept this ticket focused on evaluator-contract coherence; no broader UI redesign or other pipeline-stage rewrites were done
- Verification:
  - `npm run test:unit -- --runInBand --testPathPatterns="content-generation-contracts|content-evaluator|saved-content-packet|content-packet-card|saved-content-packet-artifact|content-packets-routes|content-service|content-packets-page/controller"`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

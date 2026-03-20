# COMSTAMODCON-01: Complete Stage Model Config Coverage

**Status**: COMPLETED
**Spec**: `specs/complete-stage-model-config.md`
**Depends on**: None

## Reassessed Assumptions

- `src/config/llm-stage-registry.ts` currently defines 48 stages, not 49.
- `configs/default.json` currently defines 30 explicit `llm.models` entries, leaving 18 stages to fall back silently to `llm.defaultModel`.
- The missing stages are not limited to the character pipeline. They also include worldbuilding, per-page, conditional, and content stages.
- Existing tests cover runtime fallback behavior in `getStageModel()`, but there is no test that enforces config coverage against `LLM_STAGE_KEYS`.
- The current key order in `configs/default.json` does not match the registry order, which makes visual drift harder to detect during review.

## Why This Scope Changed

The original character-only slice would improve only part of the problem while preserving the same architectural weakness everywhere else: newly registered stages can remain silently unconfigured and still pass most tests because runtime fallback hides the drift.

The cleaner long-term architecture is:

- keep `getStageModel()` fallback as a resilience mechanism for partial or ad hoc configs
- make the checked-in default config complete and registry-aligned
- add a drift guard test so coverage stays complete as the registry evolves

This removes hidden configuration drift as a class of failure without changing runtime architecture or introducing aliases/backwards-compatibility shims.

## Description

Update the checked-in default stage-model config so every stage in `LLM_STAGE_KEYS` has an explicit `llm.models` entry in `configs/default.json`, using the current `defaultModel` value (`x-ai/grok-4.20-beta`).

Also add a unit test that asserts:

1. every stage in `LLM_STAGE_KEYS` exists in `configs/default.json` `llm.models`
2. `configs/default.json` `llm.models` contains no orphaned keys outside `LLM_STAGE_KEYS`
3. the config key order matches the registry order exactly

## Missing Entries To Add

| Key | Insert after |
|-----|--------------|
| `characterDecomposer` | `entityDecomposer` |
| `characterContextualizer` | `characterDecomposer` |
| `worldbuildingDecomposer` | `characterContextualizer` |
| `choiceGenerator` | `writer` |
| `structureRepair` | `structureRewrite` |
| `contentOneShot` | `spineRewrite` |
| `contentTasteDistiller` | `contentOneShot` |
| `contentSparkstormer` | `contentTasteDistiller` |
| `contentPacketer` | `contentSparkstormer` |
| `contentEvaluator` | `contentPacketer` |
| `characterWeb` | `contentEvaluator` |
| `charKernel` | `characterWeb` |
| `charTridimensional` | `charKernel` |
| `charAgency` | `charTridimensional` |
| `charRelationships` | `charAgency` |
| `charPresentation` | `charRelationships` |
| `worldbuildingSeed` | `charPresentation` |
| `worldbuildingElaboration` | `worldbuildingSeed` |

## Files To Touch

- `configs/default.json` — add the 18 missing `llm.models` entries and reorder keys to match `LLM_STAGE_KEYS`
- `test/unit/config/stage-model-config-coverage.test.ts` — new drift-prevention and ordering test
- `specs/complete-stage-model-config.md` — correct stale counts from `19 of 49` to `18 of 48`

## Out Of Scope

- Do NOT modify `src/config/llm-stage-registry.ts`
- Do NOT modify `src/config/stage-model.ts`
- Do NOT modify `src/config/schemas.ts`
- Do NOT modify generation logic
- Do NOT change model values away from `x-ai/grok-4.20-beta`
- Do NOT add aliasing, compatibility layers, or alternate config lookup paths

## Acceptance Criteria

### Tests that must pass

- `npm run build`
- `npm run lint`
- Relevant unit tests for config coverage and stage-model behavior

### Invariants that must remain true

- `configs/default.json` remains valid JSON
- `llm.models` has exactly 48 keys
- Every `LLM_STAGE_KEYS` entry has a corresponding `llm.models` entry
- `llm.models` contains no keys outside `LLM_STAGE_KEYS`
- Every `llm.models` value remains exactly `x-ai/grok-4.20-beta`
- `llm.models` key order matches `LLM_STAGE_KEYS`

## Outcome

- Completed on 2026-03-20.
- Updated `configs/default.json` to explicitly configure all 48 registered stages and reordered `llm.models` to match `LLM_STAGE_KEYS`.
- Added `test/unit/config/stage-model-config-coverage.test.ts` to prevent future registry/config drift and assert exact ordering.
- Corrected `specs/complete-stage-model-config.md` from `19 of 49` / `49` total to `18 of 48` / `48` total.
- Minor deviation from the original ticket: the work was expanded from a character-only slice to the full stage registry because the original scope left the same silent-drift architecture defect in place for the remaining pipelines.
- Verification: `npm run build`, `npm run lint`, `npm run test:unit -- --coverage=false test/unit/config/stage-model.test.ts test/unit/config/stage-model-config-coverage.test.ts test/unit/config/schemas.test.ts`, and `npx jest --runInBand --coverage=false test/integration/server/play-flow.test.ts test/unit/llm/llm-stage-runner.test.ts test/unit/config/stage-model-config-coverage.test.ts`.

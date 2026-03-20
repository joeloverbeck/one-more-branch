# Complete LLM Stage Model Config Coverage

**Status**: COMPLETED

## Problem

18 of 48 registered LLM stages in `src/config/llm-stage-registry.ts` lack explicit entries in `configs/default.json`'s `llm.models` map. These stages silently fall back to `defaultModel`, preventing independent model configuration.

## Missing Stages

Grouped by pipeline:

- **Character**: `characterDecomposer`, `characterContextualizer`, `characterWeb`, `charKernel`, `charTridimensional`, `charAgency`, `charRelationships`, `charPresentation`
- **World**: `worldbuildingDecomposer`, `worldbuildingSeed`, `worldbuildingElaboration`
- **Content**: `contentOneShot`, `contentTasteDistiller`, `contentSparkstormer`, `contentPacketer`, `contentEvaluator`
- **Per-page**: `choiceGenerator`
- **Conditional**: `structureRepair`

## Part 1 — Config Completion

- **File**: `configs/default.json`
- Add 18 entries to `llm.models`, each set to the current `defaultModel` value
- Order: match the order in `LLM_STAGE_KEYS` from `src/config/llm-stage-registry.ts`

## Part 2 — Drift Prevention Test

- **File**: new test in `test/unit/config/`
- Assert every key in `LLM_STAGE_KEYS` exists in the parsed `llm.models` of `configs/default.json`
- Prevents future silent drift when new stages are added to the registry

## Files to Modify

- `configs/default.json` — add 18 model entries
- `test/unit/config/` — new drift guard test

## No Code Changes Needed

- `src/config/stage-model.ts` — `getStageModel` already handles fallback
- `src/config/schemas.ts` — Zod schema already accepts all 48 keys dynamically
- Any generation file — all already call `getStageModel` with their stage name

## Verification

1. `npm run build` — typecheck passes
2. `npm test` — all tests pass including new guard test
3. Manually inspect `configs/default.json` has exactly 48 entries in `llm.models`
4. Remove one entry from `default.json` and verify the guard test fails

## Outcome

- Completion date: 2026-03-20
- Actual changes: added the missing explicit `llm.models` stage entries in `configs/default.json` and added `test/unit/config/stage-model-config-coverage.test.ts` to enforce full registry coverage and key ordering.
- Deviations from plan: the implemented guard also checks for orphaned entries and exact registry ordering, which is stricter than the minimum coverage check in the original spec.
- Verification results: `npm run test:unit -- --coverage=false test/unit/config/stage-model-config-coverage.test.ts` passed, and the run completed with 284 unit suites passing.

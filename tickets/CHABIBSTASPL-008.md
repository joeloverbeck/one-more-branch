# CHABIBSTASPL-008: Consolidate LLM stage definitions into a single typed catalog

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — config defaults, stage typing, stage-model resolution
**Deps**: None

## Problem

LLM stage definitions currently live in two manual places:

1. `src/config/llm-stage-registry.ts` defines the ordered `LLM_STAGE_KEYS` union.
2. `configs/default.json` must also enumerate every stage under `llm.models`, with tests enforcing exact registry parity.

This duplication is brittle. Adding or renaming a stage requires touching multiple files, and the failure mode is drift rather than a single obvious source of truth. The recent chat-stage split surfaced this directly: adding stage keys without matching `default.json` entries broke config-coverage tests.

## Assumption Reassessment (2026-03-28)

1. `LLM_STAGE_KEYS` in `src/config/llm-stage-registry.ts` is the compile-time source for `LlmStage`, prompt logging, and config schema key generation — **confirmed**.
2. `src/config/schemas.ts` derives allowed `llm.models`, `llm.stageMaxTokens`, and `llm.stageTemperatures` keys from `LLM_STAGE_KEYS` — **confirmed**.
3. `src/config/stage-model.ts` resolves model / token / temperature values entirely from runtime config, with no code-level fallback catalog beyond `defaultModel`, `maxTokens`, and `temperature` — **confirmed**.
4. `test/unit/config/stage-model-config-coverage.test.ts` enforces that `configs/default.json` contains an explicit `llm.models` entry for every stage and in registry order — **confirmed**.
5. `configs/default.json` is currently being used as both environment config and de facto second source of stage defaults — **confirmed**.
6. No existing ticket fully owns removing this duplication. `CHABIBSTASPL-006` touches adjacent stage-registration work, but it does not cover a general architectural cleanup of LLM-stage defaults and typing — **confirmed**.

## Architecture Check

1. The clean architecture is a typed stage catalog in source code, not a hand-maintained parallel list in `default.json`. Compile-time stage unions and default per-stage settings should derive from one module.
2. Runtime config should layer overrides on top of code-defined defaults. It should not be forced to redundantly restate every stage just to keep type coverage alive.
3. No backwards-compatibility shims or alias stage names. The refactor should keep the current stage keys but change ownership of defaults and typing.

## What to Change

### 1. Introduce a typed LLM stage catalog

Create a new source module, for example `src/config/llm-stage-catalog.ts`, that defines the ordered stage catalog.

Recommended shape:

```typescript
interface LlmStageCatalogEntry {
  readonly key: string;
  readonly defaultModel: string;
  readonly defaultMaxTokens?: number;
  readonly defaultTemperature?: number;
}
```

Expose:

- The ordered catalog entries
- `LLM_STAGE_KEYS`
- `LlmStage`

The catalog becomes the single code-level source of truth for stage identity and default per-stage overrides.

### 2. Rework stage-model resolution to use the catalog defaults

Update `src/config/stage-model.ts` so:

- `getStageModel(stage)` falls back to the catalog's `defaultModel` before falling back to global `defaultModel`
- `getStageMaxTokens(stage)` falls back to catalog per-stage defaults when present, otherwise global `maxTokens`
- `getStageTemperature(stage)` falls back to catalog per-stage defaults when present, otherwise global `temperature`

This preserves runtime override behavior while removing the need for `configs/default.json` to mirror every stage key.

### 3. Relax `configs/default.json` from full enumeration to explicit overrides

Update `configs/default.json` so `llm.models`, `llm.stageMaxTokens`, and `llm.stageTemperatures` only contain true overrides where needed, not a mandatory exhaustive copy of the catalog.

Update config tests accordingly:

- Remove the invariant that `default.json` must enumerate every stage
- Keep the invariant that any keys present must be valid stage keys
- Add coverage that catalog defaults resolve correctly for every stage

### 4. Update config schema and tests to align with the catalog model

Adjust tests so they verify:

- Every stage in the catalog resolves to a model, token budget, and temperature
- Optional config override maps accept only known stage keys
- Registry order and uniqueness are enforced by the catalog, not by JSON key order in `default.json`

### 5. Document the ownership model

Add a short note in the relevant config comments/tests explaining:

- Stage identity and default stage settings live in the catalog module
- `configs/default.json` is for deployment/runtime overrides, not stage enumeration

## Files to Touch

- `src/config/llm-stage-catalog.ts` (new)
- `src/config/llm-stage-registry.ts` (modify or replace with re-export)
- `src/config/stage-model.ts` (modify)
- `src/config/schemas.ts` (modify if imports move)
- `configs/default.json` (modify)
- `test/unit/config/stage-model-config-coverage.test.ts` (modify)
- `test/unit/config/stage-model.test.ts` (modify)
- `test/unit/config/schemas.test.ts` (modify if needed)

## Out of Scope

- Generation-stage UI metadata (`generation-stage-metadata.json`, sync script, client phrase pools)
- Renaming any existing LLM stage keys
- Chat pipeline rewiring or schema/prompt changes
- Changing how non-stage global defaults (`defaultModel`, `maxTokens`, `temperature`) work

## Acceptance Criteria

### Tests That Must Pass

1. `LlmStage` and `LLM_STAGE_KEYS` derive from the new stage catalog, not from a separate hand-maintained registry list.
2. Every catalog stage resolves to a non-empty model via `getStageModel()`, even if `configs/default.json` omits a per-stage entry.
3. Every catalog stage resolves to a valid max-token and temperature value via `getStageMaxTokens()` / `getStageTemperature()`.
4. `configs/default.json` may omit stage entries that simply use catalog defaults.
5. Config schema still rejects unknown stage keys in override maps.
6. `npm run typecheck`, `npm run lint`, and `npm test` pass.

### Invariants

1. There is exactly one typed source of truth for LLM stage identity and default per-stage settings.
2. Runtime config remains an override layer; it is not required to duplicate the full stage catalog.
3. No alias stages or temporary compatibility paths are introduced.

## Test Plan

### New/Modified Tests

1. `test/unit/config/stage-model-config-coverage.test.ts` — Replace JSON-enumeration assertions with catalog ownership assertions and override-map validation rationale.
2. `test/unit/config/stage-model.test.ts` — Verify every catalog stage resolves model/token/temperature values from catalog defaults plus config overrides.
3. `test/unit/config/schemas.test.ts` — Keep unknown-key rejection coverage and ensure sparse override maps remain valid.

### Commands

1. `npm test -- --runInBand --testPathPatterns="test/unit/config/(stage-model|stage-model-config-coverage|schemas)\.test\.ts"`
2. `npm run typecheck && npm run lint && npm test`

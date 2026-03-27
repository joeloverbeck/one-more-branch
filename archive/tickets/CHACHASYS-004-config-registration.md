# CHACHASYS-004: Chat LLM Stage Configuration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `src/config/llm-stage-registry.ts`, `src/config/schemas.ts`, `src/config/stage-model.ts`, `src/llm/llm-stage-runner.ts`, `configs/default.json`
**Deps**: None

## Problem

The 5 new chat LLM stages (`chatBible`, `chatPlanner`, `chatWriter`, `chatStateUpdater`, `chatSummarizer`) must be registered in the stage registry and configured before downstream chat generation tickets can compile or run.

The original ticket assumed stage-specific temperatures were already supported by the config layer. They are not. Today the app supports:

- per-stage `llm.models`
- per-stage `llm.stageMaxTokens`
- a single global `llm.temperature`
- optional per-call `options.temperature` overrides in `runLlmStage()`

Leaving chat-stage temperatures as future per-call literals would spread stage policy into generation modules and weaken the existing architecture. This ticket should add first-class `llm.stageTemperatures` support now so stage-specific runtime policy stays centralized alongside models and max-token limits.

## Assumption Reassessment (2026-03-27)

1. `src/config/llm-stage-registry.ts` exports `LLM_STAGE_KEYS` as a const array and `LlmStage` is derived from that array — confirmed.
2. `configs/default.json` already contains complete `llm.models` coverage for every registered stage, and test coverage asserts exact registry-order parity — confirmed.
3. `configs/default.json` currently contains `llm.stageMaxTokens` but does **not** contain `llm.stageTemperatures` — confirmed.
4. `src/config/schemas.ts` validates `llm.models` and `llm.stageMaxTokens` against `LLM_STAGE_KEYS`, but has no schema support for `llm.stageTemperatures` — confirmed.
5. `src/config/stage-model.ts` exposes `getStageModel()` and `getStageMaxTokens()`, but no stage-temperature accessor exists — confirmed.
6. `src/llm/llm-stage-runner.ts` resolves temperature from `params.options?.temperature ?? config.temperature`; therefore chat-stage temperature policy would otherwise be hardcoded in generation call sites — confirmed.

## Architecture Check

1. Do **not** append the new stage keys at the end of the registry. Keep them grouped with adjacent character/chat domain stages, immediately after `characterBrainstormer`, so registry order remains semantically organized.
2. Keep `configs/default.json` stage maps in the same order as `LLM_STAGE_KEYS`. Existing tests assert exact order equality.
3. Add first-class `llm.stageTemperatures` support instead of scattering chat-specific temperature literals across future generation modules.
4. Preserve the current override hierarchy:
   - explicit `runLlmStage({ options: { temperature } })`
   - configured `llm.stageTemperatures[stage]`
   - global `llm.temperature`
5. Config values for the 5 chat stages should match the character chat spec exactly.

## What to Change

### 1. Modify `src/config/llm-stage-registry.ts`

Insert 5 new stage keys into `LLM_STAGE_KEYS` immediately after `characterBrainstormer`:
```typescript
'chatBible',
'chatPlanner',
'chatWriter',
'chatStateUpdater',
'chatSummarizer',
```

### 2. Modify `configs/default.json`

Add the same 5 keys to `llm.models` in registry order:
```json
"chatBible": "anthropic/claude-sonnet-4.6",
"chatPlanner": "anthropic/claude-sonnet-4.6",
"chatWriter": "anthropic/claude-sonnet-4.6",
"chatStateUpdater": "x-ai/grok-4.20-beta",
"chatSummarizer": "x-ai/grok-4.20-beta"
```

Add to `llm.stageMaxTokens`:
```json
"chatBible": 3000,
"chatPlanner": 1000,
"chatWriter": 2000,
"chatStateUpdater": 2000,
"chatSummarizer": 1500
```

Add a new `llm.stageTemperatures` object with entries:
```json
"chatBible": 0.3,
"chatPlanner": 0.3,
"chatWriter": 0.7,
"chatStateUpdater": 0.2,
"chatSummarizer": 0.2
```

### 3. Extend config schema/runtime support

- Add `llm.stageTemperatures` validation to `src/config/schemas.ts`
- Add `getStageTemperature(stage: LlmStage)` to `src/config/stage-model.ts`
- Update `src/llm/llm-stage-runner.ts` to resolve default temperature through `getStageTemperature(stage)`

## Files to Touch

- `src/config/llm-stage-registry.ts` (modify)
- `src/config/schemas.ts` (modify)
- `src/config/stage-model.ts` (modify)
- `src/llm/llm-stage-runner.ts` (modify)
- `configs/default.json` (modify)
- `test/unit/config/schemas.test.ts` (modify)
- `test/unit/config/stage-model.test.ts` (modify)
- `test/unit/llm/llm-stage-runner.test.ts` (modify)
- `test/unit/config/stage-model-config-coverage.test.ts` (modify as needed for stage temperatures)

## Out of Scope

- LLM schemas, prompts, or generation code
- Any new files
- Persistence layer
- Server routes or UI
- Refactoring unrelated existing stages to use stage-specific temperatures

## Acceptance Criteria

### Tests That Must Pass

1. Typecheck: `LlmStage` includes `'chatBible' | 'chatPlanner' | 'chatWriter' | 'chatStateUpdater' | 'chatSummarizer'`
2. Config schema accepts `llm.stageTemperatures` entries for every valid stage and rejects unknown keys
3. `getStageTemperature()` returns stage-specific configured values and falls back to global `llm.temperature`
4. `runLlmStage()` uses stage-configured temperature when no explicit `options.temperature` override is provided
5. Coverage tests confirm `configs/default.json` contains explicit `llm.models` entries for all registered stages and no orphaned keys
6. Relevant unit suites pass
7. `npm run typecheck` passes
8. `npm run lint` passes

### Invariants

1. Existing stage keys are unchanged
2. `LlmStage` union type remains derived from `LLM_STAGE_KEYS` (no manual type duplication)
3. Per-stage runtime policy remains centralized in config, not hardcoded in chat generation modules
4. Explicit call-site overrides still win over configured per-stage defaults
5. Config values for the 5 chat stages match the spec exactly

## Test Plan

### New/Modified Tests

1. `test/unit/config/schemas.test.ts` — validate `llm.stageTemperatures` parsing and unknown-key rejection
2. `test/unit/config/stage-model.test.ts` — cover `getStageTemperature()` stage override and global fallback behavior
3. `test/unit/llm/llm-stage-runner.test.ts` — verify stage-configured temperature is sent when no explicit override is passed, and explicit override still wins
4. `test/unit/config/stage-model-config-coverage.test.ts` — extend coverage checks to `llm.stageTemperatures` if needed
5. Existing config coverage tests should continue to enforce registry/config parity for `llm.models`

### Commands

1. `npm run test:unit -- --runInBand --testPathPatterns=test/unit/config`
2. `npm run test:unit -- --runInBand --testPathPatterns=test/unit/llm/llm-stage-runner.test.ts`
3. `npm run typecheck`
4. `npm run lint`

## Outcome

- Completion date: 2026-03-27
- Actual changes:
  - Registered the 5 chat LLM stages in `src/config/llm-stage-registry.ts`
  - Added `llm.models`, `llm.stageMaxTokens`, and new `llm.stageTemperatures` entries for the chat stages in `configs/default.json`
  - Extended config schema/runtime support with `stageTemperatures`, `getStageTemperature()`, and runner integration so temperature policy stays centralized by stage
  - Strengthened config and runner tests to cover the new invariant and updated affected mocks/assertions
- Deviations from original plan:
  - Expanded scope beyond pure registration/config edits because the original ticket assumed `llm.stageTemperatures` already existed; implementing that support was required to keep stage policy declarative and avoid hardcoded per-call temperatures in downstream chat-stage tickets
  - Used existing config coverage tests instead of adding a redundant registry-only test
- Verification results:
  - `npm test` passed
  - `npm run typecheck` passed
  - `npm run lint` passed

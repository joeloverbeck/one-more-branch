# CHABRA-001: Register BRAINSTORMING_CHARACTERS generation stage

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — generation stage metadata, LLM stage registry
**Deps**: None (foundational ticket, all others depend on this)

## Problem

The character brainstormer needs a generation stage (`BRAINSTORMING_CHARACTERS`) for progress tracking (spinner UI) and model selection. This stage must be registered in the metadata-driven pipeline before any LLM or UI work can reference it.

## Assumption Reassessment (2026-03-25)

1. `GenerationStage` is auto-generated from `src/config/generation-stage-metadata.json` via `scripts/sync-stage-metadata.js` — NOT manually edited in `types.ts`.
2. Stage display names and phrase pools are auto-generated into `public/js/src/00-stage-metadata.js` — NOT `01-constants.js`.
3. Model selection uses `src/config/llm-stage-registry.ts` with `getStageModel()` — NOT direct stage-model.ts entries.
4. The spec says to edit `types.ts` and `01-constants.js` directly — this is INCORRECT. Must use the metadata-driven approach.

## Architecture Check

1. Using the metadata JSON + sync script approach is the established pattern. Manual edits to generated files would be overwritten.
2. No backwards-compatibility shims needed.

## What to Change

### 1. Add stage entry to generation-stage-metadata.json

Add a new entry to the array:

```json
{
  "id": "BRAINSTORMING_CHARACTERS",
  "displayName": "Brainstorming Characters",
  "phrases": [
    "Imagining distinctive souls...",
    "Crafting original personalities...",
    "Brainstorming unique character concepts...",
    "Dreaming up memorable characters..."
  ]
}
```

### 2. Run sync script

```bash
node scripts/sync-stage-metadata.js
```

This regenerates:
- `src/engine/generated-generation-stages.ts`
- `public/js/src/00-stage-metadata.js`

### 3. Add LLM stage key to llm-stage-registry.ts

Add `'characterBrainstormer'` (or the appropriate key format matching existing entries) to the LLM stage registry so `getStageModel()` can resolve a model for this stage.

### 4. Add default model mapping in configs/default.json (if needed)

If the registry requires an explicit model entry, add one under `llm.models`. Default fallback: `anthropic/claude-sonnet-4.5`.

## Files to Touch

- `src/config/generation-stage-metadata.json` (modify)
- `src/engine/generated-generation-stages.ts` (auto-regenerated)
- `public/js/src/00-stage-metadata.js` (auto-regenerated)
- `src/config/llm-stage-registry.ts` (modify)
- `configs/default.json` (modify — if model mapping needed)

## Out of Scope

- Prompt builder, schema, generation function (CHABRA-002 through CHABRA-004)
- Route handler, EJS template, client controller (CHABRA-005 through CHABRA-007)
- Header navigation (CHABRA-008)
- Any changes to existing generation stages or their metadata
- Changes to `01-constants.js` (auto-generated content lives in `00-stage-metadata.js`)

## Acceptance Criteria

### Tests That Must Pass

1. `npm run typecheck` passes — `BRAINSTORMING_CHARACTERS` is a valid `GenerationStage` value
2. `npm run lint` passes on all modified files
3. `npm run build` succeeds
4. Existing suite: `npm test` — no regressions

### Invariants

1. All existing generation stages remain unchanged in metadata, display names, and phrase pools
2. `GenerationStage` type includes `'BRAINSTORMING_CHARACTERS'` after sync
3. `getStageModel('characterBrainstormer')` returns a valid model string (default or configured)
4. `00-stage-metadata.js` contains `BRAINSTORMING_CHARACTERS` display name and phrases

## Test Plan

### New/Modified Tests

1. No new test files needed — this is metadata registration only. Verified by typecheck + build.

### Commands

1. `node scripts/sync-stage-metadata.js` — regenerate stage files
2. `npm run typecheck` — confirm type validity
3. `npm run build` — confirm compilation
4. `npm test` — no regressions

## Outcome

- **Completed**: 2026-03-25
- **Changes**:
  - Added `BRAINSTORMING_CHARACTERS` stage to `src/config/generation-stage-metadata.json` (14 spinner phrases)
  - Regenerated `src/engine/generated-generation-stages.ts` and `public/js/src/00-stage-metadata.js` via sync script
  - Added `'characterBrainstormer'` to `LLM_STAGE_KEYS` in `src/config/llm-stage-registry.ts`
  - Added `characterBrainstormer` model mapping (`anthropic/claude-sonnet-4.5`) in `configs/default.json`
  - Updated `test/unit/engine/types.test.ts` expected stages list
  - Regenerated `public/js/app.js` via concat script
- **Deviations**: Also needed `configs/default.json` model entry and test update — both required by existing test coverage that enforces registry/config parity
- **Verification**: typecheck pass, lint 0 errors, build success, 317 suites / 3681 tests all pass

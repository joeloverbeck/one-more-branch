# CHABIBSTASPL-008: Finish split chat-stage migration and centralize typed LLM stage defaults

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — chat pipeline orchestration, generation stage metadata, stage typing/default resolution
**Deps**: None (absorbs the unfinished chat-stage cleanup that was previously split across CHABIBSTASPL-005 and CHABIBSTASPL-006)

## Problem

The original version of this ticket assumed the repo still had one clean architectural problem: `LLM_STAGE_KEYS` and `configs/default.json` duplicated the LLM stage surface. That assumption is now incomplete.

The repo is in a half-migrated state:

1. The split chat context types, prompts, schemas, and generation functions already exist (`chatSceneContext`, `chatCharacterContext`).
2. The live chat pipeline still uses the legacy monolithic `chatBible` generation path.
3. Generation-stage metadata still exposes `CURATING_CHAT_BIBLE` instead of the two new generation stages.
4. LLM stage defaults still depend on an exhaustive `llm.models` map in `configs/default.json`, which keeps obsolete stage keys alive longer than they should.

That means introducing a typed catalog without first eliminating the legacy `chatBible` stage path would preserve dead architecture inside the new abstraction. The clean end-state is:

- no legacy `chatBible` LLM stage
- no legacy `CURATING_CHAT_BIBLE` generation stage
- split chat-scene/chat-character stages wired live end-to-end
- one typed source of truth for LLM stage identity and code-owned defaults
- runtime config limited to optional overrides

## Assumption Reassessment (2026-03-28)

1. `src/config/llm-stage-registry.ts` still contains `'chatBible'` in `LLM_STAGE_KEYS` even though split-stage keys also exist — **confirmed**.
2. `src/llm/chat/chat-scene-context-generation.ts` and `src/llm/chat/chat-character-context-generation.ts` already exist and are wired to dedicated prompts/schemas — **confirmed**.
3. `src/llm/chat/chat-pipeline.ts` still imports and calls `generateChatBible()` and reports `CURATING_CHAT_BIBLE` progress — **confirmed**.
4. `src/models/chat/chat-bible.ts` already exposes `assembleChatBible(scene, character)` — **confirmed**.
5. `src/config/generation-stage-metadata.json`, `src/engine/generated-generation-stages.ts`, and generated client stage metadata still expose `CURATING_CHAT_BIBLE` and do not expose `CURATING_CHAT_SCENE` / `CURATING_CHAT_CHARACTER` — **confirmed**.
6. `configs/default.json` still carries an exhaustive `llm.models` map and legacy `chatBible` stage overrides, while `stageMaxTokens` / `stageTemperatures` are already sparse maps — **confirmed**.
7. `test/unit/config/stage-model-config-coverage.test.ts` still enforces exhaustive `llm.models` coverage from JSON, which cements the duplication this ticket is supposed to remove — **confirmed**.
8. The highest-value architectural cleanup is not a catalog layered on top of the current state; it is a catalog introduced together with removal of the obsolete monolithic chat stage surface — **scope corrected**.

## Architecture Check

1. A typed source module should own LLM stage identity and code-defined per-stage defaults. A separate hand-maintained registry list plus exhaustive JSON map is weaker architecture.
2. The split chat-scene/chat-character path is already the intended architecture. Keeping `chatBible` as a live stage alongside it is unnecessary architectural debt.
3. Runtime config should remain an override layer only. It should not enumerate the entire stage catalog just to preserve type coverage.
4. No backwards-compatibility aliasing or deprecated stage names. Remove the old stage surfaces and update the code/tests to the new source of truth directly.

## What to Change

### 1. Introduce a typed LLM stage catalog

Create `src/config/llm-stage-catalog.ts` as the single typed source of truth for:

- ordered LLM stage identity
- optional per-stage default model overrides
- optional per-stage default max-token overrides
- optional per-stage default temperature overrides

Expose:

- `LLM_STAGE_CATALOG`
- `LLM_STAGE_KEYS`
- `LlmStage`
- helper lookup(s) for resolving catalog entries by stage key

`src/config/llm-stage-registry.ts` should become a compatibility-free re-export shim or be reduced to forwarding exports from the catalog module.

### 2. Remove the legacy monolithic chat-bible stage from the stage catalog surface

- Remove `'chatBible'` from the LLM stage catalog
- Keep `'chatSceneContext'` and `'chatCharacterContext'`
- Move any desired defaults that were previously attached to `chatBible` onto the split stages where appropriate

The repo should not retain both the old monolithic stage and the new split stages.

### 3. Rework stage-model resolution to use catalog defaults

Update `src/config/stage-model.ts` so:

- `getStageModel(stage)` resolves `config.llm.models?.[stage]`, then catalog per-stage model default, then global `defaultModel`
- `getStageMaxTokens(stage)` resolves `config.llm.stageMaxTokens?.[stage]`, then catalog per-stage token default, then global `maxTokens`
- `getStageTemperature(stage)` resolves `config.llm.stageTemperatures?.[stage]`, then catalog per-stage temperature default, then global `temperature`

### 4. Rewire the live chat pipeline to the split stages

Update `src/llm/chat/chat-pipeline.ts` so bible refresh performs:

1. `generateChatSceneContext(...)`
2. `generateChatCharacterContext(..., sceneContext, ...)`
3. `assembleChatBible(sceneContext, characterContext)`

and reports:

1. `CURATING_CHAT_SCENE`
2. `CURATING_CHAT_CHARACTER`

instead of `CURATING_CHAT_BIBLE`.

### 5. Remove obsolete monolithic chat-bible generation artifacts

Delete the legacy single-stage path:

- `src/llm/chat/chat-bible-generation.ts`
- `src/llm/schemas/chat-bible-schema.ts`
- `src/llm/prompts/chat/chat-bible-prompt.ts`
- the matching prompt doc and unit tests that exist only for that removed path

Update schema inventory / prompt-doc alignment tests so they reference only the split-stage prompt/schema surface.

### 6. Update generation-stage metadata and generated client artifacts

Update `src/config/generation-stage-metadata.json`:

- remove `CURATING_CHAT_BIBLE`
- add `CURATING_CHAT_SCENE`
- add `CURATING_CHAT_CHARACTER`

Then regenerate:

- `src/engine/generated-generation-stages.ts`
- `public/js/src/00-stage-metadata.js`
- `public/js/app.js`

### 7. Relax `configs/default.json` into true runtime overrides

After catalog defaults exist, `configs/default.json` should stop exhaustively enumerating stage models.

Specifically:

- remove the exhaustive `llm.models` map unless a real runtime override is still needed
- remove legacy `chatBible` overrides from `llm.stageMaxTokens` / `llm.stageTemperatures`
- keep only true override values that differ from code-owned defaults

### 8. Strengthen tests around the new ownership model

Tests should verify:

- every catalog stage resolves to a model/token/temperature
- override maps accept only known stage keys
- sparse or absent override maps are valid
- chat pipeline uses the split scene/character stages in order
- generation-stage progress uses the new split generation-stage IDs
- no deleted monolithic prompt/schema/generation artifacts remain referenced

## Files to Touch

- `src/config/llm-stage-catalog.ts` (new)
- `src/config/llm-stage-registry.ts` (modify to re-export from catalog)
- `src/config/stage-model.ts` (modify)
- `src/config/schemas.ts` (modify if imports move)
- `src/llm/chat/chat-pipeline.ts` (modify)
- `src/config/generation-stage-metadata.json` (modify)
- `src/engine/generated-generation-stages.ts` (auto-generated)
- `public/js/src/00-stage-metadata.js` (auto-generated)
- `public/js/app.js` (generated via concat)
- `configs/default.json` (modify)
- `src/llm/chat/chat-bible-generation.ts` (delete)
- `src/llm/schemas/chat-bible-schema.ts` (delete)
- `src/llm/prompts/chat/chat-bible-prompt.ts` (delete)
- `prompts/chat-bible-curator-prompt.md` (delete/replace with split docs)
- relevant config/chat prompt/schema/pipeline tests (modify)

## Out of Scope

- Strict-false grammar fallback work from CHABIBSTASPL-007
- Changing the `ChatBible` assembled runtime shape consumed downstream
- Reworking chat refresh cadence rules (`shouldRefreshChatBible()`)
- Unrelated refactors outside stage ownership, chat-stage migration, and the tests/docs they directly affect

## Acceptance Criteria

### Tests That Must Pass

1. `LlmStage` and `LLM_STAGE_KEYS` derive from the typed stage catalog.
2. The stage catalog does not expose `'chatBible'`.
3. The live chat pipeline does not import or call `generateChatBible()`.
4. The live chat pipeline refreshes via `generateChatSceneContext()` then `generateChatCharacterContext()`, then assembles `ChatBible`.
5. `GENERATION_STAGES` includes `CURATING_CHAT_SCENE` and `CURATING_CHAT_CHARACTER`, and excludes `CURATING_CHAT_BIBLE`.
6. Every catalog stage resolves to a non-empty model, valid max-token budget, and valid temperature.
7. `configs/default.json` may omit all stage override maps when code defaults are sufficient.
8. Config schema still rejects unknown keys in override maps.
9. No tests, docs, or source files reference deleted monolithic chat-bible prompt/schema/generation modules.
10. `npm run typecheck`, `npm run lint`, relevant targeted tests, and `npm test` pass.

### Invariants

1. There is exactly one typed source of truth for LLM stage identity.
2. There is exactly one live chat-bible generation architecture: split scene + character stages feeding `assembleChatBible()`.
3. Runtime config is an override layer, not a mandatory mirror of the full stage catalog.
4. No alias stage names or compatibility paths are introduced.

## Test Plan

### New/Modified Tests

1. `test/unit/config/stage-model-config-coverage.test.ts` — replace exhaustive JSON-enumeration assertions with catalog/default-resolution assertions and sparse-override validation
2. `test/unit/config/stage-model.test.ts` — verify model/token/temperature resolution uses override maps first, then catalog defaults, then global defaults
3. `test/unit/config/schemas.test.ts` — ensure sparse override maps are valid and unknown keys are rejected
4. `test/unit/llm/chat/chat-pipeline.test.ts` — verify scene stage, character stage, assembly, and split generation-stage progress ordering
5. `test/unit/engine/types.test.ts` — update generation-stage enum expectations
6. Prompt/schema alignment tests — remove monolithic chat-bible references and validate split-stage docs/schemas instead

### Commands

1. `node scripts/sync-stage-metadata.js`
2. `npm run concat:js`
3. `npm test -- --runInBand --testPathPatterns="test/unit/config/(stage-model|stage-model-config-coverage|schemas)\\.test\\.ts|test/unit/llm/chat/chat-pipeline\\.test\\.ts|test/unit/engine/types\\.test\\.ts|test/unit/llm/(prompt-doc-alignment|schemas/anthropic-schema-compatibility)\\.test\\.ts"`
4. `npm run typecheck`
5. `npm run lint`
6. `npm test`

## Outcome

- Completed: 2026-03-28
- Actual changes:
  - introduced `src/config/llm-stage-catalog.ts` and moved typed LLM stage identity/default ownership into code
  - removed the legacy `chatBible` LLM stage and rewired the live chat pipeline to `chatSceneContext` -> `chatCharacterContext` -> `assembleChatBible()`
  - replaced `CURATING_CHAT_BIBLE` with `CURATING_CHAT_SCENE` / `CURATING_CHAT_CHARACTER` in generation-stage metadata and regenerated client/engine artifacts
  - deleted the obsolete monolithic chat-bible prompt/schema/generation modules and replaced the prompt docs with split-stage docs
  - relaxed `configs/default.json` from exhaustive per-stage maps to global runtime defaults only
  - strengthened config, pipeline, prompt-doc, schema-inventory, and kernel-evaluator tests around the new ownership model
- Deviations from original plan:
  - absorbed the unfinished split-stage cleanup from the adjacent pending chat-stage tickets because the repo was in a half-migrated state and the catalog cleanup would have been weaker architecture without removing the obsolete path
  - kept `src/config/llm-stage-registry.ts` as a re-export shim instead of deleting it outright to avoid needless import churn while still removing duplicate ownership
- Verification:
  - `node scripts/sync-stage-metadata.js`
  - `npm run concat:js`
  - `npm test -- --runInBand --testPathPatterns="test/unit/config/(stage-model|stage-model-config-coverage|schemas)\\.test\\.ts|test/unit/llm/chat/chat-pipeline\\.test\\.ts|test/unit/engine/types\\.test\\.ts|test/unit/llm/(prompt-doc-alignment|llm-stage-runner)\\.test\\.ts|test/unit/llm/schemas/anthropic-schema-compatibility\\.test\\.ts"`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

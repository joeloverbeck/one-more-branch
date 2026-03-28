# CHABIBSTASPL-006: Register new chat generation stages and update metadata

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — stage registry, generation stages enum, client-side stage metadata
**Deps**: None (can be done early; required by CHABIBSTASPL-004 at runtime and CHABIBSTASPL-005 for pipeline)

## Problem

This ticket was originally written as the stage-registration implementation step for the chat-bible split. The codebase has since moved ahead: the split stages are already registered and used by the runtime pipeline. The remaining work for this ticket is to verify the final architecture, correct stale assumptions in the ticket, harden tests around the new canonical stage surface, and then close/archive the ticket.

## Assumption Reassessment (2026-03-28)

1. `src/config/llm-stage-registry.ts` no longer owns a literal `LLM_STAGE_KEYS` array. It re-exports from `src/config/llm-stage-catalog.ts`, which is now the canonical LLM stage source of truth — **ticket assumption was stale**.
2. The legacy `chatBible` LLM stage is already gone from the catalog; `chatSceneContext` and `chatCharacterContext` already exist with stage-specific defaults — **confirmed**.
3. `GENERATION_STAGES` in `src/engine/generated-generation-stages.ts` is still auto-generated from `src/config/generation-stage-metadata.json` by `scripts/sync-stage-metadata.js` — **confirmed**.
4. `generation-stage-metadata.json` no longer uses an object keyed by stage id. It uses a `stages` array of `{ id, displayName, phrases }` objects, and it already contains `CURATING_CHAT_SCENE` and `CURATING_CHAT_CHARACTER` while excluding `CURATING_CHAT_BIBLE` — **ticket assumption was stale**.
5. Client-side stage metadata in `public/js/src/00-stage-metadata.js` is auto-generated from the same JSON, and `public/js/app.js` is still regenerated from `public/js/src/*.js` via `node scripts/concat-client-js.js` — **confirmed**.
6. `src/config/stage-model.ts` no longer requires exhaustive per-stage config entries. Stage defaults resolve from `llm-stage-catalog`, with config override maps intentionally sparse — **ticket assumption was stale, architecture is cleaner than originally described**.
7. The chat pipeline already uses the split stages at runtime (`CURATING_CHAT_SCENE` then `CURATING_CHAT_CHARACTER`) and assembles the persisted `ChatBible` composite afterward — **confirmed**.
8. A residual naming smell remains: `src/llm/chat/chat-bible-context.ts` now represents shared input for the split pipeline rather than a single chat-bible generation call. Renaming that input contract would be cleaner, but it is not necessary to complete this ticket — **noted as follow-up, out of scope here**.

## Architecture Check

1. The current architecture is better than the ticket originally proposed: `llm-stage-catalog.ts` holds typed stage defaults, `generation-stage-metadata.json` drives generation-stage ids and client progress metadata, and config overrides stay sparse. That is cleaner and more extensible than manual duplication across registry and config files.
2. No backwards-compatibility aliasing should be introduced. The canonical surfaces are the split stages only.
3. This ticket no longer owns introducing the new split stages; it owns verifying that the old stage surface is fully absent from runtime-facing registry/metadata/generated artifacts and that tests explicitly guard that invariant.
4. This ticket should not reopen architecture by reintroducing per-stage config duplication or by rewriting already-correct generated files by hand.

## What to Change

### 1. Verify the current canonical surfaces

- Confirm `src/config/llm-stage-catalog.ts` exposes `chatSceneContext` and `chatCharacterContext`
- Confirm it does not expose `chatBible`
- Confirm `src/config/generation-stage-metadata.json`, `src/engine/generated-generation-stages.ts`, `public/js/src/00-stage-metadata.js`, and `public/js/app.js` expose the split generation stages and do not expose `CURATING_CHAT_BIBLE`

### 2. Harden tests around the canonical stage split

- Add or strengthen tests that explicitly assert presence of `chatSceneContext` / `chatCharacterContext`
- Add or strengthen tests that explicitly assert absence of `chatBible` / `CURATING_CHAT_BIBLE`
- Prefer tests against the typed catalog and generated artifacts over ad hoc search-and-replace expectations

### 3. Re-run generated artifacts only if inputs changed

- If any source metadata file changes, run:

```bash
node scripts/sync-stage-metadata.js
node scripts/concat-client-js.js
```

- Do not rewrite generated files unnecessarily if the source-of-truth inputs are already correct

### 4. Close the ticket once verification is complete

- Mark the ticket complete
- Archive it under `archive/tickets/`
- Record what was actually changed versus the original plan

## Files to Touch

- `tickets/CHABIBSTASPL-006.md` (modify first)
- `test/unit/config/stage-model-config-coverage.test.ts` (modify if needed)
- `test/unit/config/generation-stage-metadata.test.ts` (modify if needed)
- `test/unit/server/public/app.test.ts` (modify if needed)
- `test/unit/config/stage-model.test.ts` (modify if needed)
- `test/unit/engine/types.test.ts` (modify if needed)

## Out of Scope

- Re-implementing the chat stage split; the runtime code already did that
- Model, schema, prompt, generation-function, or pipeline rewiring work already covered by neighboring tickets
- Strict-false fallback work from `CHABIBSTASPL-007`
- Renaming `ChatBibleContext` to better reflect its new role as split-stage shared input
- Broader redesign of LLM stage catalog and config ownership beyond preserving the current cleaner catalog-based architecture

## Acceptance Criteria

### Tests That Must Pass

1. The LLM stage catalog includes `chatSceneContext` and `chatCharacterContext`.
2. The LLM stage catalog and exported `LLM_STAGE_KEYS` do not include `chatBible`.
3. `GENERATION_STAGES` includes `CURATING_CHAT_SCENE` and `CURATING_CHAT_CHARACTER`.
4. `GENERATION_STAGES` does not include `CURATING_CHAT_BIBLE`.
5. `generation-stage-metadata.json` contains the split chat generation stages with non-empty display names and phrase lists.
6. `public/js/src/00-stage-metadata.js` and `public/js/app.js` expose the split chat stage metadata and exclude the legacy generation stage.
7. `npm run typecheck` passes.
8. `npm run lint` passes.
9. Relevant targeted tests pass.

### Invariants

1. All other generation stages (story engine stages, other chat stages) are unchanged.
2. The `GenerationStage` type is a string literal union derived from the metadata JSON — no manual type overrides.
3. `LlmStage` is derived from the typed stage catalog — no manual type overrides.
4. The sync script remains the single source of truth for generation stage metadata.
5. Config override maps remain sparse; stage defaults come from the catalog rather than exhaustive duplication in `configs/default.json`.

## Test Plan

### New/Modified Tests

1. Strengthen config/catalog coverage so the split LLM stages are asserted explicitly and the legacy `chatBible` stage is asserted absent.
2. Strengthen generation-stage metadata coverage so the split generation stages are asserted explicitly and `CURATING_CHAT_BIBLE` is asserted absent.
3. Strengthen bundled client metadata coverage so the generated browser script exposes the split chat stage labels/phrases and excludes the legacy generation stage.

### Commands

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit -- --runInBand test/unit/config/stage-model-config-coverage.test.ts test/unit/config/generation-stage-metadata.test.ts test/unit/engine/types.test.ts test/unit/server/public/app.test.ts`
4. `npm run test:client`

## Outcome

- **Completed**: 2026-03-28
- **What actually changed**: The ticket was first corrected to match the current codebase. The stage split itself was already implemented in the runtime architecture, so the work here focused on reassessing stale assumptions, confirming the cleaner `llm-stage-catalog`-based design, and hardening tests around the canonical split stage surface.
- **Tests added/strengthened**:
  - `test/unit/config/stage-model-config-coverage.test.ts` now explicitly asserts `chatSceneContext` and `chatCharacterContext` are canonical and `chatBible` is absent.
  - `test/unit/config/generation-stage-metadata.test.ts` now explicitly asserts `CURATING_CHAT_SCENE` and `CURATING_CHAT_CHARACTER` are canonical and `CURATING_CHAT_BIBLE` is absent.
  - `test/unit/server/public/app.test.ts` now explicitly asserts the bundled client script exposes split chat stage metadata and excludes the legacy generation stage.
- **Deviation from original plan**: No registry, metadata, generated artifact, or pipeline code changes were required because those had already been completed before this ticket was reassessed. The original implementation-oriented scope was narrowed to verification, test hardening, and archival.
- **Verification**:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit -- --runInBand test/unit/config/stage-model-config-coverage.test.ts test/unit/config/generation-stage-metadata.test.ts test/unit/engine/types.test.ts test/unit/server/public/app.test.ts`
  - `npm run test:client`

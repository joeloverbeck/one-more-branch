# COMSTAMODCON-04: Add Missing Per-Page and Conditional Stage Models

**Status**: REJECTED
**Spec**: `specs/complete-stage-model-config.md`
**Depends on**: None

## Description

Add the 2 remaining missing stages to `configs/default.json`'s `llm.models` map: the `choiceGenerator` (per-page pipeline) and `structureRepair` (conditional pipeline). Each entry should use the current `defaultModel` value (`x-ai/grok-4.20-beta`). Insert them in the order they appear in `LLM_STAGE_KEYS`.

### Entries to add

| Key | Position in registry | Insert after |
|-----|---------------------|--------------|
| `choiceGenerator` | 26 | `writer` |
| `structureRepair` | 34 | `structureRewrite` |

## Files to touch

- `configs/default.json` — add 2 entries to `llm.models`

## Out of scope

- Do NOT modify `src/config/llm-stage-registry.ts`
- Do NOT modify `src/config/stage-model.ts`
- Do NOT modify `src/config/schemas.ts`
- Do NOT modify any generation files
- Do NOT add entries for stages covered by other tickets
- Do NOT change existing entries or their values

## Acceptance criteria

### Tests that must pass
- `npm run build` — typecheck passes
- `npm test` — all existing tests pass (no regressions)

### Invariants that must remain true
- All previously existing `llm.models` entries are unchanged
- Each new entry's value is exactly `"x-ai/grok-4.20-beta"`
- `configs/default.json` is valid JSON after edits
- The 2 new keys match the exact casing from `LLM_STAGE_KEYS`

## Outcome

- Archived on 2026-03-20 as superseded by `COMSTAMODCON-01`.
- The `choiceGenerator` and `structureRepair` entries were implemented in the unified full-registry fix tracked by `archive/tickets/COMSTAMODCON-01-complete-stage-model-config-coverage.md`.
- This standalone slice is no longer actionable because its scope has already been completed.

# COMSTAMODCON-06: Verify Final Config Order Matches Registry

**Status**: REJECTED
**Spec**: `specs/complete-stage-model-config.md`
**Depends on**: COMSTAMODCON-01, COMSTAMODCON-02, COMSTAMODCON-03, COMSTAMODCON-04, COMSTAMODCON-05

## Description

Final verification and ordering pass. After tickets 01-04 have added all 18 missing entries, reorder the `llm.models` keys in `configs/default.json` to match the exact order of `LLM_STAGE_KEYS` in `src/config/llm-stage-registry.ts`. This ensures the config is easy to cross-reference with the registry.

Also update the spec's count from "19 of 49" to the accurate "18 of 48" if not already corrected.

### Verification checklist

1. Count keys in `llm.models` — must equal 48 (matching `LLM_STAGE_KEYS.length`)
2. Key order matches `LLM_STAGE_KEYS` array order exactly
3. `npm run build` passes
4. `npm test` passes (including COMSTAMODCON-05 drift guard)
5. Remove one entry, confirm drift guard test fails, then restore

## Files to touch

- `configs/default.json` — reorder `llm.models` keys only (no value changes)
- `specs/complete-stage-model-config.md` — correct count from 19/49 to 18/48

## Out of scope

- Do NOT modify any source files
- Do NOT modify any test files (the drift guard from COMSTAMODCON-05 handles correctness)
- Do NOT change any model values — only key ordering
- Do NOT add or remove any entries

## Acceptance criteria

### Tests that must pass
- `npm run build` — typecheck passes
- `npm test` — all tests pass including drift guard
- Manual: removing one entry from `llm.models` causes drift guard to fail

### Invariants that must remain true
- `llm.models` has exactly 48 entries
- Every key in `LLM_STAGE_KEYS` is present
- No orphaned keys exist in `llm.models`
- All values remain `"x-ai/grok-4.20-beta"`
- `configs/default.json` is valid JSON

## Outcome

- Archived on 2026-03-20 as superseded by `COMSTAMODCON-01`.
- Final verification, spec count correction, and registry-order alignment were completed in the unified full-registry fix tracked by `archive/tickets/COMSTAMODCON-01-complete-stage-model-config-coverage.md`.
- This standalone ticket is no longer actionable because its scope has already been completed.

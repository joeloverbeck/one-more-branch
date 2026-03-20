# COMSTAMODCON-05: Add Drift Prevention Test

**Status**: REJECTED
**Spec**: `specs/complete-stage-model-config.md`
**Depends on**: COMSTAMODCON-01, COMSTAMODCON-02, COMSTAMODCON-03, COMSTAMODCON-04

## Description

Create a new test file that asserts every key in `LLM_STAGE_KEYS` (from `src/config/llm-stage-registry.ts`) has a corresponding entry in the parsed `llm.models` section of `configs/default.json`. This prevents future silent drift when new stages are added to the registry but forgotten in the config.

### Test file

- Path: `test/unit/config/stage-model-config-coverage.test.ts`
- Import `LLM_STAGE_KEYS` from `src/config/llm-stage-registry.ts`
- Read and parse `configs/default.json`
- Assert: for each key in `LLM_STAGE_KEYS`, that key exists in `parsedConfig.llm.models`
- Assert: the total number of keys in `llm.models` equals `LLM_STAGE_KEYS.length` (no orphaned config entries either)

### Test structure

```typescript
describe('stage-model config coverage', () => {
  it('every LLM_STAGE_KEYS entry has a corresponding llm.models entry in default.json', () => {
    // for each key in LLM_STAGE_KEYS, assert key exists in config.llm.models
  });

  it('default.json llm.models has no orphaned entries not in LLM_STAGE_KEYS', () => {
    // for each key in config.llm.models, assert key exists in LLM_STAGE_KEYS
  });
});
```

## Files to touch

- `test/unit/config/stage-model-config-coverage.test.ts` — **new file**

## Out of scope

- Do NOT modify `configs/default.json` (that's done in tickets 01-04)
- Do NOT modify `src/config/llm-stage-registry.ts`
- Do NOT modify `src/config/stage-model.ts`
- Do NOT modify `src/config/schemas.ts`
- Do NOT modify any existing test files
- Do NOT modify any generation files

## Acceptance criteria

### Tests that must pass
- `npm run build` — typecheck passes
- `npm test` — all tests pass, including the new drift guard test
- `npm run test:unit` — new test runs and passes

### Invariants that must remain true
- Removing any single entry from `configs/default.json`'s `llm.models` causes the first test to fail
- Adding an entry to `configs/default.json`'s `llm.models` that isn't in `LLM_STAGE_KEYS` causes the second test to fail
- Adding a key to `LLM_STAGE_KEYS` without a config entry causes the first test to fail
- The test file follows project conventions: `*.test.ts` naming, lives in `test/unit/config/`

## Outcome

- Archived on 2026-03-20 as superseded by `COMSTAMODCON-01`.
- The drift-prevention test was implemented as `test/unit/config/stage-model-config-coverage.test.ts` in the unified full-registry fix tracked by `archive/tickets/COMSTAMODCON-01-complete-stage-model-config-coverage.md`.
- This standalone ticket is no longer actionable because its deliverable already exists.

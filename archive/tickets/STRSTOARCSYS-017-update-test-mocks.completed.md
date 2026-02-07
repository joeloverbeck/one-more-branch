# STRSTOARCSYS-017: Update Remaining Legacy Test Mocks

## Status
Completed

## Corrected Assumptions
- Most migration work from `storyArc` to structure-based fields was already completed before this ticket pass.
- No broad helper extraction was needed; existing fixtures were already consistent in most suites.
- A small set of active test mocks still used legacy `storyArc` payloads for `GenerationResult` or continuation contexts.
- Legacy-compatibility assertions are intentional in a few tests (for parser/schema behavior) and are not part of this cleanup.

## Updated Scope
- Update only remaining active mocks that still modeled current-generation output with `storyArc`.
- Replace those payloads with:
  - `beatConcluded`
  - `beatResolution`
- Remove `storyArc` from non-legacy continuation context mocks.
- Do not modify production code.
- Do not change behavioral assertions unrelated to the migrated mock fields.
- Keep explicit legacy-compat tests that verify tolerant parsing/normalization.

## Files Touched
- `test/unit/llm/client.test.ts`
- `test/unit/llm/prompts.test.ts`
- `test/unit/llm/types.test.ts`
- `test/unit/llm/index.test.ts`
- `test/integration/llm/client.test.ts`
- `test/integration/server/play-flow.test.ts`
- `test/integration/engine/replay.test.ts`
- `test/e2e/engine/full-playthrough.test.ts`

## Acceptance Criteria
1. Unit tests pass (`npm run test:unit`).
2. Integration tests pass (`npm run test:integration`).
3. TypeScript build type-check passes (`npm run typecheck`).
4. No remaining active `storyArc` mocks outside intentional legacy-compat tests.

## Outcome
- Re-scoped ticket from “update all mocks everywhere” to “remove residual legacy mocks only.”
- Updated only the remaining targeted test fixtures while preserving compatibility-focused tests.
- Verified affected suites pass after changes.

## Dependencies
- Completed after model/schema migrations had already landed.

# BEANAMSTRANDPLADIS-03: Enforce beat name in parse, structure factory, and rewrite merge

## Status
**Status**: ✅ COMPLETED

## Summary
Wire required beat names through parse/typed result paths and structure assembly, and preserve names on completed beats during rewrites.

## Reassessed assumptions
- `StoryBeat.name` is already present and required in domain model/types.
- Parse paths already require beat `name` in both generation and rewrite parsers.
- Structure factory already maps generated beat `name` into `StoryBeat`.
- LLM schema already requires beat `name` and `role`.
- `CompletedBeat` already includes `name`.
- Targeted tests currently pass, but some test fixtures are stale relative to current contracts and do not fully assert rewrite preservation invariants.

## Updated file scope
- `src/engine/structure-rewriter.ts` (only if needed for preservation invariants)
- `src/llm/structure-generator.ts`
- `src/engine/structure-factory.ts`
- `test/unit/llm/structure-generator.test.ts`
- `test/unit/engine/structure-factory.test.ts`
- `test/unit/engine/structure-rewriter.test.ts`
- `test/integration/engine/structure-modules.test.ts`

## Updated implementation checklist
1. Keep existing parse/factory `name` behavior unchanged.
2. Confirm rewrite merge preserves completed beat identity/metadata (`id`, `name`, completion-relevant fields) while still mapping regenerated beat names.
3. Tighten tests to explicitly assert required-name and rewrite-preservation invariants using current contracts.

## Out of scope
- Do not edit prompt text or schema files (handled in another ticket).
- Do not edit persistence serialization/deserialization.
- Do not edit play view helpers/templates.
- Do not introduce backward-compatible fallback logic for missing names.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/structure-generator.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/structure-factory.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/structure-rewriter.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/structure-modules.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Missing beat `name` is treated as invalid structure data and fails fast.
- Completed beats retained during rewrite keep their original `id`, `name`, and completion semantics.
- Rewrite behavior for non-beat-name fields remains unchanged.

## Outcome
- Completion date: February 10, 2026.
- What changed:
  - Updated `mergePreservedWithRegenerated` to preserve completed beat `beatId` and `role`, while still appending regenerated beats with non-colliding hierarchical IDs.
  - Updated fixtures in `structure-factory` and integration tests to align with current beat contract (`name`, `role`, `premise`, `pacingBudget`).
  - Added rewrite-merge test coverage for preserved ID stability when preserved beats are non-leading within an act.
- Deviations from original plan:
  - No changes were needed in `src/llm/structure-generator.ts` or `src/engine/structure-factory.ts`; those assumptions were already satisfied before this ticket.
  - Work focused on rewrite-merge invariants and test contract alignment.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/structure-generator.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/structure-factory.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/structure-rewriter.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/engine/structure-modules.test.ts`
  - `npm run typecheck`

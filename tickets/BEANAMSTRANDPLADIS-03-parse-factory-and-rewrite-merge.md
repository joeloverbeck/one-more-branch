# BEANAMSTRANDPLADIS-03: Enforce beat name in parse, structure factory, and rewrite merge

## Summary
Wire required beat names through parse/typed result paths and structure assembly, and preserve names on completed beats during rewrites.

## File list it expects to touch
- `src/llm/structure-generator.ts`
- `src/engine/structure-types.ts`
- `src/engine/structure-factory.ts`
- `src/engine/structure-rewriter.ts`
- `test/unit/llm/structure-generator.test.ts`
- `test/unit/engine/structure-factory.test.ts`
- `test/unit/engine/structure-rewriter.test.ts`
- `test/integration/engine/structure-modules.test.ts`

## Implementation checklist
1. Add `name` to beat result types parsed from structure responses.
2. Reject structures where any beat is missing `name` with parse error behavior.
3. Map generated beat `name` into `StoryBeat` in structure factory assembly.
4. Ensure rewrite merge preserves existing completed beat names and maps regenerated names.
5. Update unit/integration tests to assert required-name behavior.

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


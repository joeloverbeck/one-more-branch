# BEANAMSTRANDPLADIS-04: Persist beat names in active and versioned structures

## Summary
Update story persistence conversion so beat `name` is stored and restored in both `structure` and `structureVersions[*].structure`.

## File list it expects to touch
- `src/persistence/story-repository.ts`
- `test/unit/persistence/story-repository.test.ts`
- `test/integration/persistence/story-repository.test.ts`

## Implementation checklist
1. Add beat `name` to persisted beat file shape definitions.
2. Include `name` in serialize/deserialize conversion logic for active structure.
3. Include `name` in serialize/deserialize conversion logic for versioned structures.
4. Update repository tests for round-trip and required-field expectations.

## Out of scope
- Do not modify LLM prompt/schema contracts.
- Do not modify parse/generator/rewrite logic.
- Do not add migration or compatibility logic for legacy stories lacking beat names.
- Do not modify server play template rendering.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/persistence/story-repository.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/persistence/story-repository.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Persisted beat shape remains `id`, `name`, `description`, `objective`, `role`.
- Both active structure and every versioned structure include beat names.
- No fallback/default values are injected for missing beat names.


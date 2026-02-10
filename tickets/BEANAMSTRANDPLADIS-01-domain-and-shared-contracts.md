# BEANAMSTRANDPLADIS-01: Add required beat name to domain and shared contracts

## Summary
Introduce `StoryBeat.name` as a required field in core domain and shared contracts used by structure rewrite context.

## File list it expects to touch
- `src/models/story-arc.ts`
- `src/llm/types.ts`
- `src/engine/structure-types.ts`
- `test/unit/models/structure-version.test.ts`
- `test/unit/engine/structure-state.test.ts`
- `test/fixtures/active-state.ts`

## Implementation checklist
1. Add required `name: string` to `StoryBeat`.
2. Add required `name: string` to `CompletedBeat`.
3. Update any shared structure typing that constructs or re-exports beat objects.
4. Update local fixtures and unit tests that instantiate beats/completed beats.

## Out of scope
- Do not change prompt text or LLM schemas.
- Do not change parser behavior or error handling.
- Do not change persistence conversion logic.
- Do not change play header rendering.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/models/structure-version.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/structure-state.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/structure-rewrite-support.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/continuation/writer-structure-context.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- `StoryBeat.id` remains the canonical beat label (for example `1.1`).
- Beat `name` is required and typed as non-optional across shared contracts.
- No fallback/default name generation is introduced in type-level code.


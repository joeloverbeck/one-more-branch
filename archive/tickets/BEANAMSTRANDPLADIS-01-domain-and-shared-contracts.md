# BEANAMSTRANDPLADIS-01: Add required beat name to domain and shared contracts

**Status**: ✅ COMPLETED

## Summary
Introduce `StoryBeat.name` as a required field in core domain and shared contracts used by structure rewrite context.

## Assumption Reassessment (2026-02-10)
- `test/fixtures/active-state.ts` is not connected to structure beat/domain contracts and is out of scope for this ticket.
- `src/engine/structure-factory.ts` is in scope because it constructs `StoryBeat` objects directly from generation result payloads.
- `src/engine/structure-rewrite-support.ts` is in scope because it creates `CompletedBeat` values from concluded `StoryBeat`s.
- `test/unit/engine/structure-rewrite-support.test.ts` is in scope because it asserts `CompletedBeat` shape.
- `src/engine/structure-rewriter.ts` local parse path is in scope to keep shared structure typing coherent once beat `name` is required.

## Updated file list (minimal)
- `src/models/story-arc.ts`
- `src/llm/types.ts`
- `src/engine/structure-types.ts`
- `src/engine/structure-factory.ts`
- `src/engine/structure-rewrite-support.ts`
- `src/engine/structure-rewriter.ts`
- `src/persistence/story-repository.ts`
- `test/unit/models/structure-version.test.ts`
- `test/unit/engine/structure-state.test.ts`
- `test/unit/engine/structure-rewrite-support.test.ts`
- `test/unit/llm/prompts/continuation/writer-structure-context.test.ts`
- `test/unit/persistence/story-repository.test.ts`

## Implementation checklist
1. Add required `name: string` to `StoryBeat`.
2. Add required `name: string` to `CompletedBeat`.
3. Update shared structure generation typing and constructors that create `StoryBeat`/`CompletedBeat` values.
4. Update persistence mapping for structure beats so file shape includes `name`.
5. Update local fixtures and unit tests that instantiate beats/completed beats.

## Out of scope
- Do not change prompt text or LLM schemas.
- Do not change play header rendering.

### Scope clarification
- Minimal parser updates in `src/engine/structure-rewriter.ts` are allowed only to keep required `name` coherent in shared typed contracts (no prompt/schema changes).

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

## Outcome
- Completion date: 2026-02-10
- What changed:
  - Added required `name` to `StoryBeat`, `CompletedBeat`, and shared generation beat contracts.
  - Updated structure construction/rewrite/persistence paths to carry `beat.name` through (`structure-factory`, `structure-rewrite-support`, `structure-rewriter`, `story-repository`, `structure-generator`).
  - Updated and strengthened unit tests to include required beat names and assert preservation behavior, including a new invariant test that preserved-beat name changes fail validation.
- Deviations from original plan:
  - `test/fixtures/active-state.ts` was removed from scope because it is unrelated to beat contracts.
  - `src/engine/structure-factory.ts`, `src/engine/structure-rewrite-support.ts`, `src/engine/structure-rewriter.ts`, and `src/persistence/story-repository.ts` were added to scope because they construct/transport beat shapes directly.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/models/structure-version.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/structure-state.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/structure-rewrite-support.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/continuation/writer-structure-context.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/structure-generator.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/structure-rewriter.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/persistence/story-repository.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
  - `npm run typecheck`

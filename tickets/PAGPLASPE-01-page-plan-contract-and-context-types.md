# PAGPLASPE-01: Add `PagePlan` and Planner Context Types

## Summary
Introduce the core planner data contracts in `src/llm/types.ts` so downstream prompt/schema/generation work has stable compile-time types.

## Depends on
- None

## Blocks
- PAGPLASPE-02
- PAGPLASPE-03
- PAGPLASPE-04
- PAGPLASPE-05
- PAGPLASPE-06

## File list it expects to touch
- `src/llm/types.ts`
- `src/llm/index.ts`
- `test/unit/llm/types.test.ts`
- `test/unit/llm/index.test.ts`

## Implementation checklist
1. Add `PagePlan` type exactly matching Spec 09 required fields.
2. Add planner-specific context types for opening and continuation and a discriminated union `PagePlanContext`.
3. Add planner generation result type including `rawResponse` for observability parity.
4. Export new planner types through `src/llm/index.ts` barrel.
5. Add/adjust unit tests for type-level usage and barrel exports.

## Out of scope
- Implementing planner prompt construction.
- Implementing planner JSON schema or zod validation.
- Calling OpenRouter for planner generation.
- Any changes to writer output contract from Spec 10.
- Engine integration in `page-service`.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Existing `WriterResult`, `AnalystResult`, and `GenerationOptions` contracts remain backward-compatible.
- No runtime behavior changes are introduced in this ticket; this is type and export surface only.
- Barrel exports for existing symbols remain unchanged.

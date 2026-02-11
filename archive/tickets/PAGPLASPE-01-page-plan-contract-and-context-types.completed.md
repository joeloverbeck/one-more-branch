**Status**: ✅ COMPLETED

# PAGPLASPE-01: Add `PagePlan` and Planner Context Types

## Summary
Introduce the core planner data contracts in `src/llm/types.ts` so downstream prompt/schema/generation work has stable compile-time types.

## Assumption Reassessment (2026-02-11)
- Spec 09 currently shows `stateIntents.characterState.replace.add` as `{ characterName: string; state: string }`.
- Existing writer/reconciler contracts in this repo use `states: string[]` for character-state additions (`WriterResult.characterStateChangesAdded`, Spec 11).
- This ticket standardizes planner character-state additions (including `replace.add`) to `{ characterName: string; states: string[] }` for internal consistency and to avoid downstream adapter churn.
- No runtime behavior should change in this ticket; only TypeScript contracts + barrel type exports + unit tests.

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
1. Add `PagePlan` type matching Spec 09 required fields, with `characterState.replace.add` standardized to `{ characterName: string; states: string[] }`.
2. Add planner-specific context types for opening and continuation and a discriminated union `PagePlanContext`.
3. Add planner generation result type (`PagePlanGenerationResult`) including `rawResponse` for observability parity.
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
- Planner type additions must not force changes in writer-only prompt/client call signatures in this ticket.

## Outcome
- Completion date: 2026-02-11
- Actual changes:
  - Added planner contracts in `src/llm/types.ts`: `PagePlan`, planner intent helper types, `OpeningPagePlanContext`, `ContinuationPagePlanContext`, `PagePlanContext`, and `PagePlanGenerationResult`.
  - Exported new planner types via `src/llm/index.ts` without changing existing runtime exports.
  - Added type-usage coverage for new planner contracts in `test/unit/llm/types.test.ts` and `test/unit/llm/index.test.ts`.
- Deviations from original plan:
  - Clarified and implemented a spec inconsistency: standardized `characterState.replace.add` to `states: string[]` (instead of `state: string`) to match existing contract direction and Spec 11.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts test/unit/llm/index.test.ts`
  - `npm run typecheck`

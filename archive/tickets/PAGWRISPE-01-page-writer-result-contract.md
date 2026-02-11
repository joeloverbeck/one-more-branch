# PAGWRISPE-01: Introduce Creative-Only `PageWriterResult` Contract
**Status**: ✅ COMPLETED

## Summary
Create a dedicated writer output contract for creative content only, without state or canon mutation fields, while keeping the codebase compiling during migration.

## Reassessed assumptions (2026-02-11)
- The codebase still uses `WriterResult` broadly across writer schema/validation, result merging, and engine flows.
- Runtime writer generation is already delegated to `src/llm/writer-generation.ts`; `src/llm/client.ts` is an orchestration layer.
- Introducing `PageWriterResult` should be additive in this ticket. Replacing `WriterResult` everywhere is a larger migration and not required here.
- Existing writer schema currently includes state/canon fields; removing them is tracked in spec work but not in this ticket.
- Barrel export coverage includes `test/unit/llm/index.test.ts`, so type-export changes should include that test.

## File list it expects to touch
- `src/llm/types.ts`
- `src/llm/index.ts`
- `test/unit/llm/types.test.ts`
- `test/unit/llm/index.test.ts`

## Implementation checklist
1. Add `PageWriterResult` in `src/llm/types.ts` with only:
   - `narrative`
   - `choices`
   - `sceneSummary`
   - `protagonistAffect`
   - `isEnding`
   - `rawResponse`
2. Keep compatibility during migration by introducing a type-level compatibility bridge so existing `WriterResult` users continue compiling unchanged.
3. Update type exports in `src/llm/index.ts` to expose `PageWriterResult`.
4. Update compile-time type tests to cover:
   - `PageWriterResult` shape excludes state/canon fields.
   - `WriterResult` remains assignable and still includes legacy fields for compatibility.
5. Update barrel export tests so `PageWriterResult` is available through `src/llm/index.ts`.

## Out of scope
- Do not change runtime generation logic in `src/llm/client.ts` yet.
- Do not change runtime generation logic in `src/llm/writer-generation.ts`.
- Do not change writer JSON schema in this ticket.
- Do not implement reconciler/state-derivation behavior.
- Do not update page assembly in engine layer.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/index.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Choice object contract remains `text + choiceType + primaryDelta`.
- `protagonistAffect` remains required and strongly typed.
- No behavioral/runtime change to writer API calls yet.
- Existing `WriterResult` contract remains available during migration.
- Existing planner contracts (`PagePlan`, `PagePlanGenerationResult`) remain unchanged.

## Outcome
- Completed on: 2026-02-11
- What was changed:
  - Added `PageWriterResult` in `src/llm/types.ts` with creative-only fields.
  - Kept `WriterResult` as a compatibility type by extending `PageWriterResult` and retaining existing state/canon fields.
  - Exported `PageWriterResult` through `src/llm/index.ts`.
  - Updated type-focused tests to cover creative-only shape and compatibility.
- Deviations from original plan:
  - Scope was corrected before implementation: this ticket did not remove runtime/schema state fields; it introduced the new type contract additively.
  - Test scope was corrected to type-focused suites (`types` + barrel `index`) rather than requiring unrelated runtime behavior changes.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts test/unit/llm/index.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/llm/client.test.ts`
  - `npm run typecheck`

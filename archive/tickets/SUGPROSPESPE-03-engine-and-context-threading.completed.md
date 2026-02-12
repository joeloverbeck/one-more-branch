# SUGPROSPESPE-03: Thread suggested speech through engine continuation context only

## Status
**Status**: ✅ COMPLETED

## Summary
Thread optional `suggestedProtagonistSpeech` from `makeChoice` into continuation generation context for writer calls only, without persistence side effects.

## Assumption reassessment (2026-02-12)
- Already implemented outside this ticket:
  - Route contract + normalization/validation in `src/server/routes/play.ts`.
  - Route-level tests for trim/length/undefined behavior in `test/unit/server/routes/play.test.ts`.
  - Integration coverage that sends the field in `test/integration/server/play-flow.test.ts`.
- Not yet implemented (actual gap this ticket must close):
  - `StoryEngine.makeChoice(...)` does not pass `suggestedProtagonistSpeech` to page generation.
  - `getOrGeneratePage(...)`/`generateNextPage(...)` do not accept/thread this field.
  - `ContinuationContext` in `src/llm/types.ts` does not include this optional field.
  - No direct assertions in engine tests that the value reaches continuation writer context.

## Depends on
- `tickets/SUGPROSPESPE-02-route-choice-contract-and-validation.md`

## Blocks
- `tickets/SUGPROSPESPE-04-continuation-prompt-instruction-block.md`

## File list it expects to touch
- `src/engine/types.ts`
- `src/engine/story-engine.ts`
- `src/engine/page-service.ts`
- `src/llm/types.ts`
- `test/unit/engine/story-engine.test.ts`
- `test/unit/engine/page-service.test.ts`
- `test/unit/llm/types.test.ts`
- `test/integration/server/play-flow.test.ts`

## Implementation checklist
1. Add optional `suggestedProtagonistSpeech?: string` to `MakeChoiceOptions`.
2. Pass the field through `storyEngine.makeChoice(...)` into page-generation flow.
3. Include field in continuation context assembly for writer generation only.
4. Keep field optional and no-op when absent.
5. Ensure no persistence call writes the field to story/page data.

## Out of scope
- Prompt instruction wording/content.
- Opening-generation flow.
- Planner-generation flow.
- Route-level validation logic (already covered by SUGPROSPESPE-02).

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/engine/story-engine.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/types.test.ts`
- `npm run test:integration -- --coverage=false --runTestsByPath test/integration/server/play-flow.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/story-repository.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/page-repository.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Story/page persistence schema remains unchanged.
- Existing generation behavior is unchanged when field is not provided.
- Branch replay behavior (`wasGenerated: false`) remains functionally unchanged.

## Outcome
- Completion date: 2026-02-12
- What changed:
  - Threaded `suggestedProtagonistSpeech` from `StoryEngine.makeChoice(...)` into `getOrGeneratePage(...)` and `generateNextPage(...)`.
  - Added optional `suggestedProtagonistSpeech?: string` to `ContinuationContext` so continuation writer context can carry the field.
  - Added/updated assertions in unit/integration tests to verify pass-through and trim-preserving behavior at writer call boundaries.
- Deviations from original plan:
  - `MakeChoiceOptions` already contained `suggestedProtagonistSpeech`, so checklist item 1 was pre-satisfied and required no new code change.
  - Route contract/validation work was already implemented by SUGPROSPESPE-02 and remained out of scope.
- Verification results:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/engine/story-engine.test.ts` passed.
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/engine/page-service.test.ts` passed.
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/types.test.ts` passed.
  - `npm run test:integration -- --coverage=false --runTestsByPath test/integration/server/play-flow.test.ts` passed.
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/story-repository.test.ts` passed.
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/page-repository.test.ts` passed.
  - `npm run typecheck` passed.

# SUGPROSPESPE-03: Thread suggested speech through engine continuation context only

## Status
**Status**: 📝 DRAFT

## Summary
Extend engine and LLM context types so optional suggested speech can flow from `makeChoice` to continuation generation context without persistence side effects.

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
- `test/unit/llm/types.test.ts` (if needed for type-contract assertions)

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
- Route-level validation logic.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/engine/story-engine.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/story-repository.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/persistence/page-repository.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Story/page persistence schema remains unchanged.
- Existing generation behavior is unchanged when field is not provided.
- Branch replay behavior (`wasGenerated: false`) remains functionally unchanged.

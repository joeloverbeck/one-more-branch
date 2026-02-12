# SUGPROSPESPE-04: Add continuation-only suggested speech instruction block

## Status
**Status**: 📝 DRAFT

## Summary
Update continuation prompt composition to conditionally include guidance for suggested protagonist speech, with advisory semantics and natural adaptation language.

## Depends on
- `tickets/SUGPROSPESPE-03-engine-and-context-threading.md`

## Blocks
- `tickets/SUGPROSPESPE-05-integration-and-regression-verification.md`

## File list it expects to touch
- `src/llm/prompts/continuation-prompt.ts`
- `src/llm/prompts/continuation/index.ts` (only if helper extraction is needed)
- `test/unit/llm/prompts/continuation-prompt.test.ts`
- `test/unit/llm/prompts/page-planner-prompt.test.ts`
- `test/unit/llm/prompts/opening-prompt.test.ts`

## Implementation checklist
1. Add conditional continuation prompt section rendered only when `suggestedProtagonistSpeech` exists.
2. Ensure instruction text captures all semantics:
   - protagonist has considered saying it
   - use only when circumstances support it
   - adapt wording/tone/timing naturally
   - omit when implausible
3. Ensure section is omitted when field is absent.
4. Confirm no references are added to opening or planner prompt builders.

## Out of scope
- Changing model, retry, or schema validation behavior.
- Editing opening prompt semantics unrelated to this feature.
- Editing planner prompt semantics unrelated to this feature.
- Route/UI behavior changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/continuation-prompt.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/opening-prompt.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/page-planner-prompt.test.ts`
- `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Suggested speech text appears only in continuation writer prompt path.
- Opening and planner prompt content remains unaffected.
- Advisory semantics are explicit; prompt never mandates literal insertion.

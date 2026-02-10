# PROSYSIMP-03: Prompt contract and OPEN THREADS rendering with tags

## Status
**Status**: ✅ COMPLETED

## Summary
Align opening and continuation prompt instructions with typed thread additions and render OPEN THREADS as `(THREAD_TYPE/URGENCY)` for LLM visibility.

## Depends on
- `PROSYSIMP-01`
- `PROSYSIMP-02`

## Reassessed assumptions (actual baseline)
- `threadsAdded` is already typed in runtime schema/types and writer response transformation.
- Few-shot example payloads already use typed thread additions.
- Prompt contract text is still partially legacy in multiple places (`threadsAdded` described as plain text).
- OPEN THREADS runtime render currently omits thread tags and shows only `- [td-x] text`.
- Existing prompt tests pass but do not fully enforce the typed-thread prompt contract and tagged thread rendering invariant.

## Corrected scope for this ticket
1. Update prompt-contract text only where it still claims `threadsAdded` is plain-text.
2. Update OPEN THREADS rendering in continuation context to include `- [td-x] (TYPE/URGENCY) text`.
3. Strengthen targeted prompt/example tests to enforce:
   - typed `threadsAdded` instruction shape (`text`, `threadType`, `urgency`)
   - tagged OPEN THREADS render visibility
4. Keep changes surgical; do not modify unrelated schema parsing, persistence, migrations, or retry/control-flow.

## File list it expects to touch
- `src/llm/prompts/opening-prompt.ts`
- `src/llm/prompts/sections/shared/state-tracking.ts`
- `src/llm/prompts/sections/opening/opening-quality-criteria.ts`
- `src/llm/prompts/sections/continuation/continuation-quality-criteria.ts`
- `src/llm/prompts/continuation/active-state-sections.ts`
- `test/unit/llm/prompts/opening-prompt.test.ts`
- `test/unit/llm/prompts/sections/shared/state-tracking.test.ts`
- `test/unit/llm/prompts/sections/opening/quality-criteria.test.ts`
- `test/unit/llm/prompts/sections/continuation/quality-criteria.test.ts`
- `test/unit/llm/prompts.test.ts`
- `test/unit/llm/examples.test.ts`

## Implementation checklist
1. Update opening/continuation instructions to require thread objects with `text`, `threadType`, `urgency`.
2. Keep explicit guidance that server assigns IDs and `threadsResolved` must be ID-only.
3. Update continuation context render to display open threads as `- [td-x] (TYPE/URGENCY) text`.
4. Add/adjust prompt tests for tag visibility and object-shape instructions.

## Out of scope
- Do not change schema parsing logic in this ticket.
- Do not implement persistence migration in this ticket.
- Do not add or modify retry/control-flow behavior in LLM client.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/opening-prompt.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/shared/state-tracking.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/opening/quality-criteria.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/continuation/quality-criteria.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/examples.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Prompt contract uses one active thread-addition shape only (object array).
- OPEN THREADS section always includes thread type and urgency when threads exist.
- Prompt sections unrelated to thread typing remain semantically unchanged.

## Outcome
- Completion date: February 10, 2026
- What was actually changed:
  - Updated opening/shared/quality prompt instruction text to require typed `threadsAdded` objects with `text`, `threadType`, and `urgency`.
  - Updated continuation OPEN THREADS render format to `- [td-x] (TYPE/URGENCY) text`.
  - Strengthened prompt-related tests to assert typed thread contract language and tagged OPEN THREADS rendering.
- Deviations from original plan:
  - `src/llm/few-shot-data.ts` required no edits because it was already using typed thread objects.
  - Scope stayed limited to prompt contract text/rendering and tests; no schema/persistence/client-flow changes.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/opening-prompt.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/shared/state-tracking.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/opening/quality-criteria.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/continuation/quality-criteria.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/examples.test.ts`
  - `npm run typecheck`

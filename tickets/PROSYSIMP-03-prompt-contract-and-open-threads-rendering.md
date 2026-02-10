# PROSYSIMP-03: Prompt contract and OPEN THREADS rendering with tags

## Summary
Align opening and continuation prompt instructions with typed thread additions and render OPEN THREADS as `(THREAD_TYPE/URGENCY)` for LLM visibility.

## Depends on
- `PROSYSIMP-01`
- `PROSYSIMP-02`

## File list it expects to touch
- `src/llm/prompts/opening-prompt.ts`
- `src/llm/prompts/sections/shared/state-tracking.ts`
- `src/llm/prompts/sections/opening/opening-quality-criteria.ts`
- `src/llm/prompts/sections/continuation/continuation-quality-criteria.ts`
- `src/llm/prompts/continuation/active-state-sections.ts`
- `src/llm/few-shot-data.ts`
- `test/unit/llm/prompts/opening-prompt.test.ts`
- `test/unit/llm/prompts/sections/shared/state-tracking.test.ts`
- `test/unit/llm/prompts/sections/opening/quality-criteria.test.ts`
- `test/unit/llm/prompts/sections/continuation/quality-criteria.test.ts`
- `test/unit/llm/prompts.test.ts`
- `test/unit/llm/examples.test.ts`

## Implementation checklist
1. Update opening/continuation instructions to require thread objects with `text`, `threadType`, `urgency`.
2. Update prompt examples/few-shot data to use typed thread additions.
3. Keep explicit guidance that server assigns IDs and `threadsResolved` must be ID-only.
4. Update continuation context render to display open threads as `- [td-x] (TYPE/URGENCY) text`.
5. Add prompt tests for tag visibility and object-shape instructions.
6. Update example validation tests so thread examples are typed objects.

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

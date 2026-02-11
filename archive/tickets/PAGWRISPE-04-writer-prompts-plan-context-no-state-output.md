# PAGWRISPE-04: Rewrite Writer Prompts for Plan-Guided Creative-Only Output
**Status**: ✅ COMPLETED

## Summary
Reconcile writer prompt instructions with the current creative-only writer contract: keep planner guidance and continuity context as read-only input, while removing conflicting instructions that tell the writer to output state/canon mutation fields.

## Reassessed assumptions (codebase reality)
- `sceneIntent`, `writerBrief`, and `continuityAnchors` plan guidance is already present in both writer prompts.
- Writer prompts and data-rule sections still include legacy guidance to populate state/canon mutation fields (for example `threatsAdded`, `constraintsAdded`, `threadsAdded`, and related add/remove arrays).
- The prompt conflict is spread across direct prompt requirements and shared data-rule composition text.

## Updated scope
- Keep planner guidance blocks intact in writer prompts.
- Keep continuity/state context sections as authoritative read-only input for narrative consistency.
- Remove instructions that ask the writer to populate state/canon mutation output fields.
- Add explicit language that the writer must not output state/canon mutation fields.
- Update prompt-related tests to assert the new behavior and prevent regressions.

## File list to touch
- `src/llm/prompts/opening-prompt.ts`
- `src/llm/prompts/continuation-prompt.ts`
- `src/llm/prompts/system-prompt-builder.ts`
- `src/llm/prompts/sections/shared/state-tracking.ts`
- `src/llm/prompts/sections/continuation/continuity-rules.ts`
- `test/unit/llm/prompts/opening-prompt.test.ts`
- `test/unit/llm/prompts/continuation-prompt.test.ts`
- `test/integration/llm/system-prompt-composition.test.ts`

## Implementation checklist
1. Preserve existing planner-guidance sections in opening and continuation prompts.
2. Replace state-tracking data rules with read-only continuity-context guidance.
3. Remove explicit writer instructions to fill state/canon mutation arrays/objects.
4. Add explicit instruction that writer output must stay creative-only and must not include state/canon mutation fields.
5. Update tests to verify:
   - planner sections remain present,
   - state/canon mutation output instructions are absent,
   - read-only continuity context guidance remains present.

## Out of scope
- Do not alter planner prompt shape or planner schema.
- Do not change engine orchestration logic.
- Do not introduce new LLM calls.
- Do not change writer runtime schema/types in this ticket.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/opening-prompt.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/continuation-prompt.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/llm/system-prompt-composition.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Continuation prompt still includes parent narrative context and ancestor continuity context.
- Prompt continues to enforce non-recap continuation behavior.
- Prompt contract still supports 2-5 choices for non-ending pages and 0 for ending pages.

## Outcome
- Completion date: February 11, 2026
- What actually changed:
  - Removed direct opening prompt requirements to emit state/canon mutation fields and replaced them with explicit creative-only output prohibition.
  - Added explicit continuation prompt prohibition against state/canon mutation outputs.
  - Reworked shared state-tracking data-rule sections to treat state/inventory/health/canon as read-only context and explicitly forbid mutation-field output.
  - Reworked continuation continuity-rule guidance to keep continuity checks while forbidding canon/state mutation-field output.
  - Updated system prompt data-rule composition to stop including opening/continuation quality sections that required mutation output, while preserving planner guidance and continuity context usage.
  - Updated prompt and prompt-composition tests to lock in planner guidance presence plus mutation-output prohibition.
- Deviations from original plan:
  - In addition to the ticket’s initial test list, prompt-section unit tests were updated and run because the read-only guidance refactor changed shared section contracts.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/opening-prompt.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/continuation-prompt.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/llm/system-prompt-composition.test.ts`
  - `npm run typecheck`
  - Extra hardening:
    - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/system-prompt.test.ts`
    - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/shared/state-tracking.test.ts`
    - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/continuation/continuity-rules.test.ts`

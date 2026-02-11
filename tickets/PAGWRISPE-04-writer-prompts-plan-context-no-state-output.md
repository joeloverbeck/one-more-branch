# PAGWRISPE-04: Rewrite Writer Prompts for Plan-Guided Creative-Only Output
**Status**: Draft

## Summary
Adjust opening and continuation writer prompts so they use plan guidance and authoritative state context for continuity, but explicitly prohibit state-mutation output fields.

## File list it expects to touch
- `src/llm/prompts/opening-prompt.ts`
- `src/llm/prompts/continuation-prompt.ts`
- `src/llm/prompts/system-prompt-builder.ts`
- `src/llm/prompts/sections/shared/state-tracking.ts`
- `test/unit/llm/prompts/opening-prompt.test.ts`
- `test/unit/llm/prompts/continuation-prompt.test.ts`
- `test/integration/llm/system-prompt-composition.test.ts`

## Implementation checklist
1. Ensure writer prompts include plan guidance blocks for:
   - `sceneIntent`
   - `writerBrief`
   - `continuityAnchors`
2. Preserve authoritative state/context sections as read-only continuity input.
3. Remove prompt instructions that ask writer to fill state add/remove arrays.
4. Add explicit prompt language that writer must not output state changes.
5. Update prompt tests to verify:
   - plan sections exist
   - state-mutation-output instructions are absent
   - continuity context remains present.

## Out of scope
- Do not alter planner prompt shape or planner schema.
- Do not change few-shot example library format unless required by failing tests.
- Do not change engine orchestration logic.
- Do not introduce new LLM calls.

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

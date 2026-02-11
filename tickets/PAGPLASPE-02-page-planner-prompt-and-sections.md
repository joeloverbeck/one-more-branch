# PAGPLASPE-02: Build Planner Prompt Composition (Opening + Continuation)

## Summary
Create planner prompt builders and planner prompt sections so the planner can produce scene intent + state intents before writer prose generation.

## Depends on
- PAGPLASPE-01

## Blocks
- PAGPLASPE-05
- PAGPLASPE-06

## File list it expects to touch
- `src/llm/prompts/page-planner-prompt.ts`
- `src/llm/prompts/sections/planner/index.ts`
- `src/llm/prompts/sections/planner/opening-context.ts`
- `src/llm/prompts/sections/planner/continuation-context.ts`
- `src/llm/prompts/sections/planner/state-intent-rules.ts`
- `src/llm/prompts/index.ts`
- `test/unit/llm/prompts/page-planner-prompt.test.ts`
- `test/unit/llm/prompts/sections/planner/opening-context.test.ts`
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- `test/unit/llm/prompts/sections/planner/state-intent-rules.test.ts`

## Implementation checklist
1. Add planner prompt entrypoint that accepts `PagePlanContext`.
2. Split prompt content into planner section modules for opening and continuation context.
3. Encode planner constraints from spec (no narrative prose, no player choices, no server IDs).
4. Define required planner output shape instructions consistent with upcoming planner schema.
5. Export planner prompt builder via prompts barrel.
6. Add targeted unit tests for opening and continuation prompt composition.

## Out of scope
- LLM request/response handling for planner generation.
- Schema/zod validation and response transformation.
- Deterministic ID-prefix or duplicate-intent validation logic.
- Writer prompt refactor from Spec 10.
- Engine/service integration.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/page-planner-prompt.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/opening-context.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/state-intent-rules.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Existing opening/continuation writer prompt text remains unchanged in this ticket.
- Planner prompt includes both opening and continuation variants with explicit context-appropriate inputs.
- Prompt instructions never ask planner to produce narrative prose, player choices, or assigned IDs.

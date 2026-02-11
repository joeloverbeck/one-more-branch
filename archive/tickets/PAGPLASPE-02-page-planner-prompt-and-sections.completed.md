# PAGPLASPE-02: Build Planner Prompt Composition (Opening + Continuation)

**Status**: ✅ COMPLETED

## Summary
Create planner prompt builders and planner prompt sections so the planner can produce scene intent + state intents before writer prose generation.

## Assumption Reassessment (2026-02-11)
- `PagePlan`, `PagePlanContext`, and related planner types already exist in `src/llm/types.ts` (from prior work), so this ticket does not define planner types.
- Planner prompt files and planner prompt tests listed below are not present yet; they need to be created.
- Existing prompt tests in this repository are largely centralized in `test/unit/llm/prompts.test.ts`; adding targeted planner prompt tests in dedicated files is still appropriate for this ticket.
- Spec 09 references planner schema/validation and engine integration, but those remain explicitly out of scope for this ticket and should not be implemented here.

## Updated Scope
- Implement planner prompt composition only (opening + continuation) with modular planner prompt sections.
- Add planner output-shape instructions aligned with Spec 09 `PagePlan` contract.
- Export planner prompt builder from `src/llm/prompts/index.ts`.
- Add focused planner prompt unit tests for composition behavior and critical constraints.

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
- Changes to existing writer opening/continuation prompt behavior.

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

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added planner prompt entrypoint `buildPagePlannerPrompt(context: PagePlanContext)` in `src/llm/prompts/page-planner-prompt.ts`.
  - Added planner section modules in `src/llm/prompts/sections/planner/` for opening context, continuation context, and planner rules/output shape.
  - Exported planner prompt from `src/llm/prompts/index.ts`.
  - Exported planner section symbols from `src/llm/prompts/sections/index.ts`.
  - Added focused unit tests for planner prompt composition and planner section modules.
- Deviations from original plan:
  - `src/llm/prompts/sections/index.ts` was additionally updated to expose planner section exports for consistency with existing section barrel patterns.
  - Existing writer prompt modules/tests remained untouched as required.
- Verification results:
  - Passed: `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/page-planner-prompt.test.ts`
  - Passed: `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/opening-context.test.ts`
  - Passed: `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
  - Passed: `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/state-intent-rules.test.ts`
  - Passed: `npm run typecheck`

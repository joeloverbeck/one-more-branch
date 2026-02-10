# BEANAMSTRANDPLADIS-02: Require beat name in structure schemas and prompts
**Status**: ✅ COMPLETED

## Summary
Close the remaining contract gap so structure-generation and structure-rewrite LLM contracts explicitly require and instruct a short beat `name`.

## Reassessed assumptions (current codebase)
- `StoryBeat.name` is already required in domain types (`src/models/story-arc.ts`).
- Parsing already rejects beats without `name` (`src/llm/structure-generator.ts`, `src/engine/structure-rewriter.ts`).
- `CompletedBeat.name` already exists (`src/llm/types.ts`).
- Persistence already stores beat names in active and versioned structures (`src/persistence/story-repository.ts`).
- Main discrepancy: schema + prompts still omit beat `name`, so LLM output contract is weaker than parser/domain expectations.
- Existing test paths in this ticket are valid in the repository.

## File list it expects to touch
- `src/llm/schemas/structure-schema.ts`
- `src/llm/prompts/structure-prompt.ts`
- `src/llm/prompts/structure-rewrite-prompt.ts`
- `test/unit/llm/schemas/structure-schema.test.ts`
- `test/unit/llm/prompts/structure-prompt.test.ts`
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`

## Implementation checklist
1. Update schema required fields for beats to include `name`.
2. Update output-shape instructions in generation prompt.
3. Update output-shape instructions in rewrite prompt.
4. Update prompt examples so each beat includes `name`.
5. Update schema/prompt tests accordingly.
6. Align rewrite prompt test fixtures with the `CompletedBeat.name` contract.

## Out of scope
- Do not change parsing/validation behavior (already enforces beat names).
- Do not modify structure merge/rewrite behavior.
- Do not modify repository persistence conversions.
- Do not modify view-model formatting.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/structure-schema.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/structure-prompt.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Beat `name` is treated as required in both generation and rewrite schema contracts.
- Beat `description`, `objective`, and `role` stay required.
- Prompt constraints unrelated to beat naming remain unchanged.

## Outcome
- Completion date: 2026-02-10
- Actual changes:
  - Added `name` to required beat fields in `src/llm/schemas/structure-schema.ts`.
  - Updated generation/rewrite prompt output-shape docs and few-shot beat examples to include `name`.
  - Updated rewrite prompt completed-beat formatting to include beat names.
  - Updated unit tests to assert beat-name contract and aligned rewrite prompt test fixtures with `CompletedBeat.name`.
- Deviations from original plan:
  - No domain/parser/persistence/view changes were needed because those contracts were already implemented.
  - Added fixture-alignment in rewrite prompt tests as part of contract consistency.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/structure-schema.test.ts test/unit/llm/prompts/structure-prompt.test.ts test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
  - `npm run typecheck`

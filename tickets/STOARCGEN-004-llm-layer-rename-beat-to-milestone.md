# STOARCGEN-004: LLM Layer Rename — beat to milestone

**Status**: TODO
**Depends on**: STOARCGEN-001
**Blocks**: STOARCGEN-007

## Summary

Update all LLM-layer files (prompts, schemas, parsers, types) to use `milestone` terminology instead of `beat`. This includes prompt text, schema keys, parser functions, and type definitions.

## Files to Touch

### Prompt files
- `src/llm/prompts/structure-prompt.ts` — Rename beat refs in prompt text and context types
- `src/llm/prompts/structure-rewrite-prompt.ts` — Rename beat refs
- `src/llm/prompts/structure-evaluator-prompt.ts` — Rename beat refs
- `src/llm/prompts/continuation-prompt.ts` — Rename beat refs
- `src/llm/prompts/opening-prompt.ts` — Rename beat refs
- `src/llm/prompts/choice-generator-prompt.ts` — Rename beat refs
- `src/llm/prompts/state-accountant-prompt.ts` — Rename beat refs (if any)
- `src/llm/prompts/lorekeeper-prompt.ts` — Rename beat refs (if any)
- `src/llm/prompts/agenda-resolver-prompt.ts` — Rename beat refs (if any)
- `src/llm/prompts/scene-ideator-prompt.ts` — Rename beat refs

### Prompt sections
- `src/llm/prompts/sections/planner/continuation-context.ts` — Rename beat refs
- `src/llm/prompts/sections/planner/thread-pacing-directive.ts` — Rename beat refs (if any)
- `src/llm/prompts/continuation/story-structure-section.ts` — Rename beat refs

### Schemas
- `src/llm/schemas/structure-schema.ts` — Rename JSON schema keys from `beats` to `milestones`
- `src/llm/schemas/structure-evaluator-schema.ts` — Rename beat refs
- `src/llm/schemas/structure-evaluator-response-transformer.ts` — Rename beat refs
- `src/llm/schemas/structure-evaluator-validation-schema.ts` — Rename beat refs

### Parsers and types
- `src/llm/structure-response-parser.ts` — Parse `milestones` key instead of `beats`
- `src/llm/structure-rewrite-types.ts` — Rename beat refs
- `src/llm/structure-evaluator-types.ts` — Rename beat refs
- `src/llm/analyst-types.ts` — Rename beat refs (if any)
- `src/llm/planner-types.ts` — Rename beat refs (if any)
- `src/llm/page-planner-contract.ts` — Rename beat refs (if any)
- `src/llm/generation-pipeline-types.ts` — Rename beat refs (if any)
- `src/llm/result-merger.ts` — Rename beat refs
- `src/llm/structure-generator.ts` — Rename `beat` variable names in validation helpers

### Fixtures
- `test/fixtures/llm-results.ts` — Rename beat refs in mock data

## Detailed Changes

### Schema keys (CRITICAL — affects LLM output parsing)
The JSON schema sent to the LLM must change `"beats"` to `"milestones"` in the structure generation schema. The response parser must also expect `milestones` key.

**Note**: Since existing stories have `beats` in their persisted JSON, the persistence layer (STOARCGEN-005) handles backward compat. The schema change only affects new LLM calls.

### Prompt text
All prompt text strings that reference "beat" or "beats" should use "milestone" or "milestones". This includes:
- System prompt instructions
- JSON field descriptions
- Context injections describing current structure position

## Out of Scope

- Engine files (STOARCGEN-002, STOARCGEN-003)
- Persistence files (STOARCGEN-005)
- UI files (STOARCGEN-006)
- Test files beyond fixtures (STOARCGEN-007)
- New prompt content for 3-call pipeline (STOARCGEN-009, STOARCGEN-010)
- New fields — this is purely a rename

## Acceptance Criteria

### Tests that must pass
- `npm run typecheck` passes (within LLM layer scope)
- `test/unit/llm/prompts.test.ts` passes after mock updates
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts` passes after mock updates

### Invariants that must remain true
- Schema output format is valid JSON Schema
- Response parser correctly maps LLM output to `GeneratedMilestone[]`
- Prompt text is coherent (no mixed beat/milestone terminology)
- `structure-generator.ts` validation helpers (setpiece count, genre obligations) work identically
- No runtime behavior changes

# CHABRA-002: Character brainstormer JSON schema and response transformer

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CHABRA-001

## Problem

The character brainstormer LLM call needs a JSON Schema for structured output and a response transformer to convert raw LLM JSON into typed `CharacterBrainstormerResult`. This is the data contract between the LLM and the application.

## Assumption Reassessment (2026-03-25)

1. Schema files follow the `type: 'json_schema'` wrapper pattern with `json_schema.name`, `strict: true`, `schema: {...}` — confirmed in existing schemas (e.g., `writer-schema.ts`).
2. Response transformers are co-located with or near their schema files.
3. The `BrainstormedCharacter` and `CharacterBrainstormerResult` interfaces need to be defined as TypeScript types.
4. `additionalProperties: false` is required on all object types for OpenRouter strict mode.

## Architecture Check

1. Follows the same schema + transformer pattern as all other LLM stages.
2. No backwards-compatibility shims needed — entirely new code.

## What to Change

### 1. Create TypeScript types

Define `BrainstormedCharacter` and `CharacterBrainstormerResult` interfaces as specified in the spec (section 1.2). Also define `ExistingCharacterSummary` for the prompt context.

### 2. Create JSON Schema

Create the OpenRouter-compatible schema with:
- `characters` array (minItems: 6, maxItems: 10) of character objects
- All 9 required string fields per character (name, highConceptPitch, coreWound, centralContradiction, archetypeAndSubversion, suggestedStoryFunction, relationshipDynamicHint, whatMakesThemMemorable, metaphorFamily)
- `diversityNote` string at top level
- `additionalProperties: false` on all objects

### 3. Create response transformer

Function that validates the raw LLM JSON and maps it to `CharacterBrainstormerResult`. Should handle:
- Valid response with 6-10 characters
- Graceful handling of missing optional fields (all fields are required per schema, but defensive)

## Files to Touch

- `src/llm/schemas/character-brainstormer-schema.ts` (new)
- `src/llm/character-brainstormer-types.ts` (new — types for context, result, and character)

## Out of Scope

- Prompt builder (CHABRA-003)
- Generation orchestration function (CHABRA-004)
- Route handler (CHABRA-005)
- Any modification to existing schemas or types
- Validation/repair logic (the brainstormer output is simple enough to not need ID repair like writer output)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema function returns valid JSON Schema structure with correct property names, types, and required arrays
2. Unit test: response transformer correctly maps a valid LLM response to `CharacterBrainstormerResult`
3. Unit test: response transformer handles edge cases (exactly 6 characters, exactly 10 characters)
4. `npm run typecheck` passes
5. `npm run lint` passes
6. Existing suite: `npm test` — no regressions

### Invariants

1. Schema enforces `additionalProperties: false` on all object types
2. Schema requires all 9 character fields as non-optional
3. `CharacterBrainstormerResult.characters` is `readonly` array of `readonly BrainstormedCharacter`
4. No mutation of input data in the transformer

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/character-brainstormer-schema.test.ts` — schema structure validation, transformer correctness

### Commands

1. `npm run test:unit -- --testPathPattern="character-brainstormer-schema"` — targeted test
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` — full suite

## Outcome

- **Completed**: 2026-03-25
- **Changes**:
  - Created `src/llm/character-brainstormer-types.ts` with `BrainstormedCharacter`, `CharacterBrainstormerResult`, `ExistingCharacterSummary`, `CharacterBrainstormerContext` interfaces
  - Created `src/llm/schemas/character-brainstormer-schema.ts` with OpenRouter JSON schema + `parseCharacterBrainstormerResponse` transformer
  - Created `test/unit/llm/schemas/character-brainstormer-schema.test.ts` (16 tests)
  - Updated `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` to register the new schema
- **Deviations**: Transformer co-located in schema file (ticket intent) rather than generation file (some codebase patterns). Also needed to register in anthropic-schema-compatibility test which auto-discovers all schema exports.
- **Verification**: typecheck pass, lint 0 errors, 318 suites / 3698 tests all pass

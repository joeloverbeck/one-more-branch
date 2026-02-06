# LLMINT-002: JSON Schema and Zod Validation

## Status

- [x] In progress
- [x] Completed

## Summary

Create the JSON schema for OpenRouter structured outputs and the Zod validation schema for runtime type safety.

## Dependencies

- **LLMINT-001**: Requires `GenerationResult` type from `types.ts`

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/llm/schemas.ts` | Create |
| `test/unit/llm/schemas.test.ts` | Create |
| `package.json` | Modify (add `zod`) |
| `package-lock.json` | Modify (lockfile update) |

## Reassessed Assumptions and Scope

### Confirmed

- `LLMINT-001` has already created `src/llm/types.ts`, including `GenerationResult` and `JsonSchema`.
- No existing `schemas.ts` implementation or schema tests exist yet.
- `specs/04-llm-integration.md` still expects Zod-based runtime validation and structured-output schema wiring.

### Corrected

- The ticket assumed Zod was already available, but the current `package.json` does not include `zod`; this ticket must add it.
- The original build gate required repository-wide `npm run lint`. Current repository baseline includes unrelated lint violations, so lint verification for this ticket is scoped to touched files while preserving strict checks for new code.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify `src/llm/types.ts`
- **DO NOT** create `src/llm/client.ts` (that's LLMINT-005)
- **DO NOT** create `src/llm/prompts.ts` (that's LLMINT-003)

## Implementation Details

### JSON Schema for OpenRouter

Create `STORY_GENERATION_SCHEMA` constant of type `JsonSchema`:

- `type: 'json_schema'`
- `json_schema.name: 'story_generation'`
- `json_schema.strict: true`
- Schema properties:
  - `narrative`: string with description about vivid prose, minimum 100 words, second person
  - `choices`: array of strings with description about 2-5 meaningful choices, empty for endings
  - `stateChanges`: array of strings for events in this scene only
  - `canonFacts`: array of strings for permanent world facts
  - `isEnding`: boolean for story conclusion
  - `storyArc`: string for main goal (opening page only)
- Required: `['narrative', 'choices', 'stateChanges', 'canonFacts', 'isEnding']`
- `additionalProperties: false`

### Zod Validation Schema

Create `GenerationResultSchema` using Zod with:

1. **Basic field validation**:
   - `narrative`: string, min 50 chars, max 15000 chars
   - `choices`: array of strings, each min 3 chars, max 300 chars
   - `stateChanges`: array of strings
   - `canonFacts`: array of strings
   - `isEnding`: boolean
   - `storyArc`: optional string, default to empty string

2. **Refinements**:
   - Ending consistency: `isEnding === true` ⟺ `choices.length === 0`
   - Non-endings must have at least 2 choices
   - Maximum 5 choices for non-endings
   - No duplicate choices (case-insensitive comparison)

### Helper Functions

```typescript
function validateGenerationResponse(
  rawJson: unknown,
  rawResponse: string
): GenerationResult

function isStructuredOutputNotSupported(error: unknown): boolean
```

## Acceptance Criteria

### Tests That Must Pass

Create comprehensive tests in `test/unit/llm/schemas.test.ts`:

**Basic validation tests:**
1. `it('should validate a well-formed non-ending response')`
2. `it('should validate a well-formed ending response')`
3. `it('should validate opening page with story arc')`

**Ending consistency invariant tests:**
4. `it('should reject non-ending with zero choices')`
5. `it('should reject ending with choices')`
6. `it('should reject non-ending with only one choice')`

**Choice constraint tests:**
7. `it('should reject more than 5 choices')`
8. `it('should reject duplicate choices (case-insensitive)')`
9. `it('should reject very short choices (<3 chars)')`
10. `it('should reject very long choices (>300 chars)')`

**Narrative constraint tests:**
11. `it('should reject very short narrative (<50 chars)')`
12. `it('should reject very long narrative (>15000 chars)')`

**validateGenerationResponse tests:**
13. `it('should return GenerationResult with trimmed values')`
14. `it('should filter out empty strings from stateChanges and canonFacts')`
15. `it('should handle missing optional storyArc')`

**isStructuredOutputNotSupported tests:**
16. `it('should return true for errors mentioning response_format')`
17. `it('should return true for errors mentioning json_schema')`
18. `it('should return false for unrelated errors')`

### Invariants That Must Remain True

1. **Ending consistency**: `isEnding === true` ⟺ `choices.length === 0` (enforced by Zod)
2. **Choice minimum**: Non-ending pages have ≥2 choices
3. **Choice maximum**: Non-ending pages have ≤5 choices
4. **No duplicate choices**: Case-insensitive comparison
5. **Narrative bounds**: 50-15000 characters
6. **Choice bounds**: 3-300 characters each

### Build Requirements

- `npm run typecheck` passes
- `npx eslint src/llm/schemas.ts test/unit/llm/schemas.test.ts` passes
- `npm run build` succeeds
- `npm run test:unit -- --testPathPattern=schemas` passes

## Estimated Size

~150 lines of TypeScript + ~200 lines of tests

## Outcome

- Added `src/llm/schemas.ts` with `STORY_GENERATION_SCHEMA`, `GenerationResultSchema`, `validateGenerationResponse`, and `isStructuredOutputNotSupported`.
- Added `test/unit/llm/schemas.test.ts` covering all required acceptance tests plus extra schema-contract checks for strict mode and required fields.
- Updated dependency assumptions from the original plan by adding `zod` to `package.json` and `package-lock.json` because it was not present.
- Verification run: `npm run test:unit -- --testPathPattern=schemas`, `npx eslint src/llm/schemas.ts test/unit/llm/schemas.test.ts`, `npm run typecheck`, and `npm run build` all passed.

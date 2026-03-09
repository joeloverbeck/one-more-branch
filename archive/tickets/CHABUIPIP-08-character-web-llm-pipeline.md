# CHABUIPIP-08: LLM Pipeline — Character Web Generation

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-02, CHABUIPIP-07
**Estimated diff size**: ~250 lines across 3 files

## Summary

Create the LLM pipeline for generating a character web: prompt builder, JSON schema, and generation orchestrator. Single LLM call that produces cast role assignments + lightweight relationship archetypes + cast dynamics summary.

## File List

- `src/llm/prompts/character-web-prompt.ts` (CREATE)
- `src/llm/schemas/character-web-schema.ts` (CREATE)
- `src/llm/character-web-generation.ts` (CREATE)
- `test/unit/llm/character-web-generation.test.ts` (CREATE)

## Out of Scope

- Do NOT create individual character development prompts (CHABUIPIP-09 through CHABUIPIP-13)
- Do NOT create the character stage runner (CHABUIPIP-14)
- Do NOT create any service or route code
- Do NOT modify any existing prompt builders
- Do NOT modify `entity-decomposer.ts`

## Detailed Changes

### `src/llm/prompts/character-web-prompt.ts`:

Prompt builder function that takes:
- `kernelSummary?: string`
- `conceptSummary?: string`
- `userNotes?: string`

Builds system + user messages instructing the LLM to:
1. Analyze the kernel/concept to understand story requirements
2. Assign cast roles (CastRoleAssignment with characterName, isProtagonist, storyFunction, characterDepth, narrativeRole, conflictRelationship)
3. Generate lightweight relationship archetypes between characters
4. Write a cast dynamics summary

Uses existing enums: `StoryFunction`, `CharacterDepth`, `PipelineRelationshipType`, `RelationshipValence`.

### `src/llm/schemas/character-web-schema.ts`:

JSON Schema for structured LLM output:
```json
{
  "type": "object",
  "properties": {
    "assignments": { "type": "array", "items": { ... CastRoleAssignment fields } },
    "relationshipArchetypes": { "type": "array", "items": { ... RelationshipArchetype fields } },
    "castDynamicsSummary": { "type": "string" }
  },
  "required": ["assignments", "relationshipArchetypes", "castDynamicsSummary"]
}
```

Enum fields use `anyOf` pattern for Anthropic compatibility.

### `src/llm/character-web-generation.ts`:

Follow the `spine-generator.ts` pattern:
1. Build messages via prompt builder
2. `logPrompt()` call
3. Call OpenRouter with `response_format` schema
4. Parse JSON response
5. Validate enum values with type guards
6. Return typed `CharacterWebGenerationResult`:
   ```typescript
   interface CharacterWebGenerationResult {
     readonly assignments: readonly CastRoleAssignment[];
     readonly relationshipArchetypes: readonly RelationshipArchetype[];
     readonly castDynamicsSummary: string;
     readonly rawResponse: string;
   }
   ```
7. Wrap with `withRetry()` and `withModelFallback()`
8. Use `getStageModel('characterWeb')`

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/character-web-generation.test.ts`:
  - Prompt builder produces system and user messages with kernel/concept context
  - Prompt builder handles missing optional inputs gracefully
  - Schema validates a well-formed web generation response
  - Schema rejects responses with invalid enum values
  - Generation function calls OpenRouter with correct schema and model
  - Generation function validates enum values in response
  - Generation function returns typed CharacterWebGenerationResult

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- No existing prompt builders or schemas are modified
- Uses `logPrompt()` for prompt logging
- Uses `getStageModel()` for model selection
- Enum schema uses `anyOf` pattern (not mixed nullable form)
- All existing tests pass unchanged

## Outcome

- **Completed**: 2025-03-09
- **Files created**: `src/llm/prompts/character-web-prompt.ts`, `src/llm/schemas/character-web-schema.ts`, `src/llm/character-web-generation.ts`, `test/unit/llm/character-web-generation.test.ts`
- **Files modified**: `src/logging/prompt-formatter.ts` (added `'characterWeb'` to PromptType), `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` (registered new schema)
- **Ticket corrections**: Fixed `CastRoleAssignment` field names (archetype→narrativeRole, roleJustification→conflictRelationship, added isProtagonist), fixed stage key (`'GENERATING_CHARACTER_WEB'`→`'characterWeb'`)
- **Verification**: typecheck passes, lint passes, 3383/3383 tests pass (16 new)

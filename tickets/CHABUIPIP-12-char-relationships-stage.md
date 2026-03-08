# CHABUIPIP-12: LLM Pipeline — Deep Relationships (Stage 4)

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03, CHABUIPIP-07
**Estimated diff size**: ~250 lines across 3 files

## Summary

Create prompt builder, JSON schema, and generation function for Stage 4: Deep Relationships. Produces `DeepRelationshipResult` (full CastRelationships with history/leverage, secrets, personal dilemmas). This stage is special: it loads other developed characters from the same web for counterpart context.

## File List

- `src/llm/prompts/char-relationships-prompt.ts` (CREATE)
- `src/llm/schemas/char-relationships-schema.ts` (CREATE)
- `src/llm/char-relationships-generation.ts` (CREATE)
- `test/unit/llm/char-relationships-generation.test.ts` (CREATE)

## Out of Scope

- Do NOT create stage runner (CHABUIPIP-14) — the runner handles loading other characters
- Do NOT create other stage prompts
- Do NOT modify existing prompts, schemas, or models

## Detailed Changes

### `src/llm/prompts/char-relationships-prompt.ts`:

Prompt builder accepting `CharacterDevPromptContext` with:
- `webContext` (role, archetypes, dynamics)
- `characterKernel` (Stage 1)
- `tridimensionalProfile` (Stage 2)
- `agencyModel` (Stage 3)
- `otherDevelopedCharacters?: readonly SavedDevelopedCharacter[]` (other chars from same web)
- `kernelSummary?`, `conceptSummary?`, `userNotes?`

Prompt instructs LLM to:
1. Deepen the lightweight relationship archetypes from the web into full CastRelationships
2. Add history, current tension, leverage, numeric valence (-5 to +5)
3. Generate character secrets and personal dilemmas
4. Use other developed characters' data to create coherent cross-character relationships

### `src/llm/schemas/char-relationships-schema.ts`:

JSON Schema matching `DeepRelationshipResult`:
- `relationships` array of CastRelationship objects:
  - `fromCharacter`, `toCharacter` (strings)
  - `relationshipType` (enum: PipelineRelationshipType)
  - `valence` (enum: RelationshipValence)
  - `numericValence` (number, -5 to +5)
  - `history` (string)
  - `currentTension` (string)
  - `leverage` (string)
- `secrets` (string array)
- `personalDilemmas` (string array)

### `src/llm/char-relationships-generation.ts`:

Follow `spine-generator.ts` pattern. Use stage `GENERATING_CHAR_RELATIONSHIPS`.
Validate enum values for relationship type and valence.

Return type:
```typescript
interface CharRelationshipsGenerationResult {
  readonly deepRelationships: DeepRelationshipResult;
  readonly rawResponse: string;
}
```

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/char-relationships-generation.test.ts`:
  - Prompt includes Stages 1-3 outputs as context
  - Prompt includes other developed characters when provided
  - Prompt works without other developed characters (empty array)
  - Schema validates DeepRelationshipResult shape
  - Schema validates CastRelationship enum fields
  - Generation function validates enums in response
  - Generation function returns typed result

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- `CastRelationship` and `DeepRelationshipResult` types used as-is
- Enum validation uses existing type guards
- No existing code modified

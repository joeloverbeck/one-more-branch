# CHABUIPIP-11: LLM Pipeline — Agency Model (Stage 3)

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03, CHABUIPIP-07
**Estimated diff size**: ~220 lines across 3 files

## Summary

Create prompt builder, JSON schema, and generation function for Stage 3: Agency Model. Produces `AgencyModel` (replanning policy, emotion salience, beliefs, desires, intentions, false beliefs, decision pattern).

## File List

- `src/llm/prompts/char-agency-prompt.ts` (CREATE)
- `src/llm/schemas/char-agency-schema.ts` (CREATE)
- `src/llm/char-agency-generation.ts` (CREATE)
- `test/unit/llm/char-agency-generation.test.ts` (CREATE)

## Out of Scope

- Do NOT create stage runner (CHABUIPIP-14)
- Do NOT create other stage prompts
- Do NOT modify existing prompts, schemas, or models

## Detailed Changes

### `src/llm/prompts/char-agency-prompt.ts`:

Prompt builder accepting `CharacterDevPromptContext` with:
- `webContext` (role, relationships, dynamics)
- `characterKernel` (from Stage 1)
- `tridimensionalProfile` (from Stage 2)
- `kernelSummary?`, `conceptSummary?`, `userNotes?`

Prompt instructs LLM to model the character's agency: how they make decisions, what they believe, what drives their behavior, informed by their dramatic role and psychological profile.

### `src/llm/schemas/char-agency-schema.ts`:

JSON Schema matching `AgencyModel`:
- `characterName` (string)
- `replanningPolicy` (enum: ReplanningPolicy values)
- `emotionSalience` (enum: EmotionSalience values)
- `coreBeliefs` (string array)
- `desires` (string array)
- `intentions` (string array)
- `falseBeliefs` (string array)
- `decisionPattern` (string)

Enum fields use `anyOf` pattern for Anthropic compatibility.

### `src/llm/char-agency-generation.ts`:

Follow `spine-generator.ts` pattern. Use stage `GENERATING_CHAR_AGENCY`.
Validate enum values (`replanningPolicy`, `emotionSalience`) with existing type guards.

Return type:
```typescript
interface CharAgencyGenerationResult {
  readonly agencyModel: AgencyModel;
  readonly rawResponse: string;
}
```

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/char-agency-generation.test.ts`:
  - Prompt includes Stage 1 + Stage 2 outputs as context
  - Prompt includes webContext
  - Schema validates AgencyModel with valid enum values
  - Schema rejects invalid ReplanningPolicy/EmotionSalience values
  - Generation function validates enums in response
  - Generation function returns typed result

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- `AgencyModel` type used as-is from `character-pipeline-types.ts`
- Enum validation uses existing type guards from `character-enums.ts`
- No existing code modified

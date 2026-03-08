# CHABUIPIP-10: LLM Pipeline — Tridimensional Profile (Stage 2)

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03, CHABUIPIP-07
**Estimated diff size**: ~200 lines across 3 files

## Summary

Create prompt builder, JSON schema, and generation function for Stage 2: Tridimensional Profile. Produces `TridimensionalProfile` (physiology, sociology, psychology, derivation, coreTraits).

## File List

- `src/llm/prompts/char-tridimensional-prompt.ts` (CREATE)
- `src/llm/schemas/char-tridimensional-schema.ts` (CREATE)
- `src/llm/char-tridimensional-generation.ts` (CREATE)
- `test/unit/llm/char-tridimensional-generation.test.ts` (CREATE)

## Out of Scope

- Do NOT create stage runner (CHABUIPIP-14)
- Do NOT create other stage prompts
- Do NOT modify existing prompts, schemas, or models

## Detailed Changes

### `src/llm/prompts/char-tridimensional-prompt.ts`:

Prompt builder accepting `CharacterDevPromptContext` with:
- `webContext` (assignment, relationships, dynamics)
- `characterKernel` (from Stage 1 — super-objective, opposition, etc.)
- `kernelSummary?`, `conceptSummary?`, `userNotes?`

Prompt instructs LLM to build a three-dimensional character profile informed by the kernel's dramatic needs.

### `src/llm/schemas/char-tridimensional-schema.ts`:

JSON Schema matching `TridimensionalProfile`:
- `characterName` (string)
- `physiology` (string)
- `sociology` (string)
- `psychology` (string)
- `derivation` (string)
- `coreTraits` (string array)

### `src/llm/char-tridimensional-generation.ts`:

Follow `spine-generator.ts` pattern. Use stage `GENERATING_CHAR_TRIDIMENSIONAL`.

Return type:
```typescript
interface CharTridimensionalGenerationResult {
  readonly tridimensionalProfile: TridimensionalProfile;
  readonly rawResponse: string;
}
```

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/char-tridimensional-generation.test.ts`:
  - Prompt includes Stage 1 output (characterKernel) as context
  - Prompt includes webContext (role, relationships)
  - Schema validates TridimensionalProfile shape
  - Generation function returns typed result
  - Generation function uses correct stage model

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- `TridimensionalProfile` type used as-is from `character-pipeline-types.ts`
- No existing code modified

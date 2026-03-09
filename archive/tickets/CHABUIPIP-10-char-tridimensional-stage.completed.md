# CHABUIPIP-10: LLM Pipeline — Tridimensional Profile (Stage 2)

**Status**: COMPLETED
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

Prompt builder accepting `CharTridimensionalPromptContext` (extends `CharacterDevPromptContext` with required `characterKernel`) with:
- `webContext` (assignment, relationships, dynamics)
- `characterKernel` (from Stage 1 — super-objective, opposition, etc.)
- `kernelSummary?`, `conceptSummary?`, `userNotes?`

NOTE: Uses a dedicated `CharTridimensionalPromptContext` rather than modifying the existing `CharacterDevPromptContext` to honor the "no existing code modified" constraint.

Prompt instructs LLM to build a three-dimensional character profile informed by the kernel's dramatic needs.

### `src/llm/schemas/char-tridimensional-schema.ts`:

JSON Schema matching `TridimensionalProfile`:
- `characterName` (string)
- `physiology` (string)
- `sociology` (string)
- `psychology` (string)
- `derivationChain` (string) — NOTE: actual field name in `character-pipeline-types.ts` is `derivationChain`, not `derivation`
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

## Outcome

- **Completion date**: 2026-03-09
- **What changed**:
  - Added Stage 2 prompt builder at `src/llm/prompts/char-tridimensional-prompt.ts`.
  - Added Stage 2 schema at `src/llm/schemas/char-tridimensional-schema.ts`.
  - Added Stage 2 generation pipeline at `src/llm/char-tridimensional-generation.ts`.
  - Added unit coverage at `test/unit/llm/char-tridimensional-generation.test.ts`.
- **Deviations from original plan**:
  - Used `CharTridimensionalPromptContext` extending `CharacterDevPromptContext` to require `characterKernel` for this stage without broadening shared context contracts.
  - Confirmed `TridimensionalProfile` uses `derivationChain` (not `derivation`) and aligned schema/tests accordingly.
- **Verification results**:
  - Verified implementation presence via source and unit test files.
  - Ran targeted unit test for Stage 2 generation (`test/unit/llm/char-tridimensional-generation.test.ts`).

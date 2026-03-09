# CHABUIPIP-09: LLM Pipeline — Character Kernel (Stage 1)

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03, CHABUIPIP-07
**Estimated diff size**: ~200 lines across 3 files

## Summary

Create prompt builder, JSON schema, and generation function for Stage 1 of individual character development: Character Kernel generation. Produces `CharacterKernel` (super-objective, immediate objectives, opposition, stakes, constraints, pressure).

## File List

- `src/llm/prompts/char-kernel-prompt.ts` (CREATE)
- `src/llm/schemas/char-kernel-schema.ts` (CREATE)
- `src/llm/char-kernel-generation.ts` (CREATE)
- `test/unit/llm/char-kernel-generation.test.ts` (CREATE)

## Out of Scope

- Do NOT create stage runner (CHABUIPIP-14)
- Do NOT create other stage prompts (CHABUIPIP-10 through CHABUIPIP-13)
- Do NOT create any service or route code
- Do NOT modify existing prompts or schemas
- Do NOT modify `character-pipeline-types.ts`

## Detailed Changes

### `src/llm/prompts/char-kernel-prompt.ts`:

Prompt builder accepting `CharacterDevPromptContext`:
```typescript
interface CharacterDevPromptContext {
  readonly kernelSummary?: string;
  readonly conceptSummary?: string;
  readonly userNotes?: string;
  readonly webContext: CharacterWebContext;
}
```

For Stage 1, only webContext + kernel/concept inputs are needed (no prior stage outputs).

The prompt instructs the LLM to:
1. Consider the character's role in the cast (from webContext.assignment)
2. Consider the cast dynamics and relationships
3. Generate a CharacterKernel with dramatic objectives, opposition, stakes, constraints, and pressure

### `src/llm/schemas/char-kernel-schema.ts`:

JSON Schema matching `CharacterKernel` interface fields:
- `characterName` (string)
- `superObjective` (string)
- `immediateObjectives` (string array)
- `primaryOpposition` (string)
- `stakes` (string array)
- `constraints` (string array)
- `pressurePoint` (string)

### `src/llm/char-kernel-generation.ts`:

Follow `spine-generator.ts` pattern. Use stage `GENERATING_CHAR_KERNEL`.

Return type:
```typescript
interface CharKernelGenerationResult {
  readonly characterKernel: CharacterKernel;
  readonly rawResponse: string;
}
```

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/char-kernel-generation.test.ts`:
  - Prompt includes character name and role from webContext
  - Prompt includes cast dynamics summary
  - Schema validates a well-formed CharacterKernel response
  - Generation function returns typed CharKernelGenerationResult
  - Generation function uses correct stage model

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- `CharacterKernel` type from `character-pipeline-types.ts` is used as-is (not redefined)
- No existing tests or code modified

## Outcome

- **Completion date**: 2026-03-09
- **What was changed**:
  - Created `src/llm/prompts/char-kernel-prompt.ts` with `CharacterDevPromptContext` and `buildCharKernelPrompt`
  - Created `src/llm/schemas/char-kernel-schema.ts` with `CHAR_KERNEL_GENERATION_SCHEMA`
  - Created `src/llm/char-kernel-generation.ts` with `generateCharKernel` following character-web-generation pattern
  - Created `test/unit/llm/char-kernel-generation.test.ts` with 22 tests
  - Added `'charKernel'` to `PromptType` union in `src/logging/prompt-formatter.ts`
  - Registered schema in `anthropic-schema-compatibility.test.ts`
- **Deviations from original plan**:
  - Ticket schema section had incorrect field names (`opposition`→`primaryOpposition`, `pressure`→`pressurePoint`) and wrong type for `stakes` (string→string array). Corrected before implementation.
  - Two existing files were minimally modified (PromptType union, schema compatibility test) which is necessary infrastructure for any new LLM stage.
- **Verification**: typecheck passes, lint passes, 280 test suites / 3387 tests pass

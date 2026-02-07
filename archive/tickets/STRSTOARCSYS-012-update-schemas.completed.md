# STRSTOARCSYS-012: Update LLM Schemas

## Status
Completed (2026-02-07)

## Summary
Update LLM JSON/Zod schemas and transformation output to complete the transition away from `storyArc` for page generation responses, and expose structure-generation schema from the shared schemas module.

## Reassessed Assumptions (Current Repo Reality)
- `src/llm/schemas/structure-schema.ts` does **not** exist yet.
- Structure-generation JSON schema currently exists inline in `src/llm/structure-generator.ts` as a local constant.
- Schema tests are split across:
  - `test/unit/llm/schemas/openrouter-schema.test.ts`
  - `test/unit/llm/schemas/validation-schema.test.ts`
  - `test/unit/llm/schemas/response-transformer.test.ts`
  - `test/integration/llm/schema-pipeline.test.ts`
- `test/unit/llm/schemas.test.ts` is only a barrel-export smoke test and is not the primary place for behavior coverage.

## Updated Scope
1. Create `src/llm/schemas/structure-schema.ts` and export `STRUCTURE_GENERATION_SCHEMA`.
2. Update `src/llm/structure-generator.ts` to import/use the shared structure schema constant (no behavior changes to generation flow).
3. Update `src/llm/schemas/openrouter-schema.ts`:
   - Remove `storyArc`.
   - Add `beatConcluded` and `beatResolution`.
   - Include both new fields in `required`.
4. Update `src/llm/schemas/validation-schema.ts`:
   - Remove `storyArc`.
   - Add `beatConcluded: z.boolean().default(false)`.
   - Add `beatResolution: z.string().default('')`.
5. Update `src/llm/schemas/response-transformer.ts`:
   - Remove `storyArc` transform output.
   - Include `beatConcluded` and `beatResolution`.
6. Update `src/llm/schemas/index.ts` barrel exports for the new structure schema.
7. Update `src/llm/types.ts` `GenerationResult`:
   - Remove `storyArc?`.
   - Add required `beatConcluded: boolean` and `beatResolution: string`.

## Out of Scope
- Prompt rewrites (handled by STRSTOARCSYS-004/005/006).
- Engine structure progression logic.
- Persistence changes.
- New structure-generator orchestration (STRSTOARCSYS-013).

## Acceptance Criteria

### Functional
1. Story generation schema does not include `storyArc`.
2. Story generation schema includes required `beatConcluded` and `beatResolution`.
3. Validation schema defaults missing beat fields to `false` and `''`.
4. Response transformer includes beat fields and no longer returns `storyArc`.
5. Structure generation schema is available from `src/llm/schemas/structure-schema.ts` and used by `src/llm/structure-generator.ts`.

### Tests
1. Update schema unit tests in existing split files (not only barrel smoke test):
   - `test/unit/llm/schemas/openrouter-schema.test.ts`
   - `test/unit/llm/schemas/validation-schema.test.ts`
   - `test/unit/llm/schemas/response-transformer.test.ts`
2. Add unit tests for `src/llm/schemas/structure-schema.ts`.
3. Update integration coverage in `test/integration/llm/schema-pipeline.test.ts` where schema defaults/outputs changed.

### Invariants
- Existing narrative/choice/state canonical validations remain enforced.
- JSON schemas remain strict with `additionalProperties: false`.
- Response transformation remains deterministic and trimming behavior remains intact.

## Breaking Changes
- `GenerationResult.storyArc` removed.
- `GenerationResult.beatConcluded` and `GenerationResult.beatResolution` added and required post-transform.

## Estimated Scope
Small-to-medium: schema/type edits plus focused schema test updates.

## Outcome
- Completed as planned:
  - Added `src/llm/schemas/structure-schema.ts` and exported `STRUCTURE_GENERATION_SCHEMA`.
  - Reused shared structure schema in `src/llm/structure-generator.ts`.
  - Removed `storyArc` from story generation schema/validation/transform output and replaced with `beatConcluded` + `beatResolution`.
  - Updated `GenerationResult` in `src/llm/types.ts` to require `beatConcluded` and `beatResolution`.
  - Updated schema barrels (`src/llm/schemas/index.ts` and compatibility barrel `src/llm/schemas.ts`).
- Scope correction vs original plan:
  - Tests were updated in split schema test files and schema pipeline integration test, not just `test/unit/llm/schemas.test.ts`.
  - Added a dedicated new unit test file for the new structure schema module.

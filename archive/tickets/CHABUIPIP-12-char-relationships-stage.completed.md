# CHABUIPIP-12: Character Development Stage 4 — Deep Relationships

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03, CHABUIPIP-07
**Estimated diff size**: ~300-450 lines across prompt/schema/generation/tests plus shared exports

## Reassessed Scope

This ticket does **not** introduce the character-development pipeline from scratch. The repository already contains:

- `DeepRelationshipResult`, `CharacterDevStage`, `SavedDevelopedCharacter`, and `GENERATING_CHAR_RELATIONSHIPS`
- Stage 1-3 prompt builders, schemas, and generators
- Repository tests for developed characters and stage-completion helpers

This ticket should therefore extend the **existing** Stage 1-3 architecture with a Stage 4 implementation that matches the current pattern.

## Summary

Implement Stage 4: Deep Relationships.

Add the Stage 4 prompt builder, JSON schema, and generation function for `DeepRelationshipResult`, using the same architectural pattern as:

- `src/llm/prompts/char-agency-prompt.ts`
- `src/llm/schemas/char-agency-schema.ts`
- `src/llm/char-agency-generation.ts`

Stage 4 must deepen lightweight web-level relationship archetypes into full `CastRelationship` entries and generate personal secrets and dilemmas for the focal character. It must optionally consume already-developed counterpart characters from the same web for better cross-character coherence.

## Architectural Direction

Preferred architecture is to continue the existing staged-character pattern:

- Keep `CharacterDevPromptContext` as the minimal shared base context
- Introduce a Stage 4-specific prompt context that requires Stage 1-3 outputs and optionally accepts `otherDevelopedCharacters`
- Reuse existing enum/type-guard validation rather than aliasing or adding parallel enum systems
- Keep parsing and validation strict so malformed LLM output fails fast

This is preferable to introducing a generic “one context type with every stage optional” approach right now, because the current codebase already uses stage-specific prompt context extensions and that is the cleanest, least-fragile continuation of the existing design.

## File List

- `src/llm/prompts/char-relationships-prompt.ts` (CREATE)
- `src/llm/schemas/char-relationships-schema.ts` (CREATE)
- `src/llm/char-relationships-generation.ts` (CREATE)
- `test/unit/llm/char-relationships-generation.test.ts` (CREATE)

Expected shared-code touch points:

- `src/llm/index.ts` if Stage 4 exports are centrally re-exported
- Any narrow shared type/import files required to expose the new stage consistently

## Out of Scope

- Do **not** implement the character stage runner in this ticket
- Do **not** implement Stage 5 textual presentation
- Do **not** redesign `saved-developed-character.ts` or persistence models unless Stage 4 exposes a concrete bug
- Do **not** add backwards-compatibility aliases for old field names

## Detailed Changes

### `src/llm/prompts/char-relationships-prompt.ts`

Create a Stage 4 prompt builder with a dedicated context interface:

```typescript
interface CharRelationshipsPromptContext extends CharacterDevPromptContext {
  readonly characterKernel: CharacterKernel;
  readonly tridimensionalProfile: TridimensionalProfile;
  readonly agencyModel: AgencyModel;
  readonly otherDevelopedCharacters?: readonly SavedDevelopedCharacter[];
}
```

Prompt requirements:

1. Include the same web-context scaffolding used by Stages 1-3:
   - assignment
   - cast dynamics summary
   - relationship archetypes
   - optional kernel/concept/user notes
2. Include prior stage outputs explicitly:
   - Stage 1 `CharacterKernel`
   - Stage 2 `TridimensionalProfile`
   - Stage 3 `AgencyModel`
3. Instruct the LLM to:
   - deepen lightweight archetypes into full `CastRelationship` records
   - generate `history`, `currentTension`, `leverage`, and `numericValence`
   - generate `secrets` and `personalDilemmas` for the focal character
4. When `otherDevelopedCharacters` is present, include concise counterpart context instead of dumping entire raw objects
5. When `otherDevelopedCharacters` is empty or omitted, the prompt must still work cleanly without a counterpart section

### `src/llm/schemas/char-relationships-schema.ts`

Create a strict JSON schema for:

```typescript
interface DeepRelationshipResult {
  readonly relationships: readonly CastRelationship[];
  readonly secrets: readonly string[];
  readonly personalDilemmas: readonly string[];
}
```

Schema requirements:

- `relationships` entries must require:
  - `fromCharacter`
  - `toCharacter`
  - `relationshipType`
  - `valence`
  - `numericValence`
  - `history`
  - `currentTension`
  - `leverage`
- `relationshipType` must use the existing `PipelineRelationshipType` enum values
- `valence` must use the existing `RelationshipValence` enum values
- `numericValence` must be constrained to the inclusive `-5` to `5` range
- `secrets` and `personalDilemmas` must be required string arrays

### `src/llm/char-relationships-generation.ts`

Follow the established Stage 1-3 generator pattern:

- `getStageModel('charRelationships')`
- `logPrompt(logger, 'charRelationships', messages)`
- OpenRouter call with `response_format`
- strict parse + typed return
- wrap with existing retry/fallback helpers

Return type:

```typescript
interface CharRelationshipsGenerationResult {
  readonly deepRelationships: DeepRelationshipResult;
  readonly rawResponse: string;
}
```

Validation requirements:

- validate `relationshipType` with existing type guards
- validate `valence` with existing type guards
- validate `numericValence` is a finite number within `-5..5`
- reject blank strings for required string fields
- reject empty arrays for `secrets` and `personalDilemmas`
- do **not** silently accept alias fields like `dilemmas`

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/char-relationships-generation.test.ts`
  - prompt includes web context plus Stage 1-3 outputs
  - prompt includes counterpart context when `otherDevelopedCharacters` is provided
  - prompt omits counterpart section when not provided or empty
  - schema defines `DeepRelationshipResult` structure and strict required fields
  - schema constrains enum-backed fields and numeric valence range
  - generation returns typed Stage 4 result
  - generation rejects invalid `relationshipType`
  - generation rejects invalid `valence`
  - generation rejects out-of-range `numericValence`
  - generation rejects missing `personalDilemmas`
  - generation rejects alias field usage such as `dilemmas`

### Relevant existing suites to keep green

- Character-building unit tests already in `test/unit/llm/`
- `test/unit/models/saved-developed-character.test.ts`
- `test/unit/persistence/developed-character-repository.test.ts`

## Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Use `DeepRelationshipResult` and `CastRelationship` as already defined
- Reuse existing enum/type-guard infrastructure
- Keep the implementation aligned with the current Stage 1-3 architecture rather than inventing a parallel pattern

## Notes on Scope vs Ideal Architecture

If Stage 4 exposes obvious duplication across Stage 1-4 generators or prompt builders, note that as follow-up architecture work, but do not do broad refactoring here unless it clearly reduces duplication with low risk and no ticket churn.

## Outcome

- Completed: 2026-03-09
- Actually changed:
  - Added Stage 4 prompt builder in `src/llm/prompts/char-relationships-prompt.ts`
  - Added strict Stage 4 schema in `src/llm/schemas/char-relationships-schema.ts`
  - Added Stage 4 generator in `src/llm/char-relationships-generation.ts`
  - Added Stage 4 unit coverage in `test/unit/llm/char-relationships-generation.test.ts`
  - Extended Anthropic schema compatibility coverage to include the new Stage 4 schema
- Deviations from original plan:
  - The ticket was corrected before implementation because the repo already had Stage 1-3 character development infrastructure, `DeepRelationshipResult`, progress stages, and persistence models
  - The original “no existing code modified” assumption was wrong for this repo; a shared schema-safety test needed to be updated to keep the architecture’s verification net intact
  - The implementation intentionally kept the existing stage-specific prompt-context pattern instead of broadening `CharacterDevPromptContext` into an everything-optional shared context
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/char-relationships-generation.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/models/saved-developed-character.test.ts test/unit/persistence/developed-character-repository.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/char-kernel-generation.test.ts test/unit/llm/char-tridimensional-generation.test.ts test/unit/llm/char-agency-generation.test.ts test/unit/llm/char-relationships-generation.test.ts`
  - `npm run typecheck`
  - `npm run lint`

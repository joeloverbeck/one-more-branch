# CHABUIPIP-11: LLM Pipeline - Agency Model (Stage 3)

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-01, CHABUIPIP-03, CHABUIPIP-07, CHABUIPIP-10
**Estimated diff size**: ~250 lines across 5-6 files

## Summary

Create the Stage 3 agency-model pipeline pieces: prompt builder, JSON schema, generation function, and unit coverage for `AgencyModel`.

This stage should fit the existing character-development architecture already established by `char-kernel` and `char-tridimensional`: a dedicated stage-specific prompt context, a strict JSON schema, explicit parse-time validation, and targeted unit tests. Do not invent a new runner or broaden the pipeline surface beyond what the current codebase needs.

## Reassessed Assumptions

- `AgencyModel` already exists in [`src/models/character-pipeline-types.ts`](/home/joeloverbeck/projects/one-more-branch/src/models/character-pipeline-types.ts) and its field is `currentIntentions`, not `intentions`.
- The shared `CharacterDevPromptContext` currently contains only shared optional summaries plus `webContext`. Stage-specific required upstream outputs are added via stage-specific extending interfaces. Stage 3 should follow the Stage 2 pattern with a dedicated `CharAgencyPromptContext`, not mutate the shared context unless there is a compelling architectural need.
- `GENERATING_CHAR_AGENCY` and the `charAgency` stage key already exist in generated/config metadata. This ticket does not need to add generation-stage identifiers.
- The repo already enforces Anthropic-compatible schema shapes through [`test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/llm/schemas/anthropic-schema-compatibility.test.ts). Adding a new schema requires updating that registry test, so the earlier "no existing code modified" assumption was incorrect.
- Existing Stage 1 and Stage 2 generators do not wire into a stage runner yet. This ticket should keep that layering intact and stop at the single-stage generator.

## File List

- `src/llm/prompts/char-agency-prompt.ts` (CREATE)
- `src/llm/schemas/char-agency-schema.ts` (CREATE)
- `src/llm/char-agency-generation.ts` (CREATE)
- `test/unit/llm/char-agency-generation.test.ts` (CREATE)
- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` (MODIFY)

## Scope

### In Scope

- Add a Stage 3 prompt builder that consumes:
  - `webContext`
  - `characterKernel` (Stage 1)
  - `tridimensionalProfile` (Stage 2)
  - optional `kernelSummary`, `conceptSummary`, `userNotes`
- Add a strict JSON schema for `AgencyModel`.
- Add a generator that mirrors the existing Stage 1/2 call pattern:
  - `build prompt -> logPrompt -> call OpenRouter -> parse JSON -> validate enums -> return typed result`
- Add focused unit coverage for prompt content, schema structure, enum compatibility, and parse-time validation.

### Out of Scope

- Do not create the stage runner (`CHABUIPIP-14`).
- Do not add Stage 4/5 prompt contexts or speculative shared abstractions.
- Do not alias old field names or support backward-compatible payload variants. The contract is `currentIntentions`.
- Do not refactor unrelated character-pipeline files unless required to keep the architecture internally consistent.

## Detailed Changes

### `src/llm/prompts/char-agency-prompt.ts`

Create a dedicated prompt context:

```typescript
interface CharAgencyPromptContext extends CharacterDevPromptContext {
  readonly characterKernel: CharacterKernel;
  readonly tridimensionalProfile: TridimensionalProfile;
}
```

Prompt requirements:

- Use the same two-message structure as the existing character stage prompts.
- Include cast role, cast dynamics, and relationship archetypes from `webContext`.
- Include the Stage 1 kernel and Stage 2 tridimensional profile explicitly.
- Instruct the model to derive:
  - `replanningPolicy`
  - `emotionSalience`
  - `coreBeliefs`
  - `desires`
  - `currentIntentions`
  - `falseBeliefs`
  - `decisionPattern`

Architectural note:

- Stay with a dedicated stage-specific interface. That is cleaner than prematurely turning `CharacterDevPromptContext` into an omnibus optional bag before Stages 4 and 5 exist.

### `src/llm/schemas/char-agency-schema.ts`

Schema must match `AgencyModel` exactly:

- `characterName`: string
- `replanningPolicy`: enum using Anthropic-compatible `anyOf`
- `emotionSalience`: enum using Anthropic-compatible `anyOf`
- `coreBeliefs`: string array
- `desires`: string array
- `currentIntentions`: string array
- `falseBeliefs`: string array
- `decisionPattern`: string

Requirements:

- `additionalProperties: false`
- `strict: true`
- Register the schema in the Anthropic compatibility test suite

### `src/llm/char-agency-generation.ts`

Follow the same architecture as `char-kernel-generation.ts`, `char-tridimensional-generation.ts`, and `character-web-generation.ts`.

Return type:

```typescript
interface CharAgencyGenerationResult {
  readonly agencyModel: AgencyModel;
  readonly rawResponse: string;
}
```

Validation requirements:

- Validate object shape and all required fields.
- Validate `replanningPolicy` with `isReplanningPolicy`.
- Validate `emotionSalience` with `isEmotionSalience`.
- Reject empty required string arrays.
- Trim string fields and string-array items before returning typed output.

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/char-agency-generation.test.ts`
  - Prompt includes `webContext`
  - Prompt includes Stage 1 kernel context
  - Prompt includes Stage 2 tridimensional context
  - Schema exposes the correct required fields
  - Schema uses `anyOf` for enum properties
  - Generation validates enum values in responses
  - Generation rejects missing/empty required fields
  - Generation returns typed `agencyModel` + `rawResponse`
- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`
  - Includes the new Stage 3 schema and still passes compatibility checks

### Invariants

- `npm run test:unit -- --runTestsByPath test/unit/llm/char-agency-generation.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` passes
- `npm run typecheck` passes
- `npm run lint` passes
- `AgencyModel` is used as-is from `character-pipeline-types.ts`
- Enum validation uses the existing type guards from `character-enums.ts`

## Architecture Rationale

This change is beneficial relative to the current state because the architecture already has an intentional stage-by-stage pattern and Stage 3 is the missing piece. Filling that gap is better than inventing a broader abstraction now.

At the same time, avoid two traps:

- Do not introduce backward-compatibility shims such as accepting both `intentions` and `currentIntentions`.
- Do not overgeneralize the prompt-context architecture before later stages prove the shape that should be shared.

If implementation reveals repeated parse/schema helpers across the character stages, note that for a later focused refactor rather than folding it into this ticket.

## Outcome

- **Completion date**: 2026-03-09
- **What changed**:
  - Added Stage 3 prompt builder at `src/llm/prompts/char-agency-prompt.ts`.
  - Added Stage 3 schema at `src/llm/schemas/char-agency-schema.ts`.
  - Added Stage 3 generation pipeline at `src/llm/char-agency-generation.ts`.
  - Added targeted unit coverage at `test/unit/llm/char-agency-generation.test.ts`.
  - Registered the schema in `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`.
  - Updated `src/logging/prompt-formatter.ts` so the new stage can be logged through the existing prompt logging contract.
- **Deviations from original plan**:
  - Kept the established dedicated stage-context pattern by introducing `CharAgencyPromptContext` instead of broadening the shared `CharacterDevPromptContext`.
  - Enforced the existing `AgencyModel` contract exactly with `currentIntentions`; no backward-compatible alias for `intentions` was introduced.
  - Allowed the minimal existing-file edits required by the real architecture and test harness rather than preserving the obsolete "no existing code modified" assumption.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/char-agency-generation.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`
  - `npm run typecheck`
  - `npm run lint`

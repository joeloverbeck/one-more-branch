# NARARCAUD-03: Thematic Stance for NPCs

**Status**: COMPLETED
**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: None
**Spec reference**: B3 — Thematic Architecture gaps

## Summary

Add a required `thematicStance` field to `DecomposedCharacter` so each character is explicitly positioned relative to the story's thematic argument. This enriches structured character context for all downstream prompts that consume decomposed characters.

## Assumption Reassessment

### Previous assumption (stale)
The ticket assumed entity decomposition fields are owned only by:
- `src/models/decomposed-character.ts`
- `src/llm/schemas/entity-decomposer-schema.ts`
- `src/llm/prompts/entity-decomposer-prompt.ts`
- `prompts/entity-decomposer-prompt.md`

### Current architecture reality
Field ownership is contract-centralized and propagated across layers:
- `src/llm/entity-decomposition-contract.ts` is the source of truth for character field definitions, required-field lists, and prompt guidance alignment.
- Schema (`entity-decomposer-schema.ts`) and parser normalization (`entity-decomposer.ts`) consume that contract.
- Persistence types/serialization must include the field (`story-serializer-types.ts`, `story-serializer.ts`) to keep saved stories structurally consistent.
- Existing alignment tests enforce cross-layer synchronization (`test/unit/llm/entity-decomposition-contract.test.ts`).

## Architectural Rationale

Adding `thematicStance` is beneficial to the current architecture because it:
- Keeps decomposition data explicit and machine-addressable instead of burying theme alignment in free-form text.
- Improves extensibility: downstream prompts can rely on a stable field rather than fragile inference.
- Fits the existing contract-centralization pattern, preventing schema/prompt/parser drift.

This should be implemented as a first-class required field (no aliasing/back-compat shim), consistent with current strict schema and contract practices.

## Files to Touch

- `src/models/decomposed-character.ts`
  - Add `readonly thematicStance: string` to `DecomposedCharacter`
  - Include `Thematic Stance:` in `formatDecomposedCharacterForPrompt`
- `src/llm/entity-decomposition-contract.ts`
  - Add schema definition and required-field membership for `thematicStance`
  - Ensure parser field lists include it via centralized string-field lists
- `src/llm/schemas/entity-decomposer-schema.ts`
  - No bespoke field wiring if contract-driven properties are used; verify inclusion via contract projection
- `src/llm/entity-decomposer.ts`
  - Ensure parsed `DecomposedCharacter` includes `thematicStance`
- `src/llm/prompts/entity-decomposer-prompt.ts`
  - Add instruction to derive and return thematic stance for each character
- `prompts/entity-decomposer-prompt.md`
  - Update prompt docs + JSON response shape
- `src/persistence/story-serializer-types.ts`
  - Add `thematicStance` to serialized character data
- `src/persistence/story-serializer.ts`
  - Include `thematicStance` in save/load mapping
- Test fixtures and tests that construct `DecomposedCharacter` literals

## Out of Scope

- Character voice formatting subsystem (`scene-character-voices.ts`)
- Lorekeeper-specific rubric redesign
- Analyst scoring/evaluation changes
- New thematic analytics beyond adding the field itself

## Acceptance Criteria

- [x] `thematicStance` is required on `DecomposedCharacter` and present in prompt formatting output
- [x] Entity decomposition contract includes `thematicStance` in schema + required field projection
- [x] Entity decomposer prompt instructs generation of thematic stance
- [x] Entity decomposer parsing returns `thematicStance` for every character
- [x] Story serialization/deserialization round-trips `thematicStance`
- [x] Existing tests updated for new required field and targeted new tests added
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Relevant test suites pass

## Outcome

- **Completion date**: 2026-02-27
- **What changed**:
  - Added required `thematicStance` to `DecomposedCharacter`.
  - Propagated it through contract-owned decomposition fields, parser output, prompt guidance, prompt docs, and story serialization types/mapping.
  - Extended model/parser/serializer tests to assert presence and round-trip behavior for `thematicStance`.
- **Deviations from original plan**:
  - Expanded scope beyond the initially listed files to include contract centralization and persistence layers, which are architectural ownership points in the current codebase.
  - Used contract-driven schema projection instead of direct bespoke schema edits.
- **Verification**:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

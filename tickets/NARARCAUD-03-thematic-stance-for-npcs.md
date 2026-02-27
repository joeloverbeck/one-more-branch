# NARARCAUD-03: Thematic Stance for NPCs

**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: None
**Spec reference**: B3 — Thematic Architecture gaps

## Summary

Add a `thematicStance` field to `DecomposedCharacter` so each NPC is positioned relative to the story's thematic argument. This enriches character context for all downstream prompts that consume decomposed characters.

## Files to Touch

- `src/models/decomposed-character.ts` — add `readonly thematicStance: string` to `DecomposedCharacter`; add to `formatDecomposedCharacterForPrompt` output
- `src/llm/schemas/entity-decomposer-schema.ts` — add `thematicStance` field (required string)
- `src/llm/prompts/entity-decomposer-prompt.ts` — add thematic stance instruction
- `prompts/entity-decomposer-prompt.md` — update doc

## Out of Scope

- Character voice formatting (`scene-character-voices.ts`)
- Lorekeeper prompt
- Analyst evaluation

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: `DecomposedCharacter` with thematicStance formats correctly
- [ ] Unit test: entity decomposer schema includes `thematicStance`
- [ ] Invariant: Existing decomposed character tests updated with required field
- [ ] Invariant: All downstream consumers of `DecomposedCharacter` still compile

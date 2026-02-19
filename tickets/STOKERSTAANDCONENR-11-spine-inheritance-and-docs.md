# STOKERSTAANDCONENR-11: Spine Inheritance & Prompt Documentation

**Status**: PENDING
**Priority**: LOW
**Depends On**: STOKERSTAANDCONENR-09, STOKERSTAANDCONENR-10
**Spec Phase**: 8a, 10a, 10b

## Summary

Update the spine generator prompt to enforce conflictAxis/conflictType inheritance from the selected concept. Create prompt documentation for the kernel ideator and evaluator. Update existing prompt docs for concept changes.

## File List

### Modified Files
- `src/llm/prompts/spine-prompt.ts` -- Add instruction enforcing conflict inheritance from concept

### New Files
- `prompts/kernel-ideator-prompt.md` -- Kernel ideator prompt documentation
- `prompts/kernel-evaluator-prompt.md` -- Kernel evaluator prompt documentation

### Modified (docs only)
- `prompts/concept-ideator-prompt.md` -- Document kernel input requirement, 3 new fields, updated pipeline position
- `prompts/concept-evaluator-prompt.md` -- Document updated scoring rubric for hookStrength and conflictEngine
- `prompts/spine-prompt.md` -- Document conflictAxis/conflictType inheritance from concept

## Detailed Requirements

### `src/llm/prompts/spine-prompt.ts`

Add instruction to the system message:
"The conflictAxis and conflictType are inherited from the selected concept. Do NOT reinvent them. Use the provided values exactly."

This is a **prompt text change only**. The `StorySpine` interface already has `conflictAxis` and `conflictType` fields. This change ensures the LLM respects the concept's values rather than diverging.

Verify that the spine prompt builder receives the concept's `conflictAxis` and `conflictType` values. If they're already passed, just add the instruction. If not, the builder function signature may need to accept them (check the existing code).

### `prompts/kernel-ideator-prompt.md`

New file. Mirror format of `prompts/concept-ideator-prompt.md`:
- Source files: `src/llm/kernel-ideator.ts`, `src/llm/prompts/kernel-ideator-prompt.ts`, `src/llm/schemas/kernel-ideator-schema.ts`
- Pipeline position: First stage (before concept)
- Messages sent to model: system + user
- Schema: kernel ideator schema structure
- Response format: Array of 6-8 StoryKernel objects

### `prompts/kernel-evaluator-prompt.md`

New file. Mirror format of `prompts/concept-evaluator-prompt.md`:
- Source files: `src/llm/kernel-evaluator.ts`, `src/llm/prompts/kernel-evaluator-prompt.ts`, `src/llm/schemas/kernel-evaluator-schema.ts`
- Pipeline position: Second stage (after ideator, before concept)
- Scoring dimensions: 5 dimensions with weights and thresholds
- Messages sent to model: system + user (two-phase)
- Schema: kernel evaluator schema structure
- Response format: Scored + evaluated kernels

### Existing prompt doc updates

**`prompts/concept-ideator-prompt.md`**:
- Document that concept generation now requires kernel input
- Document 3 new fields (whatIfQuestion, ironicTwist, playerFantasy)
- Update pipeline position diagram: Kernel -> **Concept** -> Spine -> Structure -> Pages

**`prompts/concept-evaluator-prompt.md`**:
- Document updated hookStrength rubric (evaluates whatIfQuestion + playerFantasy)
- Document updated conflictEngine rubric (evaluates ironicTwist)

**`prompts/spine-prompt.md`**:
- Document conflictAxis/conflictType inheritance from concept
- Note that spine generator must not reinvent these values

## Out of Scope

- Kernel implementation (STOKERSTAANDCONENR-01 through -08)
- ConceptSpec field changes (STOKERSTAANDCONENR-09)
- Concept-kernel integration (STOKERSTAANDCONENR-10)
- Any changes to the StorySpine interface or spine-related types
- Any changes to the structure generator
- Any changes to the per-page generation pipeline

## Acceptance Criteria

### Tests That Must Pass
- Spine prompt contains instruction about inheriting conflictAxis/conflictType
- `npm run typecheck` passes
- `npm run lint` passes
- Existing spine-related tests still pass

### Invariants
- StorySpine interface is UNCHANGED
- Spine prompt change is text-only (no schema or response format changes)
- Existing prompt docs maintain their format and structure
- Pipeline position is correctly documented: Kernel -> Concept -> Spine -> Structure -> Pages
- No code changes to structure generator or per-page pipeline

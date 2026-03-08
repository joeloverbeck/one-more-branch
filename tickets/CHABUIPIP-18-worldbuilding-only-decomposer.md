# CHABUIPIP-18: Entity Decomposer — Worldbuilding-Only Mode

**Status**: NOT STARTED
**Dependencies**: None (independent of other tickets)
**Estimated diff size**: ~150 lines across 3 files

## Summary

Add a worldbuilding-only decomposition mode to the entity decomposer. When a character web provides characters, the entity decomposer only needs to decompose world facts (not characters). Create a new prompt and schema for this mode, and add a `decomposeWorldbuildingOnly()` function.

## File List

- `src/llm/prompts/world-decomposer-prompt.ts` (CREATE)
- `src/llm/schemas/world-decomposition-schema.ts` (CREATE)
- `src/llm/entity-decomposer.ts` (MODIFY — add `decomposeWorldbuildingOnly` function)
- `test/unit/llm/entity-decomposer.test.ts` (MODIFY — add tests for new function)

## Out of Scope

- Do NOT modify the existing `decomposeEntities` function behavior
- Do NOT modify the existing entity decomposition prompt or schema
- Do NOT modify `decomposed-character.ts` or `decomposed-world.ts`
- Do NOT modify story creation flow (CHABUIPIP-19)
- Do NOT create any service or route code

## Detailed Changes

### `src/llm/prompts/world-decomposer-prompt.ts`:

New prompt builder that instructs the LLM to:
- Decompose ONLY the worldbuilding into structured world facts
- Explicitly states: "Character data is provided separately — do NOT generate character profiles"
- Same world decomposition quality as the existing entity decomposer
- Input: worldbuilding text, tone, starting situation (same context as existing decomposer minus character data)

### `src/llm/schemas/world-decomposition-schema.ts`:

JSON Schema with only `worldFacts` array (same structure as existing world facts in entity decomposition schema), without the `characters` array.

### `src/llm/entity-decomposer.ts`:

Add new exported function:
```typescript
async function decomposeWorldbuildingOnly(
  context: WorldDecompositionContext,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback
): Promise<{ decomposedWorld: DecomposedWorld[]; rawResponse: string }>
```

Where `WorldDecompositionContext` contains:
- `worldbuilding: string`
- `tone?: string`
- `startingSituation?: string`
- `spine?: StorySpine`
- `conceptSpec?: string`
- `storyKernel?: StoryKernel` (from models, not character kernel)

Uses the new worldbuilding-only prompt and schema. Follows the same LLM call pattern as existing `decomposeEntities`.

## Pre-Implementation Check

Read the existing `entity-decomposer.ts` and its prompt/schema to understand the current world decomposition format. The new worldbuilding-only mode must produce the same `DecomposedWorld` type.

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/entity-decomposer.test.ts` (new tests):
  - `decomposeWorldbuildingOnly` calls LLM with worldbuilding-only prompt
  - `decomposeWorldbuildingOnly` returns DecomposedWorld array
  - `decomposeWorldbuildingOnly` does NOT return character data
  - `decomposeWorldbuildingOnly` uses correct schema (worldFacts only)
  - Existing `decomposeEntities` tests still pass unchanged

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Existing `decomposeEntities` function is NOT modified
- `DecomposedWorld` type is NOT modified
- World facts output matches the same shape as existing entity decomposer
- No existing tests are modified (only new tests added)

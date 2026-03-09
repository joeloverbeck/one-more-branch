# CHABUIPIP-18: Entity Decomposer — Worldbuilding-Only Mode

**Status**: COMPLETED
**Dependencies**: Blocks `CHABUIPIP-19` story-creation integration, but can be implemented independently first
**Estimated diff size**: ~200-300 lines across 6-8 files

## Summary

Add a worldbuilding-only decomposition mode to the entity decomposer. When a character web already provides `DecomposedCharacter[]`, story prep should only ask the LLM for structured world facts. Implement this as a second public entry point over the existing decomposer plumbing, not as a separate parallel subsystem.

## Reassessed Assumptions

- `src/llm/entity-decomposer.ts` currently owns the full OpenRouter call path, response parsing, retry/fallback handling, and prompt logging for entity decomposition. A clean implementation should reuse that plumbing and share parsing utilities instead of duplicating a second fetch/parse stack.
- The current ticket understates the public surface that changes. A typed worldbuilding-only entry point should also update `src/llm/entity-decomposer-types.ts`, and likely `src/llm/index.ts`, so downstream code can consume it without reaching into file-internal types.
- The existing prompt is documented in `prompts/entity-decomposer-prompt.md`. Per repo rules, prompt-pipeline scope/schema changes must update prompt docs in the same pass. This ticket must include that documentation work.
- The goal is behavioral isolation, not source-file immutability. `decomposeEntities()` behavior should remain unchanged, but internal refactoring inside `entity-decomposer.ts` is allowed when needed to keep the architecture DRY and extensible.
- The new mode should reuse the existing world-fact parsing rules and schema fragment so world fact semantics cannot drift between full decomposition and world-only decomposition.

## File List

- `src/llm/prompts/world-decomposer-prompt.ts` (CREATE)
- `src/llm/schemas/world-decomposition-schema.ts` (CREATE)
- `src/llm/entity-decomposer.ts` (MODIFY — add `decomposeWorldbuildingOnly` and extract shared request/parsing helpers as needed)
- `src/llm/entity-decomposer-types.ts` (MODIFY — add worldbuilding-only context/result types)
- `src/llm/index.ts` (MODIFY — export the new entry point/types if story prep consumes the llm barrel)
- `prompts/entity-decomposer-prompt.md` (MODIFY — document the new worldbuilding-only mode and output contract)
- `test/unit/llm/entity-decomposer.test.ts` (MODIFY — add tests for new function)

## Out of Scope

- Do NOT change the external behavior of `decomposeEntities`
- Do NOT widen this ticket into story creation integration (`CHABUIPIP-19`)
- Do NOT modify `decomposed-character.ts` or `decomposed-world.ts`
- Do NOT create any service or route code
- Do NOT duplicate the world-fact schema or parser logic if a shared fragment/helper can be extracted cleanly

## Detailed Changes

### `src/llm/prompts/world-decomposer-prompt.ts`:

New prompt builder that instructs the LLM to:
- Decompose ONLY the worldbuilding into structured world facts
- Explicitly states: "Character data is provided separately — do NOT generate character profiles"
- Reuse the same world decomposition guidance and taxonomy as the existing entity decomposer
- Input: worldbuilding text, tone, starting situation, spine, concept spec, and story kernel (same world-context inputs the existing decomposer already understands, minus character/NPC inputs)

Architectural note:
- Prefer extracting shared worldbuilding context-section builders from the existing prompt path over manually duplicating long prompt prose in two places.

### `src/llm/schemas/world-decomposition-schema.ts`:

JSON Schema with only `worldFacts` array, using the same item shape and validation rules as the existing entity decomposition schema.

Architectural note:
- Prefer extracting a shared `worldFacts` schema fragment consumed by both schemas so future changes to world fact fields happen once.

### `src/llm/entity-decomposer.ts`:

Add new exported function:
```typescript
async function decomposeWorldbuildingOnly(
  context: WorldDecompositionContext,
  apiKey: string,
): Promise<{ decomposedWorld: DecomposedWorld[]; rawResponse: string }>
```

Where `WorldDecompositionContext` contains:
- `worldbuilding: string`
- `tone: string`
- `startingSituation?: string`
- `spine?: StorySpine`
- `conceptSpec?: ConceptSpec`
- `storyKernel?: StoryKernel`

Return shape should be:
```typescript
Promise<{ decomposedWorld: DecomposedWorld; rawResponse: string }>
```

Uses the new worldbuilding-only prompt and schema, while reusing the same low-level retry/fallback/logging/fetch/parsing path as `decomposeEntities`.

### `src/llm/entity-decomposer-types.ts`:

Add a dedicated `WorldDecompositionContext` plus `WorldDecompositionResult`. Do not overload `EntityDecomposerContext` with nullable character fields just to make the new mode compile.

### `src/llm/index.ts`:

Export the new function and result/context types if downstream integration uses the barrel import, which current engine code does for other llm entry points.

### `prompts/entity-decomposer-prompt.md`:

Document:
- The existing full decomposition mode
- The new worldbuilding-only mode
- The fact that world fact semantics are shared between both modes
- The world-only JSON response shape (`{ worldFacts: [...] }`)

## Pre-Implementation Check

Read the existing `entity-decomposer.ts`, prompt/schema files, and prompt doc to understand the current world decomposition format. The new worldbuilding-only mode must produce the same `DecomposedWorld` type and preserve a single source of truth for world-fact structure.

## Architectural Rationale

This change is worth doing because it removes an increasingly bad fit in the planned character-web flow: once characters are already curated and converted upstream, asking the entity decomposer to regenerate them is redundant and risks divergence. The robust architecture is:

- character web service owns character preparation
- entity decomposer owns world-fact decomposition
- story prep composes those outputs without aliasing or fallback duplication

The implementation should move the codebase toward that separation of responsibilities without creating a second decomposer implementation to maintain forever.

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/entity-decomposer.test.ts` (new tests):
  - `decomposeWorldbuildingOnly` calls LLM with worldbuilding-only prompt
  - `decomposeWorldbuildingOnly` returns `DecomposedWorld`
  - `decomposeWorldbuildingOnly` uses the world-only schema
  - `decomposeWorldbuildingOnly` preserves `rawWorldbuilding`
  - `decomposeWorldbuildingOnly` parses/filters world facts with the same rules as `decomposeEntities`
  - `decomposeWorldbuildingOnly` tolerates empty `worldFacts`
  - Existing `decomposeEntities` tests still pass

Additional test expectations if refactoring exposes them naturally:
- Shared world-fact schema fragment is covered indirectly by both schema consumers
- Prompt docs are updated if any prompt ownership/scope statement changed

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- Existing `decomposeEntities` public behavior is unchanged
- `DecomposedWorld` type is NOT modified
- World facts output matches the same shape and parsing semantics as the existing entity decomposer
- Shared logic remains DRY: no second hand-maintained copy of the world-fact parser or schema fragment

## Outcome

- Completed: 2026-03-09
- Actually changed:
  - Added `decomposeWorldbuildingOnly()` with dedicated world-only context/result types.
  - Added a new world-only prompt and schema.
  - Refactored the decomposer internals to share the OpenRouter request path and world-fact parsing logic across full and world-only modes.
  - Extracted a shared `WORLD_FACTS_ARRAY_SCHEMA` so full and world-only schemas cannot drift.
  - Updated prompt documentation and prompt logging to recognize the world-only mode.
  - Added unit coverage for the new mode and updated the schema compatibility meta-test for the new schema.
- Deviations from original plan:
  - The implementation intentionally modified `entity-decomposer.ts` internals to keep the architecture DRY; only external `decomposeEntities()` behavior remained unchanged.
  - The change also touched `src/logging/prompt-formatter.ts` and the schema compatibility meta-test, which the original ticket did not account for but the current architecture required.
- Verification:
  - `npm run test:unit -- --coverage=false test/unit/llm/entity-decomposer.test.ts`
  - `npm run typecheck`
  - `npm run lint`

# CHATWB-004: Consolidate world prompt formatting into the prompt layer

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — prompt formatting ownership and prompt call sites
**Deps**: /home/joeloverbeck/projects/one-more-branch/archive/tickets/CHATWB-001.completed.md

## Problem

Worldbuilding prompt formatting is currently split across two layers:

- `src/llm/prompts/sections/shared/worldbuilding-sections.ts` owns the specialized prompt-facing builders (`Spine`, `CharacterWeb`, `CharacterDev`, `Page`, `Chat`)
- `src/models/decomposed-world.ts` still owns the generic `formatDecomposedWorldForPrompt()` function and the `WorldPromptConsumer` type

That split is an architectural smell. Prompt formatting policy belongs in the prompt layer, not the model layer. As long as the model layer exposes consumer-shaped formatting, prompt ownership remains blurred and the `WorldPromptConsumer` type suggests a dispatch architecture that the codebase does not actually use consistently.

## Assumption Reassessment (2026-03-27)

1. `src/models/decomposed-world.ts` currently exports both the data model (`WorldFact`, `DecomposedWorld`) and prompt-facing formatting helpers (`formatDecomposedWorldForPrompt`, `WorldPromptConsumer`) — confirmed.
2. `src/llm/prompts/sections/shared/worldbuilding-sections.ts` currently owns the specialized prompt builders for `Spine`, `CharacterWeb`, `CharacterDev`, `Page`, and `Chat` — but only `Spine`, `CharacterWeb`, `CharacterDev`, and `Chat` are actually consumed. `buildWorldSectionForPage()` exists but currently has no call sites.
3. Multiple prompt call sites still import `formatDecomposedWorldForPrompt()` directly from the model layer, including planner sections, structure generation shared context, scene ideation, lorekeeper, and rewrite prompts — confirmed.
4. The existing `WorldPromptConsumer` type is not a real shared dispatch mechanism. It only exists in the model layer, only affects open-question inclusion for the generic `PAGE` case, and does not even model the already-existing prompt-layer `CHAT` consumer.
5. Existing generic world-formatting tests are still centered on `test/unit/models/decomposed-models.test.ts`, which mixes prompt-formatting coverage into model tests. Prompt-layer tests currently cover only `buildWorldSectionForChat()`.

## Architecture Check

1. Prompt text assembly should live in the prompt layer. Keeping world-formatting policy there makes the ownership boundary explicit: models define data; prompts decide how that data is rendered for LLM consumption.
2. A single prompt-layer dispatch helper is cleaner than the current hybrid design. It should be the only public entry point for world prompt rendering, with explicit consumers for the generic grouped format and the specialized prompt variants that are actually used.
3. The current prompt-layer `buildWorldSectionForPage()` is dead overlapping behavior. Keeping both an unused page formatter and a model-layer generic formatter is worse than either one alone. The consolidation should either remove the unused page formatter or fold its responsibility into the new dispatch design based on actual call-site needs.
4. This should be a consolidation, not a compatibility shim. Remove prompt-facing formatting exports from the model layer once prompt call sites are migrated.
5. No backwards-compatibility aliasing/shims introduced.

## What to Change

### 1. Move generic world prompt formatting out of the model layer

Create prompt-layer ownership for the current generic formatter behavior:

- Move or recreate the generic structured formatter in `src/llm/prompts/sections/shared/worldbuilding-sections.ts`
- Keep the current generic output shape intact unless a prompt-specific improvement is explicitly justified in this ticket
- Remove `formatDecomposedWorldForPrompt()` and `WorldPromptConsumer` from `src/models/decomposed-world.ts`

### 2. Introduce explicit prompt-layer dispatch

In the prompt layer, add a small dispatch API that makes consumer selection explicit. The naming can be finalized during implementation, but the intent is:

- prompt-layer type for world prompt consumers
- one exported entry point that routes to the appropriate builder
- specialized builders remain private or exported only when still needed by direct call sites
- the dispatch must reflect actual current usage, including `CHAT`, and must not preserve dead branches just because they existed historically

The dispatch must reflect actual usage, not theoretical future consumers.

### 3. Remove the dead page-specific duplicate unless implementation proves it is still needed

- `buildWorldSectionForPage()` currently has no call sites
- If its behavior is not the chosen canonical page/general-purpose formatter after reassessment, delete it rather than preserving duplicate formatting paths
- If page-specific behavior is still warranted, document why it is distinct from the generic grouped formatter and route it through the new dispatch instead of keeping it as a stray export

### 4. Migrate existing prompt call sites

Update current imports/callers that still depend on the model-layer formatter, including:

- planner opening / continuation context
- structure generation shared context
- scene ideator prompt
- lorekeeper prompt
- structure rewrite / spine rewrite prompts

If a caller truly needs the generic grouped-by-domain format, route it through the new prompt-layer generic consumer instead of the model layer.

### 5. Move or split tests so ownership matches code

- Keep model tests focused on model/data behavior
- Add prompt-layer tests for the generic formatter and dispatch behavior
- Preserve or strengthen existing assertions around grouped domains, fact tags, empty input, open-question behavior, and no-duplication/consumer-routing behavior where applicable

## Files to Touch

- `src/models/decomposed-world.ts` (modify) — remove prompt-formatting ownership, keep data model ownership
- `src/models/index.ts` (modify) — update exports
- `src/llm/prompts/sections/shared/worldbuilding-sections.ts` (modify) — add generic formatter + dispatch ownership; remove dead duplicate paths if they are not justified
- `src/llm/prompts/sections/planner/opening-context.ts` (modify) — switch to prompt-layer import
- `src/llm/prompts/sections/planner/continuation-context.ts` (modify) — switch to prompt-layer import
- `src/llm/prompts/sections/structure-generation/shared-context.ts` (modify) — switch to prompt-layer import
- `src/llm/prompts/scene-ideator-prompt.ts` (modify) — switch to prompt-layer import
- `src/llm/prompts/lorekeeper-prompt.ts` (modify) — switch to prompt-layer import
- `src/llm/prompts/structure-rewrite-prompt.ts` (modify) — switch to prompt-layer import
- `src/llm/prompts/spine-rewrite-prompt.ts` (modify) — switch to prompt-layer import
- `test/unit/models/decomposed-models.test.ts` (modify) — remove or narrow prompt-formatting assertions as needed
- `test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts` (modify) — add generic formatter / dispatch coverage

## Out of Scope

- Changing which world facts individual prompt consumers select, unless required to preserve current behavior during the move
- Altering chat pipeline wiring from `CHATWB-003`
- Worldbuilding decomposition schema changes

## Acceptance Criteria

### Tests That Must Pass

1. No prompt module imports `formatDecomposedWorldForPrompt()` or `WorldPromptConsumer` from `src/models/decomposed-world.ts`
2. Generic grouped world formatting remains available through the prompt layer and preserves current behavior for existing callers
3. Specialized consumers are selected from the prompt layer, not the model layer; the prompt-layer consumer list matches actual code usage
4. Model-layer tests no longer own prompt-formatting behavior that has moved to the prompt layer
5. Any dead duplicate world-formatting path identified during reassessment is removed or explicitly justified
6. Existing suite: `npm test`

### Invariants

1. `src/models/decomposed-world.ts` owns data contracts, not prompt rendering policy
2. Prompt consumers select world formatting through prompt-layer APIs only
3. No compatibility alias or temporary re-export is left behind in the model layer
4. There is only one canonical prompt-layer entry point for generic world formatting; duplicate dead exports are not retained

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts` — cover generic grouped formatting, specialized dispatch, empty input, fact tags, and open-question behavior in the prompt layer
2. `test/unit/models/decomposed-models.test.ts` — narrow to model/data behavior after prompt-formatting coverage moves out
3. Prompt call-site tests already covering worldbuilding inclusion should be updated only where entry-point changes affect them or where the dead/duplicate page path changes expected ownership

### Commands

1. `npx jest test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts test/unit/models/decomposed-models.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

## Outcome

- Completion date: 2026-03-27
- Actual changes:
  - Moved generic grouped world formatting into `src/llm/prompts/sections/shared/worldbuilding-sections.ts`
  - Introduced a single prompt-layer `buildWorldSection()` dispatch API with actual in-use consumers: `GENERIC`, `SPINE`, `CHARACTER_WEB`, `CHARACTER_DEV`, and `CHAT`
  - Removed `formatDecomposedWorldForPrompt()` and `WorldPromptConsumer` from `src/models/decomposed-world.ts`
  - Removed the dead prompt-layer `buildWorldSectionForPage()` path instead of preserving an unused duplicate
  - Migrated both the model-layer generic callers and the existing specialized prompt callers onto the shared prompt-layer entry point
  - Moved generic world-formatting assertions out of model tests and expanded prompt-layer tests to cover generic plus dispatch behavior
- Deviations from original plan:
  - The implementation went further than the initial caller list by migrating all prompt-layer world-formatting consumers to the single dispatch API, not just the model-layer formatter call sites
  - The unused page-specific formatter was deleted outright because reassessment showed no valid call site requiring it
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts test/unit/models/decomposed-models.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`

# CHATWB-004: Consolidate world prompt formatting into the prompt layer

**Status**: PENDING
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
2. `src/llm/prompts/sections/shared/worldbuilding-sections.ts` currently owns the specialized prompt builders for `Spine`, `CharacterWeb`, `CharacterDev`, `Page`, and `Chat` — confirmed.
3. Multiple prompt call sites still import `formatDecomposedWorldForPrompt()` directly from the model layer, including planner sections, structure generation shared context, scene ideation, lorekeeper, and rewrite prompts — confirmed.
4. The existing `WorldPromptConsumer` type is only used to suppress open questions for the generic `PAGE` case; it is not a real central dispatch mechanism for all prompt consumers — confirmed.
5. Existing world-formatting tests are still centered on `test/unit/models/decomposed-models.test.ts`, which mixes prompt-formatting coverage into model tests — confirmed.

## Architecture Check

1. Prompt text assembly should live in the prompt layer. Keeping world-formatting policy there makes the ownership boundary explicit: models define data; prompts decide how that data is rendered for LLM consumption.
2. A single prompt-layer dispatch helper is cleaner than the current hybrid design. It lets callers choose between `GENERIC`, `SPINE`, `CHARACTER_WEB`, `CHARACTER_DEV`, `PAGE`, and `CHAT` formatting without importing formatting logic from the model layer.
3. This should be a consolidation, not a compatibility shim. Remove prompt-facing formatting exports from the model layer once prompt call sites are migrated.
4. No backwards-compatibility aliasing/shims introduced.

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

The dispatch must reflect actual usage, not theoretical future consumers.

### 3. Migrate existing prompt call sites

Update current imports/callers that still depend on the model-layer formatter, including:

- planner opening / continuation context
- structure generation shared context
- scene ideator prompt
- lorekeeper prompt
- structure rewrite / spine rewrite prompts

If a caller truly needs the generic grouped-by-domain format, route it through the new prompt-layer generic consumer instead of the model layer.

### 4. Move or split tests so ownership matches code

- Keep model tests focused on model/data behavior
- Add prompt-layer tests for the generic formatter and dispatch behavior
- Preserve or strengthen existing assertions around grouped domains, fact tags, empty input, and open-question behavior

## Files to Touch

- `src/models/decomposed-world.ts` (modify) — remove prompt-formatting ownership, keep data model ownership
- `src/models/index.ts` (modify) — update exports
- `src/llm/prompts/sections/shared/worldbuilding-sections.ts` (modify) — add generic formatter + dispatch ownership
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
3. Specialized consumers (`SPINE`, `CHARACTER_WEB`, `CHARACTER_DEV`, `PAGE`, `CHAT`) are selected from the prompt layer, not the model layer
4. Model-layer tests no longer own prompt-formatting behavior that has moved to the prompt layer
5. Existing suite: `npm test`

### Invariants

1. `src/models/decomposed-world.ts` owns data contracts, not prompt rendering policy
2. Prompt consumers select world formatting through prompt-layer APIs only
3. No compatibility alias or temporary re-export is left behind in the model layer

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts` — cover generic grouped formatting, specialized dispatch, empty input, fact tags, and open-question behavior in the prompt layer
2. `test/unit/models/decomposed-models.test.ts` — narrow to model/data behavior after prompt-formatting coverage moves out
3. Prompt call-site tests already covering worldbuilding inclusion should be updated only where import/entry-point changes affect them

### Commands

1. `npx jest test/unit/llm/prompts/sections/shared/worldbuilding-sections.test.ts test/unit/models/decomposed-models.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

# SCEIDEDIVOVE-007: Move scene ideation lane taxonomy into a shared domain contract

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — shared type ownership and import boundaries for scene ideation
**Deps**: `archive/tickets/SCEIDEDIVOVE-001-scene-ideation-contract-and-slate-builder.completed.md`, `archive/tickets/SCEIDEDIVOVE-002-scene-ideator-output-contract-and-validation.completed.md`, `archive/tickets/SCEIDEDIVOVE-006-scene-ideation-shared-context-signals.completed.md`

## Problem

`SceneIdeaLane` and its lane constants currently live in `src/llm/scene-ideation-contract.ts`, but the lane taxonomy now participates in a shared model contract via `SceneDirectionOption` in `src/models/scene-direction.ts`. That is an ownership smell: a domain/model type depends on an `llm/` module for its enum source, which makes the layering less clean than it should be.

The code works, but the boundary is backwards. Lane taxonomy is no longer prompt-only or parser-only metadata. It is part of a cross-layer scene-direction contract and should be owned by a shared domain module, not by `llm/`.

## Assumption Reassessment (2026-03-18)

1. `src/models/scene-direction.ts` currently imports `SceneIdeaLane` from `src/llm/scene-ideation-contract.ts`, so a model contract depends on the LLM layer directly.
2. `src/llm/scene-ideation-contract.ts` currently owns two different concerns:
   - shared lane taxonomy (`SceneIdeaLane`, `SCENE_IDEA_LANES`)
   - scene-ideation execution defaults (`DEFAULT_SCENE_IDEA_COUNT`, lane orderings)
3. `src/llm/scene-ideation-slate.ts`, `src/llm/prompts/scene-ideator-prompt.ts`, `src/llm/scene-ideator.ts`, and `src/llm/schemas/scene-ideator-schema.ts` all currently import lane definitions from `src/llm/scene-ideation-contract.ts`.
4. No existing shared domain module currently owns the lane taxonomy. `src/models/scene-direction-taxonomy.ts` owns `ScenePurpose`, `ValuePolarityShift`, and `PacingMode`, but not `SceneIdeaLane`.
5. This ticket should not revisit the five-option lane-based architecture introduced by tickets 001/002/006. The architecture is already correct; only type/module ownership is wrong.

## Architecture Check

1. Moving `SceneIdeaLane` into a shared domain contract is cleaner because the taxonomy is now consumed by both model and LLM layers. Shared concepts should live below `llm/`, not above it.
2. The cleanest outcome is to separate stable domain taxonomy from stage-specific ideation defaults. Lane taxonomy and validation belong in a shared model/domain module; scene-idea counts and lane ordering heuristics can remain in the ideation contract layer.
3. No backwards-compatibility aliasing or duplicate exports should be introduced. The old `llm` ownership path should be removed, not preserved in parallel.
4. This refactor is worth doing, but it is not urgent enough to have been bundled into the bugfix. It should land as a narrow ownership cleanup with no behavioral change.

## What to Change

### 1. Introduce a shared lane-taxonomy owner

Create or extend a shared domain/model module to own:

- `SceneIdeaLane`
- `SCENE_IDEA_LANES`
- `isSceneIdeaLane(...)`

Preferred direction:

- extend `src/models/scene-direction-taxonomy.ts` if the team wants all scene-direction enums in one place, or
- create a new `src/models/scene-ideation-taxonomy.ts` if keeping ideation-lane taxonomy separate from planner-facing scene taxonomy is cleaner.

The implementation should choose one owner and remove the `llm`-layer ownership entirely.

### 2. Narrow `scene-ideation-contract.ts` to ideation-specific defaults

After moving the taxonomy, keep `src/llm/scene-ideation-contract.ts` focused on:

- `DEFAULT_SCENE_IDEA_COUNT`
- `MIN_SCENE_IDEA_COUNT`
- `MAX_SCENE_IDEA_COUNT`
- ordered lane sets for opening/continuation/default replacement behavior

It may import `SceneIdeaLane` and `SCENE_IDEA_LANES` from the new shared owner, but it should no longer define them.

### 3. Update imports across layers

Update all consumers so that:

- model/domain files import lane taxonomy from the shared owner
- llm/prompt/schema/parser files also import lane taxonomy from the shared owner
- tests import from the same final ownership path

The refactor should leave behavior unchanged.

### 4. Document the ownership boundary clearly

If the chosen file is `src/models/scene-direction-taxonomy.ts`, update comments there so the file explicitly owns all scene-direction classification enums, including ideation lanes.

If the chosen file is a new shared module, ensure the file name and comments make the ownership boundary obvious.

## Files to Touch

- `src/models/scene-direction-taxonomy.ts` (modify) or `src/models/scene-ideation-taxonomy.ts` (new)
- `src/models/scene-direction.ts` (modify)
- `src/models/index.ts` (modify, if exports need to move)
- `src/llm/scene-ideation-contract.ts` (modify)
- `src/llm/scene-ideation-slate.ts` (modify)
- `src/llm/scene-ideator.ts` (modify)
- `src/llm/schemas/scene-ideator-schema.ts` (modify)
- `src/llm/prompts/scene-ideator-prompt.ts` (modify)
- `test/unit/models/scene-direction-taxonomy.test.ts` or a new taxonomy-focused test file (modify/new)
- `test/unit/llm/scene-ideation-slate.test.ts` (modify if imports or ownership assertions change)
- `test/unit/llm/scene-ideator.test.ts` (modify if imports change)
- `test/unit/llm/prompts/scene-ideator-prompt.test.ts` (modify if imports change)

## Out of Scope

- Changing scene ideation behavior, count, slate heuristics, or prompt wording
- Client rendering or planner behavior changes
- Renaming unrelated scene-direction enums
- Any compatibility alias export that preserves the old `llm` ownership path

## Acceptance Criteria

### Tests That Must Pass

1. Shared taxonomy tests verify `SceneIdeaLane`, `SCENE_IDEA_LANES`, and `isSceneIdeaLane(...)` are exported from the new shared owner and still validate the current lane set.
2. Existing scene ideation unit tests still pass without behavior changes after the import/ownership refactor.
3. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/models/scene-direction-taxonomy.test.ts test/unit/llm/scene-ideation-slate.test.ts test/unit/llm/scene-ideator.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts`

### Invariants

1. Shared model/domain types must not depend on `src/llm/`.
2. `SceneIdeaLane` has exactly one ownership path in the repository after the refactor.
3. Scene ideation count defaults and lane-order heuristics remain owned by the ideation contract layer, not by the shared taxonomy module.

## Test Plan

### New/Modified Tests

1. `test/unit/models/scene-direction-taxonomy.test.ts` or a new shared-taxonomy test file — lock down the final lane taxonomy owner and validator behavior.
Reason: the main risk is silent ownership drift or duplicate taxonomy definitions later.
2. `test/unit/llm/scene-ideation-slate.test.ts` — confirm the slate builder still consumes the same lane set after the ownership move.
Reason: this protects the ideation-default layer from accidental lane-order or import regressions.
3. `test/unit/llm/scene-ideator.test.ts` — confirm parser validation still accepts the same lane taxonomy after the module move.
Reason: this protects the schema/parser side of the contract from ownership-only refactors.
4. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` — confirm prompt generation still renders the same lane-aware instructions.
Reason: prompt output is another consumer of the taxonomy and should stay behaviorally unchanged.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/models/scene-direction-taxonomy.test.ts test/unit/llm/scene-ideation-slate.test.ts test/unit/llm/scene-ideator.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts`
2. `npm run typecheck`
3. `npm run lint -- --no-cache`

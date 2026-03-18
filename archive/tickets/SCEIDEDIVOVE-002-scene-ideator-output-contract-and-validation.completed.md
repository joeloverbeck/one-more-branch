# SCEIDEDIVOVE-002: Expand scene ideator output contract and validation for lane-based slates

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — scene ideator model contract, schema, parser, validation
**Deps**: `tickets/SCEIDEDIVOVE-001-scene-ideation-contract-and-slate-builder.md`

## Problem

The structured scene ideator response does not include `diversityLane`, the schema is fixed at exactly 3 options, and the parser only validates `(scenePurpose, valuePolarityShift)` uniqueness. That leaves the core diversity contract unenforced.

## Assumption Reassessment (2026-03-18)

1. `src/llm/scene-ideation-contract.ts` already owns the configurable option-count constants (`DEFAULT_SCENE_IDEA_COUNT = 5`, min/max bounds) and the `SceneIdeaLane` taxonomy. This ticket should reuse that single source of truth rather than reintroducing count or lane definitions elsewhere.
2. `src/llm/scene-ideation-slate.ts` and `src/llm/scene-ideation-context-signals.ts` already implement the lane-based slate planner and continuation heuristics described by the spec. This ticket should not duplicate that planning logic in the parser, prompt, or schema layers.
3. `src/llm/prompts/scene-ideator-prompt.ts` and `prompts/scene-ideator-prompt.md` are still on the legacy 3-option contract, even though the supporting lane/slate architecture already exists. That prompt-contract drift is a real discrepancy that must be closed by the implementation sequence across tickets.
4. `src/models/scene-direction.ts` still defines both `SceneDirectionOption` and `SelectedSceneDirection` without lane metadata, so the ideator output contract and the planner handoff contract are currently conflated.
5. `src/llm/schemas/scene-ideator-schema.ts` still exports a fixed `SCENE_IDEATOR_SCHEMA` literal for exactly 3 options, and `src/llm/scene-ideator.ts` still parses against that same literal 3-option contract with diversity checks limited to `(scenePurpose, valuePolarityShift)`.
6. `test/unit/llm/scene-ideator.test.ts` and `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` still encode the legacy schema/parser behavior. `test/unit/llm/prompt-doc-alignment.test.ts` still does not include the scene ideator prompt doc, despite the doc already existing.

## Architecture Check

1. The lane-based slate architecture is materially better than the old 3-option free-form contract. It gives the system a deterministic diversity frame, centralizes count/lane ownership, and creates a cleaner place to evolve future heuristics. This ticket should reinforce that architecture, not preserve the legacy parser/schema assumptions.
2. `diversityLane` belongs in the structured ideator output. Without it, the most important diversity invariant exists only in prompt prose and cannot be audited, validated, or tested robustly.
3. `SceneDirectionOption` and `SelectedSceneDirection` should stop sharing the exact same shape. The ideator output is richer than the planner handoff. The cleaner architecture is to keep `diversityLane` on `SceneDirectionOption` and strip it intentionally when normalizing the player-confirmed `SelectedSceneDirection`.
4. Ticket `SCEIDEDIVOVE-006` already centralized continuation pressure heuristics in `src/llm/scene-ideation-context-signals.ts`, and the slate builder already consumes them. This ticket must not add any prompt-local or parser-local fallback heuristics.
5. The prompt still emits the legacy 3-option contract. That is currently real drift, not a reason to keep parser/schema code outdated. The implementation should align prompt, schema, parser, types, and docs around the shared scene-ideation contract.

## What to Change

### 1. Expand scene direction types

Update scene direction types to carry `diversityLane` on `SceneDirectionOption`.

Keep `SelectedSceneDirection` lean and planner-facing. Do not add lane metadata there. Instead, make the strip-at-handoff behavior explicit in normalization and tests so the separation is intentional, not accidental.

### 2. Parameterize the scene ideator schema

Replace the fixed exported schema with a builder that accepts the slate target count and emits:

- `diversityLane` enum
- array count contract based on requested count
- updated description text that no longer says `Exactly 3`

The builder must source count and lane metadata from `src/llm/scene-ideation-contract.ts`.

Maintain Anthropic compatibility: do not use unsupported `maxItems`/strict numeric array bounds. The exact count still needs to be enforced by parser validation and prompt instructions.

Update schema compatibility tests to cover the default exported schema plus the generated schema path consistently.

### 3. Tighten parser and diversity validation

Update parsing and validation so they enforce:

- requested option count from the shared scene-ideation contract, not literal `3`
- valid `diversityLane`
- unique lanes within the slate
- unique `(scenePurpose, valuePolarityShift)` pairs
- unique `(diversityLane, scenePurpose)` pairs

Error messages should still be specific enough to diagnose which constraint failed.

### 4. Close prompt/doc drift as part of the contract migration

Because prompt, schema, and parser must agree, this ticket also needs to update the scene ideator prompt/doc surface where the legacy `3` contract is still hard-coded:

- `src/llm/prompts/scene-ideator-prompt.ts`
- `prompts/scene-ideator-prompt.md`
- `test/unit/llm/prompts/scene-ideator-prompt.test.ts`
- `test/unit/llm/prompt-doc-alignment.test.ts`

## Files to Touch

- `src/models/scene-direction.ts` (modify)
- `src/llm/scene-ideation-contract.ts` (read/reuse; modify only if the implementation exposes a missing contract helper)
- `src/llm/schemas/scene-ideator-schema.ts` (modify)
- `src/llm/scene-ideator.ts` (modify)
- `src/llm/prompts/scene-ideator-prompt.ts` (modify)
- `src/server/utils/request-normalizers.ts` (modify if needed to make lane stripping explicit)
- `test/unit/llm/scene-ideator.test.ts` (modify)
- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` (modify)
- `test/unit/llm/prompts/scene-ideator-prompt.test.ts` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify)
- `test/unit/server/utils/normalize-scene-direction.test.ts` (modify if selected-direction normalization behavior changes)
- `prompts/scene-ideator-prompt.md` (modify)

## Out of Scope

- Client badge rendering or CSS
- Planner redesign
- Rewriting the existing slate builder or continuation signal heuristics
- Exposing `diversityLane` in the selected-direction planner payload or UI

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/scene-ideator.test.ts` verifies `parseSceneDirectionOption()` accepts and returns `diversityLane`.
2. `test/unit/llm/scene-ideator.test.ts` verifies `parseSceneIdeatorResponse()` accepts the shared default count and rejects count mismatches with an explicit count error.
3. `test/unit/llm/scene-ideator.test.ts` verifies `validateDiversity()` rejects duplicate lanes and duplicate `(diversityLane, scenePurpose)` pairs.
4. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` verifies the prompt and output-shape instructions use the shared scene-ideation count and include lane-specific output expectations.
5. `test/unit/llm/prompt-doc-alignment.test.ts` includes the scene ideator prompt/doc mapping.
6. `test/unit/server/utils/normalize-scene-direction.test.ts` verifies the selected-direction normalizer intentionally ignores/strips any ideator-only `diversityLane` field.
7. `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` verifies the scene ideator schema remains strict and Anthropic-compatible after parameterization.
8. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideator.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts test/unit/server/utils/normalize-scene-direction.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts test/unit/llm/prompt-doc-alignment.test.ts`

### Invariants

1. The parser and schema must agree on the same requested option count and required field set for every scene ideation request.
2. The prompt, prompt docs, schema, and parser must agree on the same scene ideation count and required field set.
3. Planner handoff remains behaviorally clean: one selected scene direction still feeds the planner, and ideator-only metadata is stripped deliberately.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/scene-ideator.test.ts` — add coverage for lane parsing, shared-count enforcement, and layered diversity validation.
2. `test/unit/llm/prompts/scene-ideator-prompt.test.ts` — verify the prompt uses the shared option count and lane-aware output shape.
3. `test/unit/server/utils/normalize-scene-direction.test.ts` — prove ideator-only fields are ignored at planner handoff.
4. `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` — verify the generated schema still satisfies provider constraints.
5. `test/unit/llm/prompt-doc-alignment.test.ts` — add the scene ideator prompt/doc contract.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideator.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts test/unit/server/utils/normalize-scene-direction.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts test/unit/llm/prompt-doc-alignment.test.ts`
2. `npm run typecheck`
3. `npm run lint -- --no-cache`

## Outcome

- Completed: 2026-03-18
- What changed:
  - Added `diversityLane` to `SceneDirectionOption` while keeping `SelectedSceneDirection` planner-facing and lane-free.
  - Replaced the fixed scene ideator schema literal with a shared-count schema builder backed by `scene-ideation-contract.ts`.
  - Updated parser validation to enforce shared option count, valid lanes, unique lanes, unique `(scenePurpose, valuePolarityShift)`, and unique `(diversityLane, scenePurpose)` pairs.
  - Aligned the scene ideator prompt and prompt docs with the existing lane-based slate architecture and added prompt-doc coverage.
  - Added normalization coverage proving ideator-only lane metadata is stripped at planner handoff.
- Deviations from original plan:
  - The ticket originally assumed the contract/slate/signal architecture still needed to be introduced. In reality that architecture already existed, so the implementation focused on finishing the migration and closing prompt/schema/parser drift.
  - Prompt/doc alignment work was pulled into this pass because leaving the prompt on the legacy 3-option contract would have preserved a broken cross-layer invariant.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/scene-ideator.test.ts test/unit/llm/prompts/scene-ideator-prompt.test.ts test/unit/server/utils/normalize-scene-direction.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts test/unit/llm/prompt-doc-alignment.test.ts`
  - `npm run typecheck`
  - `npm run lint -- --no-cache`

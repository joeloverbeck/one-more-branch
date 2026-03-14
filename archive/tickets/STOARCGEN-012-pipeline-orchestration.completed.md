# STOARCGEN-012: Pipeline Orchestration — Expose Canonical 3-Stage Structure Progress

**Status**: COMPLETED
**Depends on**: STOARCGEN-009, STOARCGEN-010, STOARCGEN-011
**Blocks**: STOARCGEN-013

## Reassessed State

The original assumption behind this ticket is outdated.

What is already true in the codebase:
- `src/llm/structure-generator.ts` already orchestrates the 3-stage pipeline:
  Macro Architecture -> Milestone Generation -> Structure Validation/Repair.
- The implementation already reuses `runLlmStage()` and `validateAndRepairStructure()` instead of duplicating HTTP/retry/fallback logic.
- The merged `StructureGenerationResult` already carries the macro fields, act metadata, milestones, anchor moments, and concatenated raw responses.
- Existing unit coverage in `test/unit/llm/structure-generator.test.ts` already exercises successful orchestration, repair, retry, and parse-failure cases.

What is still missing:
- Story creation progress still reports the whole structure pipeline as one coarse `STRUCTURING_STORY` stage from `src/engine/story-service.ts`.
- The engine/UI progress model does not expose the real internal structure-generation stages, so the frontend cannot distinguish Call 1 vs Call 2 vs Call 3.
- This ticket references stale file paths and generated files as direct edit targets.

## Summary

Do not rewrite the structure pipeline.

Instead, finish the architectural integration by making the existing 3-stage structure pipeline visible as canonical generation stages across engine progress reporting, shared stage metadata, and tests.

## Corrected Scope

### Primary goal

Replace the coarse `STRUCTURING_STORY` progress event with the real pipeline stages:
- `DESIGNING_ARCHITECTURE`
- `GENERATING_MILESTONES`
- `VALIDATING_STRUCTURE`

These become the canonical story-structure generation stages for new-story preparation. No backwards-compatibility aliasing should be introduced for `STRUCTURING_STORY`; update call sites, metadata, and tests to the new stage IDs directly.

### Architectural constraints

- Keep `generateStoryStructure()` as the orchestration boundary. Do not push internal pipeline knowledge back into downstream consumers beyond progress reporting.
- Emit structure-stage progress as close to the structure pipeline as possible. Avoid keeping stage sequencing hardcoded in `story-service.ts` when the true sequence belongs to `structure-generator.ts`.
- Preserve reuse of `runLlmStage()` and `validateAndRepairStructure()`. Do not fork parallel retry/logging/fallback code.
- Preserve the existing merged `StructureGenerationResult` contract. This ticket is about observability and orchestration clarity, not schema churn.
- Do not edit generated files manually. Update canonical sources, then regenerate artifacts.

## Files to Touch

- `src/llm/structure-generator.ts` — thread generation-stage callbacks into the real 3-stage pipeline
- `src/engine/story-service.ts` — stop emitting the obsolete coarse structuring stage and pass the callback through
- `src/config/generation-stage-metadata.json` — replace `STRUCTURING_STORY` metadata with canonical 3-stage metadata
- `src/engine/generated-generation-stages.ts` — regenerated from metadata
- `public/js/src/00-stage-metadata.js` — regenerated from metadata
- `public/js/app.js` — regenerated client bundle

Corrected path note:
- The progress service lives at `src/server/services/generation-progress.ts`, not `src/server/services/generation-progress-service.ts`.

## Explicitly Out of Scope

- Rewriting `generateStoryStructure()` from scratch
- Prompt content changes from STOARCGEN-009 / STOARCGEN-010
- Validator semantics from STOARCGEN-011
- Rewrite pipeline work from STOARCGEN-013
- Story-structure data model changes unrelated to progress-stage visibility

## Acceptance Criteria

### Functional

- New-story structure generation no longer emits `STRUCTURING_STORY`.
- The structure pipeline emits `DESIGNING_ARCHITECTURE`, `GENERATING_MILESTONES`, and `VALIDATING_STRUCTURE` in order.
- Stage emission occurs from the real pipeline boundary rather than duplicating the sequence in `story-service.ts`.
- Prompt logging, retry behavior, fallback behavior, repair behavior, and `StructureGenerationResult` output remain unchanged.
- Errors in any structure stage still propagate without swallowing.

### Tests

- Update unit coverage for `test/unit/engine/story-service.test.ts` to assert canonical stage propagation.
- Add or strengthen unit coverage in `test/unit/llm/structure-generator.test.ts` for per-stage callback emission across the 3-stage pipeline.
- Update stage metadata / generated-stage expectations in:
  - `test/unit/engine/types.test.ts`
  - `test/unit/server/public/app.test.ts`
- Run the relevant unit suites covering structure generation, story-service progress propagation, generation stage metadata, and generated client script.
- `npm run typecheck` passes.
- `npm run lint` passes.

## Why This Is the Better Architecture

The current 3-call structure pipeline is already the better architecture than the original one-shot generator because it separates macro design, milestone invention, and validation/repair while keeping a stable output contract.

The remaining architectural flaw is observability drift:
- the implementation is 3-stage,
- the progress model still pretends it is 1-stage.

Keeping the coarse stage would make the system less truthful, harder to debug, and harder to extend if structure generation gains more internal checkpoints later. Canonical stage IDs aligned with the actual orchestration are cleaner, more robust, and more extensible.

## Outcome

- Completion date: 2026-03-14
- What actually changed:
  - `generateStoryStructure()` now emits canonical progress events for `DESIGNING_ARCHITECTURE`, `GENERATING_MILESTONES`, and `VALIDATING_STRUCTURE`.
  - `story-service.ts` no longer emits the obsolete coarse `STRUCTURING_STORY` event and instead passes the generation-stage callback into the structure pipeline.
  - Shared stage metadata now defines the three canonical structure stages, and generated artifacts were regenerated from `src/config/generation-stage-metadata.json`.
  - Unit coverage was updated for story-service stage propagation, shared stage enumeration, client stage metadata, and a focused structure-generator progress-stage contract.
- Deviations from the original plan:
  - The planned pipeline rewrite was not performed because the 3-call orchestration already existed in `src/llm/structure-generator.ts`.
  - Instead of adding a large new integration suite, verification was strengthened with focused unit tests around the actual remaining architectural gap: progress-stage visibility.
- Verification:
  - `npm run test:unit -- --runInBand --forceExit --runTestsByPath test/unit/llm/structure-generator-progress.test.ts test/unit/engine/story-service.test.ts test/unit/engine/types.test.ts test/unit/server/services/generation-progress.test.ts test/unit/server/public/app.test.ts`
  - `npm run typecheck`
  - `npm run lint`

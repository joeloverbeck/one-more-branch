# STOARCGEN-013: Tiered Rewrite Pipeline

**Status**: REJECTED
**Depends on**: STOARCGEN-012, STOARCGEN-016, STOARCGEN-017, STOARCGEN-018
**Blocks**: None

## Summary

Reject the original three-tier rewrite proposal as written.

After reassessing the current codebase, the proposed implementation is not the right architectural move. The repository already has a staged initial-generation pipeline, shared prompt-context builders, shared normalization seams, and a shared structured stage runner. The missing piece is not "tier detection inside `deviation-handler.ts`"; it is a future rewrite refactor that should plug into those existing seams without inventing a second classification model.

## Reassessed Assumptions

- `src/llm/structure-generator.ts` already implements the staged structure pipeline:
  - macro architecture
  - milestone generation
  - validation / repair
- `src/llm/llm-stage-runner.ts` is already the canonical structured-stage transport seam.
- `src/llm/prompts/sections/structure-generation/shared-context.ts` already exists and is the right reuse point for future rewrite prompts.
- `src/llm/structure-validator.ts` already owns validation / repair for staged structure output.
- `src/engine/structure-rewriter.ts` is the actual lagging seam: it still uses a single rewrite prompt and a single structured call, then merges preserved milestones back into the regenerated structure.
- `src/engine/deviation-handler.ts` does not currently have enough information to classify the proposed "milestone-tier vs act-tier" split.
- The analyst output model does not expose an act-frame failure signal. It exposes:
  - milestone invalidation via `invalidatedMilestoneIds`
  - separate spine invalidation via `spineDeviationDetected` / `spineInvalidatedElement`
- Spine rewrite orchestration already lives in:
  - `src/engine/post-generation-processor.ts`
  - `src/engine/spine-deviation-processing.ts`
  That seam should remain the owner of spine-first handling.
- There is no `src/llm/schemas/structure-rewrite-schema.ts` in the current codebase. Reuse of existing macro/milestone schemas or validator output would be the natural direction if rewrite is later restaged.

## Why The Original Proposal Is Rejected

The original ticket mixed one valid architectural concern with one invalid implementation strategy.

### Valid concern

Rewrite is behind initial generation architecturally:
- initial generation is staged
- rewrite is still monolithic

That asymmetry is real.

### Invalid strategy

The proposed fix adds a new three-tier decision model centered in `deviation-handler.ts`:
- Tier 1 milestone-level deviation
- Tier 2 act-level deviation
- Tier 3 spine-level deviation

That is not a clean extension of the current system because:
- act-level deviation is not a signal the analyst currently produces
- spine-level handling already exists elsewhere
- adding tier logic in the handler would duplicate decision-making across post-processing, spine handling, and rewrite execution
- the ticket assumes rewrite-specific schemas and prompts that do not match the current staged-generation reuse seams

In short: the architecture should become more unified, not more branched.

## Correct Architectural Direction

If rewrite is revisited later, the clean design is:

1. Keep spine deviation ownership where it already lives.
2. Make rewrite scope an execution concern, not a new analyst taxonomy.
3. Derive rewrite scope from existing signals:
   - `invalidatedMilestoneIds`
   - whether a spine rewrite already occurred
4. Reuse existing staged seams:
   - macro architecture generation or a constrained macro-rewrite variant
   - milestone generation or a constrained milestone-rewrite variant
   - `validateAndRepairStructure(...)`
   - `runLlmStage(...)`
5. Avoid introducing alias concepts or backward-compatibility layers.

That future ticket would likely be framed around "scope-driven staged rewrite" rather than "tiered deviation detection."

## Scope Correction

This ticket does **not** proceed to code implementation.

Instead, this ticket's outcome is:
- document that the current proposal is based on outdated assumptions
- reject the handler-centric three-tier design
- preserve the codebase as-is until a better-scoped follow-up is written against the current architecture

## Verification

The current rewrite path is functioning under existing tests.

Verified passing:
- `npm run test:unit -- --runTestsByPath test/unit/engine/structure-rewriter.test.ts test/unit/engine/structure-rewriter-model-selection.test.ts test/unit/engine/deviation-handler.test.ts test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
- `npm run test:e2e -- --runTestsByPath test/e2e/engine/structure-rewriting-journey.test.ts`

## Outcome

- Date: 2026-03-14
- Actual change: reassessed the ticket against the current codebase and rejected the original implementation plan without changing production code
- Deviation from original plan: the original ticket assumed rewrite should gain new tier-detection logic in `deviation-handler.ts`; reassessment showed that generation is already staged and the missing future work, if any, should be a scope-driven staged rewrite refactor instead
- Verification: current rewrite-related unit and E2E suites pass on the existing implementation

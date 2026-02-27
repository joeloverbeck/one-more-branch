# NARARCAUD-05: Causal Linkage Between Beats

**Status**: COMPLETED
**Wave**: 1 (Quick Wins)
**Effort**: S
**Dependencies**: None
**Spec reference**: E1 — Causal Chain gaps

## Summary

Introduce explicit causal continuity for every beat so structure generation and rewrite flows encode "because of that" progression instead of episodic sequencing.

## Reassessed Assumptions (Corrected)

- `src/engine/structure-types.ts` is now a type re-export and does **not** define a duplicate `StructureGenerationResult` shape. The source of truth is `src/models/structure-generation.ts`.
- Beat enrichment has already landed for `setpieceSourceIndex`, `uniqueScenarioHook`, and `approachVectors`; this ticket must integrate with that current shape, not the older minimal beat shape.
- `structure-rewriter` currently parses regeneration output with a reduced beat projection and drops enriched beat metadata. This is architecturally inconsistent with `structure-generator` and must be fixed as part of this ticket to avoid losing `causalLink` and existing enrichment fields on rewrite.
- Prompt docs in `prompts/` are expected to match prompt source files in `src/llm/prompts/` in the same pass.

## Scope Decision (Architecture)

- `causalLink` will be **required and non-null** on every beat (`string`), including first beats.
- For first beats, the value describes the initiating cause (inciting condition / starting situation) rather than a prior beat.
- Rationale: required non-null fields remove nullable branching, simplify invariants, and keep architecture consistent with "no backward compatibility" and strict schema intent.

## Files to Touch

- `src/models/story-arc.ts` — add `readonly causalLink: string` to `StoryBeat`
- `src/models/structure-generation.ts` — add `causalLink` to `GeneratedBeat`
- `src/llm/schemas/structure-schema.ts` — require beat `causalLink` as string
- `src/llm/prompts/structure-prompt.ts` — add strict causal-chain instruction and output-shape field
- `src/llm/prompts/structure-rewrite-prompt.ts` — add strict causal-chain instruction and output-shape field
- `src/llm/structure-generator.ts` — parse and validate `causalLink` into generated beats
- `src/engine/structure-factory.ts` — map `causalLink` into `StoryBeat`
- `src/llm/structure-rewrite-types.ts` — include `causalLink` in completed/planned beat context
- `src/engine/structure-rewrite-support.ts` — thread `causalLink` into rewrite context beat snapshots
- `src/engine/structure-rewriter.ts` — preserve full enriched beat shape (including `causalLink`) from regeneration parse through merge
- `src/persistence/story-serializer.ts` and `src/persistence/story-serializer-types.ts` — serialize/deserialize `causalLink`
- `prompts/structure-prompt.md` — update doc
- `prompts/structure-rewrite-prompt.md` — update doc

## Out of Scope

- Retrospective coherence check (NARARCAUD-25)
- Analyst evaluation of causal chain

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: `createStoryStructure` maps `causalLink`
- [x] Unit test: structure schema requires beat `causalLink: string`
- [x] Unit test: `buildStructurePrompt` includes causal-linkage requirement and output shape field
- [x] Unit test: `buildStructureRewritePrompt` includes causal-linkage requirement and output shape field
- [x] Unit/integration test: structure rewrite path preserves enriched beat fields and `causalLink` for regenerated beats (no metadata loss)
- [x] Unit test: story serialization round-trip preserves beat `causalLink`
- [x] Invariant: All existing tests pass

## Outcome

- **Completion date**: 2026-02-27
- **What changed**:
  - Added required beat-level `causalLink` across structure domain, schema, generator parsing, factory mapping, rewrite context, rewrite merge path, persistence serialization, and prompt docs.
  - Added causal-chain instructions and output shape requirements in both structure generation and structure rewrite prompts.
  - Fixed structural architectural drift in rewrite parsing: regenerated beats now retain enriched metadata (`causalLink`, `escalationType`, `uniqueScenarioHook`, `approachVectors`, `setpieceSourceIndex`) instead of being reduced to minimal fields.
  - Updated unit/integration/e2e fixtures and tests to enforce the new invariant.
- **Deviations from original plan**:
  - The ticket originally targeted `src/engine/structure-types.ts`; implementation correctly used `src/models/structure-generation.ts` as the source-of-truth shape.
  - Scope expanded to include rewrite parser + integration/e2e fixtures so the causal contract remains consistent across generation and rewrite flows.
- **Verification**:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit`
  - `npm test`

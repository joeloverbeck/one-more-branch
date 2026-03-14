# STOARCGEN-013: Tiered Rewrite Pipeline

**Status**: TODO
**Depends on**: STOARCGEN-012 (pipeline orchestration)
**Blocks**: None

## Summary

Replace the current monolithic structure rewrite with a tiered rewrite system that matches the staged generation pipeline. The tier determines which calls to re-run, preserving already-completed work.

## Files to Touch

- `src/engine/structure-rewriter.ts` — Implement tiered rewrite logic
- `src/engine/deviation-handler.ts` — Detect deviation tier (milestone-level vs act-level)
- `src/llm/prompts/structure-rewrite-prompt.ts` — Split into macro-rewrite + milestone-rewrite variants
- `src/llm/schemas/structure-rewrite-schema.ts` — Add macro-rewrite schema variant (if needed; may reuse existing)
- `src/engine/structure-rewrite-support.ts` — Update support functions for tiered rewrites

## Detailed Changes

### Deviation tiers

**Tier 1 — Milestone-level deviation** (spine + act frame intact):
- Skip Call 1 (macro architecture preserved)
- Run Call 2 (regenerate milestones for affected + downstream acts only)
- Run Call 3 (validate)
- Completed acts and their milestones are preserved

**Tier 2 — Act-level deviation** (spine intact, act frame broken):
- Run Call 1 (preserve completed acts, regenerate remaining act frames)
- Run Call 2 (generate milestones for regenerated acts)
- Run Call 3 (validate)

**Tier 3 — Spine-level deviation** (existing flow):
- Spine rewrite first (existing `spine-rewriter.ts` flow, unchanged)
- Then Tier 2 rewrite (full 3-call pipeline for all acts)

### `deviation-handler.ts` changes

Add tier detection logic:
- If analyst detects beat/milestone-level deviation only → Tier 1
- If analyst detects act-level structural failure → Tier 2
- If analyst detects spine-level deviation → Tier 3 (existing flow)

### `structure-rewriter.ts` changes

Refactor the rewrite entry point to accept a tier:

```typescript
async function rewriteStructure(
  tier: 'milestone' | 'act' | 'spine',
  context: StructureRewriteContext,
  apiKey: string,
  options?: GenerationOptions
): Promise<StructureGenerationResult>
```

Implementation note:
- Tiered rewrite work must preserve the same canonical structure normalization/defaulting behavior as initial generation.
- Do not duplicate fallback/default logic independently in rewrite support, rewrite merging, and runtime structure creation.
- Reuse the shared normalization/migration seam tracked in `STOARCGEN-016` if it exists by the time this ticket is implemented.

### Rewrite prompts split

- **Macro rewrite prompt**: Receives completed acts (preserved), regenerates remaining act frames. Used in Tier 2 only.
- **Milestone rewrite prompt**: Receives completed milestones (preserved) + act frames, generates new milestones. Used in Tier 1 and Tier 2.

These are variants of the generation prompts (STOARCGEN-009, STOARCGEN-010) with additional context about what is preserved vs. regenerated.

## Out of Scope

- Spine rewrite logic (already exists, unchanged)
- Analyst prompt changes (STOARCGEN-014)
- UI changes (STOARCGEN-015)
- New progress stages for rewrite tiers (optional enhancement, not required)

## Acceptance Criteria

### Tests that must pass
- New test: `test/unit/engine/tiered-rewrite.test.ts` — Tier 1 preserves macro architecture, only regenerates milestones
- New test: `test/unit/engine/tiered-rewrite.test.ts` — Tier 2 preserves completed acts, regenerates remaining
- New test: `test/unit/engine/tiered-rewrite.test.ts` — Tier 3 triggers spine rewrite then Tier 2
- Updated test: `test/unit/engine/structure-rewriter.test.ts` — Existing rewrite tests pass (updated for tier interface)
- Updated test: `test/e2e/engine/structure-rewriting-journey.test.ts` — E2E rewrite journey passes
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Completed acts (with concluded milestones) are NEVER regenerated in Tier 1
- Completed acts are NEVER regenerated in Tier 2 (only act frames for remaining acts)
- Spine rewrite flow is unchanged for Tier 3
- Structure versioning still works (new version created on each rewrite)
- `invalidatedMilestoneIds` correctly identifies which milestones to regenerate
- Rewrite validation (Call 3) runs after every tier's regeneration

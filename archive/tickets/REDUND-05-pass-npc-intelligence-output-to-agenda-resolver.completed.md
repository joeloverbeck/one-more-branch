# REDUND-05: Pass NPC Intelligence Output to Agenda Resolver

**Status**: COMPLETED
**Priority**: Medium
**Effort**: M
**Dependencies**: None
**Category**: LLM token redundancy

## Summary

The Agenda Resolver still receives full scene text and does its own synthesis for agenda/relationship changes. Part of the NPC Intelligence output is already forwarded (relationship shifts and coherence issues), but knowledge asymmetry signals are not. This ticket now focuses on closing that remaining gap so the resolver can use richer pre-diagnosed signals with minimal extra architecture surface.

## Reassessment (2026-03-07)

### Confirmed in current codebase

1. `relationshipShiftsDetected` is already passed through end-to-end:
   - `post-generation-processor.ts` forwards `analystResult?.relationshipShiftsDetected`
   - `npc-agenda-pipeline.ts` exposes and forwards `analystRelationshipShifts`
   - `agenda-resolver-prompt.ts` renders `ANALYST RELATIONSHIP SHIFT SIGNALS`
   - Existing prompt and pipeline tests already cover this path
2. `analystNpcCoherenceIssues` is already forwarded and used in the resolver prompt.
3. Resolver currently consumes both `sceneSummary` and full `narrative`.

### Discrepancies from original ticket assumptions

1. Original assumption "add relationship shifts to resolver context" is outdated; this is already implemented.
2. `src/llm/prompts/agenda-resolver-prompt-builder.ts` does not exist; active prompt source is `src/llm/prompts/agenda-resolver-prompt.ts`.
3. No `analyst-evaluation.ts` changes are required to expose NPC Intelligence fields; `AnalystResult` already includes `knowledgeAsymmetryDetected`.
4. "Skip narrative re-analysis" is only partially achievable without changing stage boundaries; resolver still needs narrative context for robust agenda updates.

## Problem

Current pipeline:
1. NPC Intelligence analyzes narrative -> produces `relationshipShiftsDetected`, `knowledgeAsymmetryDetected`, `dramaticIronyOpportunities`
2. Agenda Resolver independently re-analyzes the same narrative -> produces `updatedAgendas`, `updatedRelationships`

The Resolver must re-derive what Intelligence already identified. This wastes ~30% of the Resolver's context tokens on narrative re-analysis.

## Updated Scope

### In Scope

1. Add `knowledgeAsymmetryDetected` pass-through to agenda resolver context.
2. Add a dedicated prompt section so resolver can use knowledge asymmetry as first-class guidance for agenda/relationship updates.
3. Keep existing relationship-shift and coherence forwarding intact.
4. Add/strengthen tests for prompt construction and pipeline forwarding of the new field.

### Out of Scope

1. Removing full narrative from resolver input in this ticket.
2. Merging NPC Intelligence and Agenda Resolver stages.
3. Redesigning NPC Intelligence response schema.
4. Introducing compatibility aliases (use canonical field names only).

## Files to Touch

- `src/llm/prompts/agenda-resolver-prompt.ts` — add knowledge asymmetry field + prompt section
- `src/engine/npc-agenda-pipeline.ts` — extend resolver context pass-through
- `src/engine/post-generation-processor.ts` — forward analyst `knowledgeAsymmetryDetected`
- `prompts/agenda-resolver-prompt.md` — update prompt contract docs
- `test/unit/llm/prompts/agenda-resolver-prompt.test.ts` — prompt-level coverage
- `test/integration/engine/npc-agenda-pipeline.test.ts` — context forwarding coverage

## Architecture Decision

Pass additional analyst signal (`knowledgeAsymmetryDetected`) into the resolver, but keep a two-layer reasoning model:

1. Analyst provides compressed diagnostics.
2. Resolver remains responsible for final agenda/relationship mutation decisions using diagnostics + scene context.

This is more robust and extensible than collapsing both stages because:

- It preserves single responsibility per stage.
- It allows future analyst signals to be added without reworking resolver schema.
- It avoids brittle over-reliance on one summarization channel by keeping raw narrative available.

## Risks

- Prompt token growth from adding another guidance section.
- Mitigation: include knowledge asymmetry section only when non-empty and keep formatting concise.

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Agenda Resolver prompt includes Intelligence-diagnosed knowledge asymmetry signals
- [x] Pipeline passes `knowledgeAsymmetryDetected` from analyst to resolver context
- [x] Existing relationship shift + coherence behavior remains unchanged
- [x] Relevant tests pass (unit/integration for prompt + pipeline)

## Outcome

- Completion date: 2026-03-07
- Actual changes:
  - Added `analystKnowledgeAsymmetryDetected` to resolver context wiring (`post-generation-processor` -> `npc-agenda-pipeline` -> resolver prompt context).
  - Added `ANALYST KNOWLEDGE ASYMMETRY SIGNALS` prompt section in `agenda-resolver-prompt.ts` (only emitted when data exists).
  - Added/updated tests for prompt rendering and pipeline forwarding.
  - Updated prompt documentation in `prompts/agenda-resolver-prompt.md` and `prompts/npc-intelligence-prompt.md`.
- Deviations from original plan:
  - Did not re-implement relationship shift forwarding because it already existed.
  - Did not remove resolver narrative input; kept current two-stage architecture for robustness.
- Verification:
  - `npm run typecheck`
  - `npm run test:unit -- --coverage=false test/unit/llm/prompts/agenda-resolver-prompt.test.ts` (script also ran full unit suite)
  - `npm run test:integration -- --coverage=false test/integration/engine/npc-agenda-pipeline.test.ts` (script also ran full integration suite)
  - `npm run lint`
  - `npm test`

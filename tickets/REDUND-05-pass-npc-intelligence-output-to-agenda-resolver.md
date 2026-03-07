# REDUND-05: Pass NPC Intelligence Output to Agenda Resolver

**Priority**: Medium
**Effort**: M
**Dependencies**: None
**Category**: LLM token redundancy

## Summary

The Agenda Resolver currently re-analyzes the full narrative independently to determine NPC agenda and relationship updates. The NPC Intelligence stage already diagnosed relationship shifts, coherence issues, and knowledge asymmetries from the same narrative. Pass Intelligence output to the Resolver so it can skip re-analysis and focus on translating diagnoses into concrete updates.

## Problem

Current pipeline:
1. NPC Intelligence analyzes narrative -> produces `relationshipShiftsDetected`, `knowledgeAsymmetryDetected`, `dramaticIronyOpportunities`
2. Agenda Resolver independently re-analyzes the same narrative -> produces `updatedAgendas`, `updatedRelationships`

The Resolver must re-derive what Intelligence already identified. This wastes ~30% of the Resolver's context tokens on narrative re-analysis.

## Proposed Fix

1. Add NPC Intelligence output fields to `AgendaResolverPromptContext`:
   - `relationshipShiftsDetected` (from NpcIntelligenceResult)
   - `knowledgeAsymmetryDetected` (from NpcIntelligenceResult)
2. Update the agenda resolver prompt to reference these diagnosed shifts instead of analyzing narrative from scratch
3. Consider whether the full narrative text can be replaced with `sceneSummary` in the Resolver context (since Intelligence already extracted the relevant NPC events)
4. Update `npc-agenda-pipeline.ts` to pass Intelligence results through

## Files to Touch

- `src/llm/agenda-resolver-generation.ts` — accept Intelligence output in context
- `src/llm/prompts/agenda-resolver-prompt-builder.ts` — include diagnosed shifts in prompt
- `src/engine/npc-agenda-pipeline.ts` — pass Intelligence results to Resolver
- `src/engine/analyst-evaluation.ts` — ensure Intelligence results are available before Resolver runs
- `test/` — update mocks and tests

## Out of Scope

- Merging NPC Intelligence and Agenda Resolver into a single stage
- Changing NPC Intelligence output format
- Removing narrative from Resolver context entirely (may still be needed for agenda reasoning)

## Risks

- Resolver may produce lower quality updates if it can't reason from raw narrative
- Should A/B test: run a few stories with and without this change to compare agenda quality
- Mitigation: keep narrative in context but add "pre-diagnosed shifts" section so Resolver can prioritize

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Agenda Resolver prompt includes Intelligence-diagnosed relationship shifts
- [ ] Pipeline passes Intelligence output through to Resolver stage
- [ ] All existing tests pass
- [ ] Manual verification: generated NPC agenda updates remain coherent with story events

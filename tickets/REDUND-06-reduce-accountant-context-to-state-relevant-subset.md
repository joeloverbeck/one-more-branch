# REDUND-06: Reduce Accountant Context to State-Relevant Subset

**Priority**: Medium
**Effort**: M
**Dependencies**: None
**Category**: LLM token redundancy

## Summary

The State Accountant currently receives the full story context (~150KB) — identical to what the Planner receives. The Accountant's job is to generate state mutation intents from the Planner's reduced plan. It likely doesn't need the full story structure, world facts, or spine to do this. Reduce its context to state-relevant information only.

## Problem

The Accountant receives via `PagePlanContext`:
- Full story structure (acts, beats, pacing) — likely not needed for state mutations
- Full decomposed world facts — likely not needed unless location changes
- Full spine — not needed for state mutations
- Tone keywords — not needed for state mutations
- Full decomposed characters — may be partially needed for character state changes

The Accountant only needs:
- The Planner's reduced plan (scene intent, continuity anchors)
- Current active state (to know what can be mutated)
- Character names and key traits (for character state changes)
- Current inventory/health (to know what exists)

## Proposed Fix

1. Create a `StateAccountantContext` type that is a subset of `PagePlanContext`
2. Include only: reduced plan, active state, inventory, health, character state, character names, current location
3. Update `accountant-generation.ts` to accept the reduced context
4. Update `accountant-prompt-builder.ts` to build from reduced context
5. Verify generated state intents remain equivalent quality

## Files to Touch

- `src/llm/accountant-generation.ts` — accept reduced context type
- `src/llm/prompts/accountant-prompt-builder.ts` — build from reduced context
- `src/engine/page-service.ts` — construct reduced context for accountant
- `test/` — update mocks and tests

## Risks

- Accountant may need more context than expected for edge cases (e.g., world-fact-driven state changes)
- Should A/B test: compare state intent quality with full vs. reduced context
- Mitigation: start with conservative reduction (keep characters, drop structure/spine/world), expand later

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Accountant receives reduced context (no full structure, spine, or world facts)
- [ ] Generated state intents remain coherent with planner intent
- [ ] Token usage for Accountant stage reduced by ~30-40%
- [ ] All existing tests pass

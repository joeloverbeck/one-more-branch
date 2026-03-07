# REDUND-06: Reduce Accountant Context to State-Relevant Subset

**Priority**: Medium
**Effort**: M
**Dependencies**: None
**Category**: LLM token redundancy

## Summary

The State Accountant currently receives the Planner's full continuation context via `buildPlannerContinuationContextSection()`. This monolithic builder includes many planner-specific sections that are irrelevant to state mutation planning. Create a dedicated accountant context builder that includes only state-relevant sections.

## Problem

The accountant reuses `buildPlannerContinuationContextSection()` from `src/llm/prompts/sections/planner/continuation-context.ts`. This function includes sections the accountant does not need:

**Planner-specific sections (not needed for state mutations):**
- **Dramatic Irony Opportunities** — analyst output about character beliefs/secrets/false beliefs; irrelevant to state mutation intents
- **Escalation Directive** — beat role instructions (escalation, turning point, reflection, midpoint directives); guides scene planning, not state changes
- **Pacing Briefing** — analyst pacing nudge/directive and momentum trajectory warnings; irrelevant to state intent generation
- **Thematic Trajectory Warning** — warns about consecutive thematic valence trends; planner concern only
- **Narrative Focus Warning** — warns about broadening vs deepening trends; planner concern only
- **Premise Promise Warning** — late-act unfulfilled premise promises; planner concern only
- **Value Spectrum Guidance** (McKee) — moral argument and value spectrum tracking; planner concern only
- **Grandparent narrative** — full text of scene-before-last for style continuity; not needed for state mutations
- **Tone drift warning** — analyst tone drift correction; planner concern only

**Duplicate sections (already built separately in `state-accountant-prompt.ts`):**
- **Thread Aging** — built at line 107-109 of `state-accountant-prompt.ts`, also included inside `buildPlannerContinuationContextSection()` at line 675
- **Tracked Promises** — built at lines 111-116 of `state-accountant-prompt.ts`, also included inside `buildPlannerContinuationContextSection()` at line 677-679
- **Payoff Feedback** — built at lines 118-125 of `state-accountant-prompt.ts`, also included inside `buildPlannerContinuationContextSection()` at line 681-683

**Sections the accountant DOES need (must be retained):**
- World facts (state mutations must validate against world entities)
- Decomposed characters (needed for character state changes)
- Story structure + accumulated structure state (tells accountant which beat/act we're in, affecting state scope)
- Spine (referenced in accountant rules: "consider how state changes serve the Need vs Want conflict")
- Tone/toneFeel/toneAvoid (already in system prompt)
- All active state sections (location, threats, constraints, threads)
- Inventory, health, character state, canon
- NPC agendas and relationships
- Previous narrative and player's choice (context for what state changed)
- Protagonist affect (emotional context for state decisions)
- Earlier scene summaries (narrative context)
- Pending consequences (state-relevant: tracks delayed consequences with trigger conditions)

## Proposed Fix

1. **Create `buildAccountantContinuationContextSection()`** in `src/llm/prompts/sections/planner/continuation-context.ts`:
   - Copy from `buildPlannerContinuationContextSection()` but remove the planner-specific sections listed above
   - Remove: `buildPacingBriefingSection`, `buildThematicTrajectoryWarningSection`, `buildNarrativeFocusWarningSection`, `buildEscalationDirective`, `buildPremisePromiseWarningSection`, `buildValueSpectrumGuidanceSection`, `buildDramaticIronyOpportunitiesSection`, grandparent narrative, tone drift warning
   - Remove: `buildThreadAgingSection`, `buildTrackedPromisesSection`, `buildPayoffFeedbackSection` (these are already built separately in the accountant prompt)

2. **Update `src/llm/prompts/state-accountant-prompt.ts`**:
   - Import and use `buildAccountantContinuationContextSection()` instead of `buildPlannerContinuationContextSection()`
   - Keep the existing standalone thread aging, tracked promises, and payoff feedback sections (they use accountant-specific options like `includePromiseIds: false`)

3. **Export the new function** from `src/llm/prompts/sections/planner/index.ts`

## Files to Touch

- `src/llm/prompts/sections/planner/continuation-context.ts` — add `buildAccountantContinuationContextSection()`
- `src/llm/prompts/sections/planner/index.ts` — export new function
- `src/llm/prompts/state-accountant-prompt.ts` — use new context builder
- `test/` — update any tests that mock or assert on accountant prompt content

## Risks

- **Low risk**: The removed sections are clearly planner-specific (planning directives, trajectory warnings, style continuity text) and have no bearing on state mutation intent generation
- **Mitigation**: The accountant retains all state-relevant context (active state, inventory, health, characters, world facts, structure, spine, canon, NPC state, pending consequences)
- **Verification**: Compare accountant prompt token counts before and after; verify state intent quality is unchanged

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Accountant continuation prompt no longer includes: dramatic irony, escalation directive, pacing briefing, thematic trajectory, narrative focus, premise promise warning, value spectrum, grandparent narrative, tone drift warning
- [ ] Accountant continuation prompt no longer duplicates thread aging, tracked promises, or payoff feedback sections
- [ ] All existing tests pass
- [ ] Token usage for Accountant continuation stage reduced (estimated ~20-30% reduction)

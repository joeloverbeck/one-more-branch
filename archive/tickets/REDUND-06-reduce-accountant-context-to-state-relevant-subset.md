# REDUND-06: Reduce Accountant Context to State-Relevant Subset

**Status**: COMPLETED

**Priority**: Medium
**Effort**: M
**Dependencies**: None
**Category**: LLM token redundancy

## Summary

The State Accountant currently receives the Planner's full continuation context via `buildPlannerContinuationContextSection()`. This monolithic builder includes planner-only directives plus duplicated sections that the accountant appends again. Introduce a dedicated accountant continuation context path that shares a common base renderer but excludes planner-only sections.

## Problem

The accountant reuses `buildPlannerContinuationContextSection()` from `src/llm/prompts/sections/planner/continuation-context.ts`. This function includes sections the accountant does not need and some context duplicated elsewhere in `state-accountant-prompt.ts`.

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
- **Thread Aging** — appended by accountant prompt and also emitted inside planner continuation context
- **Tracked Promises** — appended by accountant prompt (`includePromiseIds: false`) and also emitted inside planner continuation context
- **Payoff Feedback** — appended by accountant prompt (`includePromiseIds: false`) and also emitted inside planner continuation context
- **Tone block duplication** — continuation context emits `TONE/GENRE` while accountant system prompt already contains tone directive

**Sections the accountant DOES need (must be retained):**
- World facts (state mutations must validate against world entities)
- Decomposed characters (needed for character state changes)
- Story structure + accumulated structure state (tells accountant which beat/act we're in, affecting state scope)
- Spine (referenced in accountant rules: "consider how state changes serve the Need vs Want conflict")
- Tone/toneFeel/toneAvoid via accountant system prompt (continuation context copy is redundant)
- All active state sections (location, threats, constraints, threads)
- Inventory, health, character state, canon
- NPC agendas and relationships
- Previous narrative and player's choice (context for what state changed)
- Protagonist affect (emotional context for state decisions)
- Earlier scene summaries (narrative context)
- Pending consequences (state-relevant: tracks delayed consequences with trigger conditions)

## Proposed Fix

1. **Refactor continuation context rendering in `src/llm/prompts/sections/planner/continuation-context.ts`**:
   - Extract shared continuation-context composition into a private base helper (single source of truth for shared sections)
   - Keep `buildPlannerContinuationContextSection()` as planner-focused wrapper
   - Add `buildAccountantContinuationContextSection()` as accountant-focused wrapper
   - In accountant wrapper, exclude planner-only sections: `buildPacingBriefingSection`, `buildThematicTrajectoryWarningSection`, `buildNarrativeFocusWarningSection`, `buildEscalationDirective`, `buildPremisePromiseWarningSection`, `buildValueSpectrumGuidanceSection`, `buildDramaticIronyOpportunitiesSection`, grandparent narrative, tone drift warning
   - In accountant wrapper, exclude duplicate sections already appended by accountant prompt: `buildThreadAgingSection`, `buildTrackedPromisesSection`, `buildPayoffFeedbackSection`, and context-level `TONE/GENRE`

2. **Update `src/llm/prompts/state-accountant-prompt.ts`**:
   - Import and use `buildAccountantContinuationContextSection()` instead of `buildPlannerContinuationContextSection()`
   - Keep the existing standalone thread aging, tracked promises, and payoff feedback sections (they use accountant-specific options such as `includePromiseIds: false`)

3. **Export the new function** from `src/llm/prompts/sections/planner/index.ts`

## Files to Touch

- `src/llm/prompts/sections/planner/continuation-context.ts` — add `buildAccountantContinuationContextSection()`
- `src/llm/prompts/sections/planner/continuation-context.ts` — extract shared base helper to avoid copy-paste drift
- `src/llm/prompts/sections/planner/index.ts` — export new function
- `src/llm/prompts/state-accountant-prompt.ts` — use new context builder
- `test/unit/llm/prompts/state-accountant-prompt.test.ts` — assert accountant prompt excludes planner-only sections and avoids duplicated sections
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` — add accountant-specific continuation-context coverage

## Risks

- **Low/medium risk**: Removing planner-only context could remove weakly useful narrative hints for edge cases; accountant output quality must be verified by tests
- **Mitigation**: The accountant retains all state-relevant context (active state, inventory, health, characters, world facts, structure, spine, canon, NPC state, pending consequences)
- **Verification**: Compare accountant prompt token counts before and after; verify state intent quality/coverage through existing and new unit tests

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] Accountant continuation prompt no longer includes: dramatic irony, escalation directive, pacing briefing, thematic trajectory, narrative focus, premise promise warning, value spectrum, grandparent narrative, tone drift warning, or continuation-level `TONE/GENRE`
- [x] Accountant continuation prompt no longer duplicates thread aging, tracked promises, or payoff feedback sections
- [x] Continuation-context implementation remains DRY: planner/accountant wrappers share a single base context renderer
- [x] Relevant existing tests pass
- [x] Accountant continuation context size reduced by removing planner-only and duplicated sections

## Outcome

- **Completed on**: 2026-03-07
- **What changed**:
  - Refactored `continuation-context.ts` into a shared private renderer with explicit planner and accountant wrappers.
  - Added `buildAccountantContinuationContextSection()` and switched `state-accountant-prompt.ts` continuation mode to use it.
  - Exported new accountant builder from planner/sections barrels.
  - Added tests that verify accountant continuation context excludes planner-only sections and avoids duplicate thread/promise/payoff sections.
  - Updated prompt doc wording to reflect accountant-specific continuation context builder usage.
- **Deviation from original plan**:
  - Instead of copy-pasting the planner continuation builder, implemented a shared base renderer plus wrappers to prevent drift and keep architecture DRY/extensible.
  - Added explicit coverage in both section-level and prompt-level tests to lock behavior.
- **Verification**:
  - `npm run typecheck`
  - `npm run lint`
  - `npx jest test/unit/llm/prompts/state-accountant-prompt.test.ts --runInBand`
  - `npx jest test/unit/llm/prompts/sections/planner/continuation-context.test.ts --runInBand`
  - `npx jest test/unit/llm/prompt-doc-alignment.test.ts --runInBand`

# NARARCAUD-25: Retrospective Coherence Check

**Status**: COMPLETED

**Wave**: 4 (New Subsystems)
**Effort**: M
**Dependencies**: Benefits from NARARCAUD-05 (causal links)
**Spec reference**: E2 — Causal Chain gaps

## Summary

Add a retrospective coherence check to the analyst that activates only during the final resolution beat. The analyst evaluates whether the story's causal chain holds together in retrospect, flagging any coherence issues.

## Files to Touch

- `src/engine/analyst-evaluation.ts` — add conditional mode detection for final resolution beat
- `src/llm/analyst-types.ts` — add `retrospectiveCoherence: boolean`, `coherenceIssues: readonly string[]` to `AnalystResult`
- `src/llm/schemas/analyst-schema.ts` — add both fields (required; coherenceIssues can be empty)
- `src/llm/prompts/analyst-prompt.ts` — add final-act retrospective coherence instruction
- `prompts/analyst-prompt.md` — update doc

## Out of Scope

- Planner context changes
- Writer prompt
- Structure modifications

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: analyst schema includes `retrospectiveCoherence` and `coherenceIssues`
- [ ] Unit test: `buildAnalystPrompt` includes retrospective instruction when in final resolution beat
- [ ] Unit test: `runAnalystEvaluation` passes final-beat context flag
- [ ] Invariant: All existing tests pass

## Outcome

- Completion date: 2026-03-14
- What changed: Archived this ticket as completed after implementation. The analyst pipeline has since been refactored into focused evaluator stages and reorganized prompt modules, so the original file-path expectations in this ticket are stale relative to the current code layout.
- Deviations from plan: The exact implementation is no longer directly traceable from the ticket ID, and the current codebase does not preserve the original `analyst-prompt` path or a one-to-one field mapping from this ticket text.
- Verification results: Confirmed the ticket file exists only in `tickets/`, verified `archive/tickets/` exists, and checked current analyst-related code paths and history before archiving. Left unrelated untracked ticket files untouched.

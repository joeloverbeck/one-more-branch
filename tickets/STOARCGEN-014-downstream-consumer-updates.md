# STOARCGEN-014: Downstream Consumer Updates — Planner + Analyst Prompts

**Status**: TODO
**Depends on**: STOARCGEN-008 (new fields available), STOARCGEN-001-007 (rename complete)
**Blocks**: None

## Summary

Update the planner and analyst prompts to use the new high-signal fields (`actQuestion`, `exitCondition`, `exitReversal`, `promiseTargets`). These are additive context injections — no structural changes to prompt output schemas.

## Files to Touch

### Planner prompt
- `src/llm/prompts/sections/planner/continuation-context.ts` — Inject `actQuestion`, `exitCondition`, `promiseTargets` into planner context
- `src/llm/prompts/continuation-prompt.ts` — Ensure new context flows through (if needed)

### Analyst prompt
- `src/llm/prompts/continuation/story-structure-section.ts` — Inject `exitCondition` for milestone completion judgment, `actQuestion` for drift detection, `exitReversal` for act transition weight

### Engine evaluation
- `src/engine/analyst-evaluation.ts` — Use `exitCondition` for concrete milestone completion judgment (replaces objective-based heuristic)

## Detailed Changes

### Planner context injection

Add to the structure context section that the planner receives:

```
Current Act Question: {actQuestion}
  → The dramatic question this act must answer

Current Milestone Exit Condition: {exitCondition}
  → The concrete condition for this milestone's conclusion

Act Promise Targets: {promiseTargets}
  → Premise promises this act should advance
```

These are additive — the planner's output schema does not change.

### Analyst context injection

Add to the structure evaluation section:

```
Milestone Exit Condition: {exitCondition}
  → Use this for concrete milestone completion judgment instead of general objective matching

Act Question: {actQuestion}
  → Use this for deviation detection — is the narrative drifting from the act's core question?

Expected Exit Reversal: {exitReversal}
  → Use this to judge whether an act transition carries sufficient dramatic weight
```

### `analyst-evaluation.ts` logic change

Currently, milestone conclusion is judged against the milestone's `objective`. With `exitCondition` available, the judgment should prefer `exitCondition` when non-empty, falling back to `objective` for backward compat (old stories without `exitCondition`).

This is the **only logic change** in this ticket — everything else is additive context.

## Out of Scope

- Planner output schema changes (no changes needed)
- Analyst output schema changes (no changes needed)
- Writer prompt changes (writer doesn't need these fields)
- Choice generator prompt changes (no changes needed)
- UI display of these fields (STOARCGEN-015)
- Pipeline changes (STOARCGEN-012)

## Acceptance Criteria

### Tests that must pass
- Updated test: `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` — Verifies `actQuestion`, `exitCondition`, `promiseTargets` appear in planner context when available
- Updated test: `test/unit/llm/prompts/continuation/story-structure-section.test.ts` — Verifies `exitCondition`, `actQuestion`, `exitReversal` appear in analyst context
- Updated test: `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` — Verifies evaluation uses `exitCondition` when available
- New test: Planner context gracefully handles empty `actQuestion`/`exitCondition` (backward compat)
- New test: Analyst evaluation falls back to `objective` when `exitCondition` is `''`
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Planner output schema is unchanged
- Analyst output schema is unchanged
- Old stories (without new fields) produce correct planner/analyst prompts (graceful fallback)
- No structural changes to prompt builders — only additive context injections
- `exitCondition` judgment is preferred over `objective` when both are available
- Content policy injection unchanged

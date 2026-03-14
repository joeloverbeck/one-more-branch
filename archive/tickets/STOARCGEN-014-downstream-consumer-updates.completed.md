# STOARCGEN-014: Downstream Consumer Updates — Planner + Analyst Prompts

**Status**: COMPLETED
**Depends on**: STOARCGEN-008 (new fields available), STOARCGEN-001-007 (rename complete)
**Blocks**: None

## Summary

Update the shared downstream prompt surfaces that consume story structure so they use the new high-signal fields (`actQuestion`, `exitCondition`, `exitReversal`, `promiseTargets`) where they materially improve planning and evaluation. This is primarily prompt-context work; no output schema changes are expected.

## Reassessed Assumptions

- The current planner continuation flow does **not** own its own structure rendering. It reuses `buildWriterStructureContext()` from `src/llm/prompts/continuation/story-structure-section.ts`, which is also consumed by planner opening context and lorekeeper prompts.
- `src/llm/prompts/continuation-prompt.ts` is **not** part of this ticket's runtime path. The writer continuation prompt does not render the structure section described here.
- `src/engine/analyst-evaluation.ts` is orchestration only. The milestone-completion heuristic lives in the structure-evaluator prompt stack:
  - `src/llm/prompts/structure-evaluator-prompt.ts`
  - `src/llm/prompts/continuation/story-structure-section.ts`
- The codebase already has backward-compatible normalization for these fields:
  - missing `actQuestion` / `exitReversal` normalize to `''`
  - missing `promiseTargets` normalize to `[]`
  - missing `exitCondition` normalizes to `''`
  This means the ticket should verify graceful degradation, not introduce a new compatibility layer.
- Architecturally, using `exitCondition` for analyst completion judgment is better than relying solely on `objective`: `objective` is protagonist-facing intent, while `exitCondition` is the cleaner completion contract. The robust design is to keep both, using `objective` for dramatic direction and `exitCondition` for completion/evaluation guidance when present.

## Files to Touch

### Shared structure context used by planner
- `src/llm/prompts/continuation/story-structure-section.ts` — Expand the shared structure summary so planner-facing consumers receive `actQuestion`, active milestone `exitCondition`, and active act `promiseTargets` without duplicating structure rendering
- `src/llm/prompts/sections/planner/continuation-context.ts` — Touch only if needed after the shared section change
- `src/llm/prompts/sections/planner/opening-context.ts` — Covered implicitly by the shared section change; no bespoke planner-only rendering should be added unless strictly necessary

### Analyst prompt
- `src/llm/prompts/continuation/story-structure-section.ts` — Inject `exitCondition` for milestone completion judgment, `actQuestion` for drift detection context, `exitReversal` for act-transition evaluation context
- `src/llm/prompts/structure-evaluator-prompt.ts` — Update evaluator instructions so system-level guidance matches the new completion basis

### Tests
- `test/unit/llm/prompts/sections/planner/continuation-context.test.ts`
- `test/unit/llm/prompts/continuation/writer-structure-context.test.ts`
- `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts`
- `test/unit/llm/prompts/structure-evaluator-prompt.test.ts`

## Detailed Changes

### Shared planner structure context

Add to the shared structure context section used by planner-facing prompt builders:

```
Current Act Question: {actQuestion}
  → The dramatic question this act must answer

Current Milestone Exit Condition: {exitCondition}
  → The concrete condition for this milestone's conclusion

Act Promise Targets: {promiseTargets}
  → Premise promises this act should advance
```

These are additive context fields. Do not create a planner-only duplicate of the structure renderer unless the shared seam proves insufficient.

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

### Structure-evaluator prompt logic change

Currently, the structure-evaluator prompt frames completion almost entirely around the milestone `objective`. With `exitCondition` available, the evaluator should prefer `exitCondition` when it is non-empty and fall back to `objective` only when `exitCondition` is empty.

This is the only substantive evaluation-behavior change in this ticket, and it belongs in prompt/instruction text rather than `src/engine/analyst-evaluation.ts`.

## Out of Scope

- Planner output schema changes (no changes needed)
- Analyst output schema changes (no changes needed)
- Writer prompt changes (writer doesn't need these fields)
- Choice generator prompt changes (no changes needed)
- UI display of these fields (STOARCGEN-015)
- Pipeline changes (STOARCGEN-012)
- Helper renames or architecture cleanup beyond the minimum needed for this ticket. Note: the shared helper name `buildWriterStructureContext()` is now broader than its actual use and should be revisited in a future cleanup ticket if it starts causing confusion.

## Acceptance Criteria

### Tests that must pass
- Updated test: `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` — Verifies planner-visible structure context contains `actQuestion`, active milestone `exitCondition`, and `promiseTargets` when present
- Relevant coverage: `test/unit/llm/prompts/continuation/writer-structure-context.test.ts` — Verifies the shared structure section still renders correctly after the new structural fields are added
- Updated test: `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` — Verifies the analyst evaluation section prefers `exitCondition` and includes `actQuestion` / `exitReversal`
- Updated or new test: structure-evaluator system prompt/instructions reflect `exitCondition`-first completion guidance
- New test: Shared structure context gracefully handles empty `actQuestion` / `exitCondition` / `promiseTargets`
- New test: Analyst evaluation falls back to `objective` when `exitCondition` is `''`
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Planner output schema is unchanged
- Analyst output schema is unchanged
- Old stories (without new fields) continue to produce valid planner/analyst prompts through existing normalization defaults
- No new aliasing or compatibility shims are introduced
- Shared structure rendering is preferred over duplicated planner-specific structure formatting
- `exitCondition` judgment is preferred over `objective` when both are available
- Content policy injection unchanged

## Outcome

- Completed on 2026-03-14.
- Corrected the ticket scope before implementation:
  - removed `src/llm/prompts/continuation-prompt.ts` and `src/engine/analyst-evaluation.ts` from the active implementation path
  - documented the real seams: shared structure rendering plus structure-evaluator prompt instructions
  - corrected the shared-structure test surface to `writer-structure-context.test.ts`
- Actually changed:
  - enriched the shared structure context so planner-facing consumers receive `actQuestion`, `exitReversal`, active milestone `exitCondition`, and `promiseTargets` when present
  - updated analyst-evaluation prompt text to use `exitCondition` as the primary completion target, falling back to `objective`
  - added a dedicated `structure-evaluator-prompt` unit test to lock the system prompt guidance
- Deliberately did not change:
  - planner output schema
  - analyst output schema
  - writer prompt flow
  - engine orchestration in `src/engine/analyst-evaluation.ts`
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/sections/planner/continuation-context.test.ts test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts test/unit/llm/prompts/structure-evaluator-prompt.test.ts`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/continuation/writer-structure-context.test.ts`
  - `npm run test:unit -- --coverage=false`
  - `npm run typecheck`
  - `npm run lint`

**Status**: ✅ COMPLETED

# THRCONANDDEDSPE-01: Open-Loop Thread Contract in Shared Prompt Sections

## Summary
Implement the explicit open-loop thread contract in shared prompt guidance so writer/planner instructions clearly separate unresolved loops from current-state facts. This ticket focuses only on shared contract wording and canonical thread-form templates.

## Assumption Reassessment (2026-02-11)
- `src/llm/prompts/sections/shared/state-tracking.ts` currently defines active-state read-only usage and forbidden mutation fields, but does **not** define the explicit open-loop thread contract or canonical `ThreadType` phrasing templates.
- Opening/continuation quality sections already include some thread examples, so this ticket should not expand into those files.
- Existing shared state-tracking unit tests verify section presence/read-only behavior, but do not assert the required open-loop contract language.

## Depends on
- `specs/08-writing-prompts-split-architecture.md` contract (writer does not own final state mutation truth)
- `specs/12-thread-contract-and-dedup-spec.md` thread contract section

## File list it expects to touch
- `src/llm/prompts/sections/shared/state-tracking.ts`
- `test/unit/llm/prompts/sections/shared/state-tracking.test.ts`

## Implementation checklist
1. Add an explicit `THREADS = unresolved open loops` definition block.
2. Encode allowed thread forms:
   - Question loop (`MYSTERY`, `INFORMATION`, `MORAL`, `RELATIONSHIP`)
   - Goal loop with success condition (`QUEST`, `RESOURCE`)
   - Prevention loop for long-horizon risk (`DANGER`)
3. Encode disallowed thread forms:
   - Current events (must be `THREAT` / `CONSTRAINT`)
   - Inventory facts
   - Emotional snapshots
   - Completed questions
4. Add canonical phrasing templates by `ThreadType` in prompt text.
5. Update unit tests to assert presence of open-loop contract and template language.

## Out of scope
- No reconciler algorithm changes.
- No threshold tuning or normalization changes.
- No planner schema/type changes.
- No integration/e2e updates.
- No edits to opening/continuation quality-criteria files in this ticket.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/shared/state-tracking.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/state-intent-rules.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Shared prompt sections remain creative-guidance/read-only context docs; no runtime logic added.
- Writer-facing prompt contract still forbids state mutation output fields.
- Thread taxonomy enums in model/types are unchanged.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added explicit open-loop thread contract language to `src/llm/prompts/sections/shared/state-tracking.ts`.
  - Added allowed/disallowed thread forms and canonical phrasing templates for all thread types (`MYSTERY`, `INFORMATION`, `MORAL`, `RELATIONSHIP`, `QUEST`, `RESOURCE`, `DANGER`).
  - Expanded `test/unit/llm/prompts/sections/shared/state-tracking.test.ts` with assertions covering the new contract and templates.
- Deviations from original plan:
  - No changes were made to opening/continuation quality-criteria files, consistent with the reassessed ticket scope.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/shared/state-tracking.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/state-intent-rules.test.ts` passed.
  - `npm run typecheck` passed.

**Status**: Draft

# THRCONANDDEDSPE-01: Open-Loop Thread Contract in Shared Prompt Sections

## Summary
Implement the explicit open-loop thread contract in shared prompt guidance so writer/planner instructions clearly separate unresolved loops from current-state facts. This ticket focuses only on shared contract wording and canonical thread-form templates.

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

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/shared/state-tracking.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/planner/state-intent-rules.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Shared prompt sections remain creative-guidance/read-only context docs; no runtime logic added.
- Writer-facing prompt contract still forbids state mutation output fields.
- Thread taxonomy enums in model/types are unchanged.


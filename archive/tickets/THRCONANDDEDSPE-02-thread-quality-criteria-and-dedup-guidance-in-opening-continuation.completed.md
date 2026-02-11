**Status**: ✅ COMPLETED

# THRCONANDDEDSPE-02: Thread Quality Criteria and Dedup Guidance in Opening/Continuation

## Summary
Update opening and continuation quality-criteria prompt sections with concrete GOOD/BAD thread examples that match observed failure modes, plus explicit hard dedup/refinement wording and threat-vs-danger separation guidance.

## Assumption reassessment (2026-02-11)
- `specs/12-thread-contract-and-dedup-spec.md` lists prompt-side additions across three files, including `src/llm/prompts/sections/shared/state-tracking.ts`.
- In current code, shared thread-contract additions are already implemented and covered by `test/unit/llm/prompts/sections/shared/state-tracking.test.ts`.
- This ticket is therefore narrowed to the remaining opening/continuation quality-criteria guidance only; no shared state-tracking edits are required here.

## Depends on
- `THRCONANDDEDSPE-01`
- `specs/12-thread-contract-and-dedup-spec.md` prompt-side required additions
- `brainstorming/writing-prompts-split.md` failure examples (duplicate relationship and explanation loops)

## File list it expects to touch
- `src/llm/prompts/sections/continuation/continuation-quality-criteria.ts`
- `src/llm/prompts/sections/opening/opening-quality-criteria.ts`
- `test/unit/llm/prompts/sections/continuation/quality-criteria.test.ts`
- `test/unit/llm/prompts/sections/opening/quality-criteria.test.ts`

## Implementation checklist
1. Replace generic thread examples with open-loop examples aligned to current failures:
   - relationship-loop duplicates
   - explanation-loop duplicates
   - state-as-thread mistakes
2. Add hard prompt rule for thread dedup/refinement:
   - same loop with rewording: do not add
   - more specific loop: resolve old `td-*` + add one replacement
3. Add explicit threat-vs-danger guidance:
   - immediate hazard => threat/constraint
   - looming structural prevention risk => danger thread
4. Add thread resolution trigger text (answered, achieved/abandoned, decided, rendered moot).
5. Update tests to assert new rule and examples are present.
6. Keep shared state-tracking contract content unchanged in this ticket; it is pre-existing scope already delivered.

## Out of scope
- No edits to `src/llm/prompts/sections/shared/state-tracking.ts` in this ticket.
- No changes to reconciler enforcement logic or diagnostics keys.
- No schema/type/interface updates.
- No narrative generation orchestration updates.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/continuation/quality-criteria.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/opening/quality-criteria.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/continuation-prompt.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Opening quality criteria still enforce establishment-first behavior.
- Continuation quality criteria still enforce ID-based removal semantics.
- Prompt output contract remains compatible with existing writer/planner schemas.

## Outcome
- **Completion date**: 2026-02-11
- **What changed**:
  - Updated opening and continuation quality-criteria prompt sections with thread examples tied to duplicate relationship/explanation failure modes.
  - Added explicit dedup/refinement guidance and threat-vs-danger classification text in both sections.
  - Added explicit continuation thread resolution trigger wording (answered, achieved/abandoned, decided, rendered moot).
  - Updated unit tests for both quality-criteria modules to assert the new rules/examples.
- **Deviations from original plan**:
  - Ticket scope was narrowed after reassessment: shared `state-tracking` contract work from spec 12 was already implemented and tested, so this ticket did not modify shared prompt sections.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/sections/continuation/quality-criteria.test.ts test/unit/llm/prompts/sections/opening/quality-criteria.test.ts test/unit/llm/prompts/continuation-prompt.test.ts` passed.
  - `npm run typecheck` passed.

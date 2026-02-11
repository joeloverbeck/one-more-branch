**Status**: Draft

# THRCONANDDEDSPE-02: Thread Quality Criteria and Dedup Guidance in Opening/Continuation

## Summary
Update opening and continuation quality-criteria prompt sections with concrete GOOD/BAD thread examples that match observed failure modes, plus explicit hard dedup/refinement wording and threat-vs-danger separation guidance.

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

## Out of scope
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


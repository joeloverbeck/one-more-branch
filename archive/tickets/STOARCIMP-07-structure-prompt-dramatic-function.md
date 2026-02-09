# STOARCIMP-07: Add dramatic function guidance to structure generation and rewrite prompts

**Status**: ✅ COMPLETED

**Phase**: 3 (Prompt Quality Improvements)
**Spec sections**: 3.1, 3.2 (prompt text only, not code changes)
**Depends on**: STOARCIMP-01, STOARCIMP-03, STOARCIMP-04
**Blocks**: Nothing (parallel with STOARCIMP-08)

## Description

Enhance the structure generation and rewrite prompts to leverage the new data model fields:

1. **Structure prompt** (`structure-prompt.ts`): Add new REQUIREMENTS items (8, 9, 10) for dramatic function guidance:
   - Requirement 8: Design beats with clear dramatic roles (setup, escalation, turning_point, resolution) with specific act placement guidance.
   - Requirement 9: Write a premise (1-2 sentence hook).
   - Requirement 10: Set pacing budget appropriate for the story's scope.
   - Update OUTPUT SHAPE section to include `premise`, `pacingBudget`, and beat `role`.

2. **Structure rewrite prompt** (`structure-rewrite-prompt.ts`): The OUTPUT SHAPE and few-shot updates are handled by STOARCIMP-04. This ticket adds the text requirement: "Preserve beat roles from completed beats. New beats must include appropriate roles."

Note: STOARCIMP-03 handles the few-shot example data updates. STOARCIMP-04 handles the rewrite prompt few-shot and OUTPUT SHAPE. This ticket is specifically about the **instructional text** in the REQUIREMENTS section of the structure prompt.

## Files to touch

| File | Change |
|------|--------|
| `src/llm/prompts/structure-prompt.ts` | Add requirements 8-10 for dramatic function, premise, and pacing budget. Update OUTPUT SHAPE description. |
| `src/llm/prompts/structure-rewrite-prompt.ts` | Add preservation requirement for beat roles in instructional text (if not already done by STOARCIMP-04). |
| `test/unit/llm/prompts/structure-prompt.test.ts` | Verify prompt output contains dramatic function guidance text, premise instruction, pacing budget instruction. Verify OUTPUT SHAPE includes `premise`, `pacingBudget`, `role`. |
| `test/unit/llm/prompts/structure-rewrite-prompt.test.ts` | Verify rewrite prompt includes beat role preservation instruction. |

## Out of scope

- Data model types -- STOARCIMP-01.
- JSON schema changes -- STOARCIMP-03.
- Parser changes -- STOARCIMP-03.
- Structure few-shot data changes -- STOARCIMP-03.
- Rewrite few-shot data and OUTPUT SHAPE -- STOARCIMP-04.
- Continuation prompt changes -- STOARCIMP-08.
- Analyst prompt changes -- STOARCIMP-08.
- Runtime logic -- STOARCIMP-06.
- `AccumulatedStructureState` changes -- STOARCIMP-02.

## Acceptance criteria

### Tests that must pass

1. **Structure prompt contains dramatic role guidance**: Output of `buildStructurePrompt` includes text about `setup`, `escalation`, `turning_point`, `resolution` and their dramatic functions.
2. **Structure prompt contains premise instruction**: Output includes instruction to write a premise as a 1-2 sentence hook.
3. **Structure prompt contains pacing budget instruction**: Output includes instruction to set `targetPagesMin` and `targetPagesMax`.
4. **Structure prompt OUTPUT SHAPE updated**: The OUTPUT SHAPE section mentions `premise: string`, `pacingBudget`, and beat `role`.
5. **Rewrite prompt contains role preservation instruction**: Output of `buildStructureRewritePrompt` includes text about preserving beat roles.
6. **All existing structure-prompt and structure-rewrite-prompt tests pass**.
7. **TypeScript build (`npm run typecheck`) passes**.

### Invariants that must remain true

- **3 acts required**: Prompt still requires exactly 3 acts.
- **2-4 beats per act**: Prompt still requires 2-4 beats.
- **Branching awareness**: Existing instructions about branching fiction are preserved.
- **All existing tests pass**.

## Outcome

**Completion date**: 2026-02-09

**What was changed**:
- `src/llm/prompts/structure-prompt.ts`: Added requirements 8 (dramatic role guidance with act placement), 9 (premise instruction), 10 (pacing budget instruction). Updated OUTPUT SHAPE to include premise, pacingBudget, and beat role.
- `test/unit/llm/prompts/structure-prompt.test.ts`: Added 4 new tests for dramatic role guidance, premise instruction, pacing budget instruction, and OUTPUT SHAPE completeness.

**Deviations from plan**:
- `structure-rewrite-prompt.ts` required no changes -- STOARCIMP-04 had already implemented all required instructional text (requirements 8-10, OUTPUT SHAPE, role preservation).
- `structure-rewrite-prompt.test.ts` required no changes -- existing tests already covered role preservation.

**Verification results**:
- TypeScript build: pass
- 115 test suites: pass
- 1588 tests passing (4 new), 16 skipped, 0 failures

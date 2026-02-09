# STOARCIMP-08: Wire beat role and pacing into continuation prompts (writer context, analyst evaluation, nudge injection)

**Phase**: 2+3 (Analyst Pacing Instructions + Prompt Quality)
**Spec sections**: 2.5, 3.3, 3.4, 3.5
**Depends on**: STOARCIMP-01, STOARCIMP-02, STOARCIMP-03, STOARCIMP-05, STOARCIMP-06
**Blocks**: Nothing (final ticket)

## Description

This is the final integration ticket that wires the new data model fields and pacing detection into the continuation prompts consumed by the writer and analyst LLMs.

### Writer context enhancement (3.3)

In `buildWriterStructureContext` (`story-structure-section.ts`):
- Show beat `role` alongside beat status: e.g., `[>] ACTIVE (turning_point): description` and `[ ] PENDING (setup): description`.
- Add `Premise: ${structure.premise}` to the structure header, after `Overall Theme`.

### Analyst evaluation enhancement (2.5, 3.4)

In `buildAnalystStructureEvaluation` (`story-structure-section.ts`):
- Show beat `role` in beat lines (same format as writer).
- Inject a `=== PACING EVALUATION ===` section with:
  - `pagesInCurrentBeat` from accumulated state
  - `pacingBudget` from structure
  - Computed `totalBeats`, `avgPagesPerBeat`, `maxPagesPerBeat`
  - Detection criteria: BEAT STALL (pages exceed threshold) and MISSING MIDPOINT (>50% budget without turning_point concluded)
  - Instructions for setting `pacingIssueDetected`, `pacingIssueReason`, `recommendedAction`

### Pacing nudge injection (3.5)

In `buildContinuationPrompt` (`continuation-prompt.ts`):
- When `accumulatedStructureState.pacingNudge` is non-null, inject a `=== PACING DIRECTIVE ===` section between structure and canon sections.
- When null, no section injected.

## Files to touch

| File | Change |
|------|--------|
| `src/llm/prompts/continuation/story-structure-section.ts` | In `buildWriterStructureContext`: add beat `role` to beat lines, add `Premise` line. In `buildAnalystStructureEvaluation`: add beat `role` to beat lines, add `=== PACING EVALUATION ===` section with computed thresholds. |
| `src/llm/prompts/continuation-prompt.ts` | Add pacing nudge injection: `=== PACING DIRECTIVE ===` section when `pacingNudge` is non-null. |
| `test/unit/llm/prompts/continuation/writer-structure-context.test.ts` | Test beat role appears in output (e.g., `(turning_point)`). Test premise appears in output. |
| `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` | Test beat role appears in output. Test `=== PACING EVALUATION ===` section appears with correct values. |
| `test/unit/llm/prompts/continuation/story-structure-section.test.ts` | Any shared tests for the structure section builders. |
| `test/integration/llm/system-prompt-composition.test.ts` | If this tests full prompt assembly, verify pacing nudge injection. |

## Out of scope

- Data model types -- STOARCIMP-01, STOARCIMP-02.
- Structure schema/parser -- STOARCIMP-03.
- Analyst types/schemas/transformer -- STOARCIMP-05.
- Result merger / page-service runtime -- STOARCIMP-06.
- Structure prompt dramatic function text -- STOARCIMP-07.
- Rewrite prompt changes -- STOARCIMP-04.
- Opening prompt: The spec explicitly says NO changes to opening prompt (beat 1.1 is always `setup`, adds nothing).

## Acceptance criteria

### Tests that must pass

1. **Writer context includes beat role**: `buildWriterStructureContext` output contains `(setup)`, `(escalation)`, `(turning_point)`, or `(resolution)` for each beat.
2. **Writer context includes premise**: Output contains `Premise: <value>` line.
3. **Analyst evaluation includes beat role**: `buildAnalystStructureEvaluation` output contains beat role labels.
4. **Analyst evaluation includes pacing section**: Output contains `=== PACING EVALUATION ===` with `Pages spent on current beat:`, `Story pacing budget:`, `Total beats in structure:`, `Average pages per beat:`.
5. **Pacing section includes detection criteria**: Output mentions "BEAT STALL" and "MISSING MIDPOINT" detection rules.
6. **Pacing section computes correct thresholds**: Given a structure with known beat count and pacing budget, `maxPagesPerBeat` equals `ceil(targetPagesMax / totalBeats) + 2`.
7. **Nudge injection -- non-null**: When `pacingNudge` is set on `accumulatedStructureState`, `buildContinuationPrompt` output contains `=== PACING DIRECTIVE ===` and the nudge text.
8. **Nudge injection -- null**: When `pacingNudge` is null, output does NOT contain `=== PACING DIRECTIVE ===`.
9. **All existing continuation prompt, writer-structure-context, and analyst-structure-evaluation tests pass**.
10. **TypeScript build (`npm run typecheck`) passes**.

### Invariants that must remain true

- **Page immutability**: No changes to page generation output format.
- **Branch isolation**: Pacing nudge is read from per-branch `AccumulatedStructureState`.
- **Writer prompt structure preserved**: Existing sections (world, NPCs, canon, character state, scene context, requirements) unchanged in order and content.
- **Analyst prompt structure preserved**: Existing beat evaluation and deviation detection sections unchanged -- pacing evaluation is an ADDITION, not a replacement.
- **Opening prompt untouched**: `buildOpeningPrompt` is not modified.
- **All existing tests pass**.

**Status**: ✅ COMPLETED

# BEACONSCESIGGAT-02: Enforce two-step analyst reasoning contract and objective-anchor extraction in analyst prompt

## Summary
Reinforce the analyst reasoning contract at the **system-prompt level** and add explicit objective-anchor extraction requirements. The structural Step A/Step B gate is already present in `buildAnalystStructureEvaluation()` (user message); this ticket ensures those rules are also clearly stated in `ANALYST_SYSTEM_PROMPT`.

## Depends on
- BEACONSCESIGGAT-01

## Blocks
- BEACONSCESIGGAT-04

## File list it expects to touch
- `src/llm/prompts/analyst-prompt.ts`
- `test/unit/llm/prompts/analyst-prompt.test.ts`

## Implementation checklist
1. Update `ANALYST_SYSTEM_PROMPT` to require explicit sequence:
   - Step A: classify scene signals using provided enums.
   - Step B: apply completion gate to active beat objective.
2. Add objective-anchor contract to instructions:
   - Extract 1-3 short anchors from active beat objective.
   - Map each anchor to concrete narrative/state evidence.
   - Default to non-conclusion when no anchor has explicit evidence.
3. Add wording that evidence is cumulative across current narrative plus active state.
4. Extend tests to assert presence of two-step contract and anchor-extraction instructions.
5. Do not modify `story-structure-section.ts` in this ticket unless a blocking inconsistency is discovered.

## Out of scope
- Do not add/remove enum definitions or gate logic in `story-structure-section.ts` (already introduced by prior work; this ticket only reinforces analyst-level instruction clarity).
- Do not change JSON schema or Zod validation.
- Do not add runtime guardrails in engine.
- Do not change writer prompt behavior.

## Acceptance criteria

### Specific tests that must pass
- `test/unit/llm/prompts/analyst-prompt.test.ts`
  - System prompt includes explicit `Step A` classification requirement and references scene-signal enums from the structure section.
  - System prompt includes explicit `Step B` gate-application requirement.
  - System prompt includes `objective anchors` extraction requirement (1-3 anchors).
  - System prompt includes requirement to map anchors to concrete evidence.
  - System prompt includes conservative default when explicit anchor evidence is missing.
  - System prompt includes cumulative-evidence wording (current narrative + active state).
- Existing tests in `test/unit/llm/prompts/analyst-prompt.test.ts` still pass (2-message format, system/user roles, structure + narrative inclusion).
- `npm run test:unit -- test/unit/llm/prompts/analyst-prompt.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- `buildAnalystPrompt()` still returns exactly two messages (`system`, `user`).
- User message still includes `NARRATIVE TO EVALUATE:` and the raw narrative text.
- Prompt remains analytical-only (no creative writing directive).

## Outcome
- Completion date: 2026-02-10
- What changed:
  - Updated `ANALYST_SYSTEM_PROMPT` in `src/llm/prompts/analyst-prompt.ts` to explicitly enforce:
    - Step A classification before Step B gate decision
    - Objective-anchor extraction (1-3 anchors) from `activeBeat.objective`
    - Anchor-to-evidence mapping
    - Cumulative evidence requirement across current narrative + active state
    - Conservative default (`beatConcluded: false`) when no anchor has explicit evidence
  - Extended `test/unit/llm/prompts/analyst-prompt.test.ts` with focused assertions covering each contract clause.
- Deviations from original plan:
  - No changes were made to `story-structure-section.ts` because Step A/Step B classification and completion-gate logic were already present there; this ticket was implemented as a system-prompt reinforcement plus tests.
- Verification:
  - `npm run test:unit -- test/unit/llm/prompts/analyst-prompt.test.ts` (passes; Jest project pattern also runs all unit tests in this repo configuration)
  - `npm run typecheck` (passes)

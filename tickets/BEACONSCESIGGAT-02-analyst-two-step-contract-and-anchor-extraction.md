**Status**: Proposed

# BEACONSCESIGGAT-02: Enforce two-step analyst reasoning contract and objective-anchor extraction in analyst prompt

## Summary
Update analyst system/user prompt instructions so the model is explicitly required to execute Step A classification before Step B completion decision, and to extract objective anchors from `activeBeat.objective` before setting `beatConcluded`.

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

## Out of scope
- Do not add/remove enum definitions in `story-structure-section.ts` (BEACONSCESIGGAT-01 owns enum block).
- Do not change JSON schema or Zod validation.
- Do not add runtime guardrails in engine.
- Do not change writer prompt behavior.

## Acceptance criteria

### Specific tests that must pass
- `test/unit/llm/prompts/analyst-prompt.test.ts`
  - System prompt includes explicit `Step A` classification requirement.
  - System prompt includes explicit `Step B` gate-application requirement.
  - System prompt includes `objective anchors` extraction requirement (1-3 anchors).
  - System prompt includes requirement to map anchors to concrete evidence.
  - System prompt includes conservative default when explicit anchor evidence is missing.
- Existing tests in `test/unit/llm/prompts/analyst-prompt.test.ts` still pass (2-message format, system/user roles, structure + narrative inclusion).
- `npm run test:unit -- test/unit/llm/prompts/analyst-prompt.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- `buildAnalystPrompt()` still returns exactly two messages (`system`, `user`).
- User message still includes `NARRATIVE TO EVALUATE:` and the raw narrative text.
- Prompt remains analytical-only (no creative writing directive).

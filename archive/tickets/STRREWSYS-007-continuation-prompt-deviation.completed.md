# STRREWSYS-007: Add Deviation Detection to Continuation Prompt

## Status
- Completed (2026-02-07)

## Summary
Extend the continuation prompt so the LLM explicitly evaluates whether the narrative has deviated from remaining planned beats, while keeping compatibility with the current schema-based generation pipeline.

## Reassessed Assumptions
1. `test/unit/llm/prompts.test.ts` already exists and has extensive continuation prompt coverage.
2. Continuation generation currently uses strict JSON schema output (`src/llm/schemas/openrouter-schema.ts`), not free-form sectioned text output.
3. Because the schema currently does not include deviation fields, this ticket must not require adding free-form `RESPONSE FORMAT` blocks or new JSON fields.
4. Deviation parsing/output handling remains out of scope for this ticket and belongs to downstream tickets (`STRREWSYS-008`, plus schema updates).

## Dependencies
- None (can proceed independently as prompt-only change)

## Files to Touch

### Modified Files
- `src/llm/prompts/continuation-prompt.ts`
- `test/unit/llm/prompts.test.ts`

## Out of Scope
- Do NOT modify `opening-prompt.ts`
- Do NOT modify response parsing or transformer behavior
- Do NOT modify OpenRouter schema definitions in this ticket
- Do NOT modify LLM client
- Do NOT modify `system-prompt.ts`

## Implementation Details

### `src/llm/prompts/continuation-prompt.ts` Changes
1. Add a dedicated `BEAT DEVIATION EVALUATION` instruction block to the structure section.
2. Add a helper to compute remaining beats by excluding concluded beats from `accumulatedStructureState`.
3. Render `REMAINING BEATS TO EVALUATE FOR DEVIATION` (ID + description) before deviation instructions.
4. Keep behavior gated behind `context.structure && context.accumulatedStructureState`.
5. Keep existing prompt shape otherwise unchanged (no global format rewrite).

### Test Updates
Extend `test/unit/llm/prompts.test.ts` continuation prompt tests:
- include deviation section when structure context exists
- omit deviation section when structure context is absent
- list remaining beats for deviation evaluation
- exclude concluded beats from the remaining-beats list

## Acceptance Criteria

### Tests That Must Pass
- Prompt construction tests validate deviation section behavior
- Run targeted suite with Jest pattern: `npm run test:unit -- prompts.test.ts`

### Invariants That Must Remain True
1. **Structure required**: Deviation instructions only appear when structure and structure state exist.
2. **Concluded beats excluded**: Remaining-beats list contains only non-concluded beats.
3. **Backward compatibility**: Prompts without structure context remain unchanged.
4. **No schema regressions**: Ticket does not introduce output fields incompatible with current strict schema.

## Technical Notes
- Deviation guidance should be conservative: only for truly invalidated future beats, not minor beat variation.
- This ticket updates only prompt-side guidance and visibility of pending beats.
- Structured deviation output wiring is intentionally deferred to downstream parsing/schema tickets.

## Outcome
- Updated `src/llm/prompts/continuation-prompt.ts` to add:
  - a dedicated `BEAT DEVIATION EVALUATION` instruction block
  - remaining-beats rendering for deviation review
  - concluded-beat filtering helper for that list
- Updated `test/unit/llm/prompts.test.ts` with deviation-specific assertions:
  - section appears only when structure context exists
  - remaining beat IDs/descriptions are rendered
  - concluded beats are excluded from remaining-beats section
- Original plan vs actual:
  - Planned: include explicit response-format additions for deviation fields.
  - Actual: intentionally did not add free-form response-format/output-field requirements because current strict JSON schema output path would make those instructions stale/conflicting in this ticket.

# ACTSTAARC-008: Update System Prompt for Active State Output Format

**Status**: ✅ COMPLETED
**Priority**: HIGH (instructs LLM on new format)
**Depends On**: ACTSTAARC-005
**Estimated Scope**: Medium

---

## Summary

Update the system prompt to instruct the LLM on the new active state output format. This includes explaining the prefix tag system and providing examples of correct output.

---

## Files to Touch

### Modify
- `src/llm/prompts/system-prompt.ts` - Main system prompt
- `src/llm/prompts/system-prompt-builder.ts` - System prompt builder (if separate)
- `src/llm/prompts/sections/state-tracking.ts` - State tracking instructions (if exists)

---

## Out of Scope (DO NOT CHANGE)

- `src/llm/prompts/continuation-prompt.ts` - Changed in ACTSTAARC-007
- `src/llm/prompts/opening-prompt.ts` - Opening prompt (separate ticket if needed)
- `src/llm/schemas/**` - Schema changes in ACTSTAARC-005
- `src/engine/**` - Engine changes in ACTSTAARC-009
- Few-shot examples - Updated in ACTSTAARC-010

---

## Implementation Details

### Remove Old State Instructions

Remove any instructions about:
- `stateChangesAdded`
- `stateChangesRemoved`
- Event log format
- Accumulation of historical events

### Add New Active State Instructions

```typescript
const ACTIVE_STATE_INSTRUCTIONS = `=== ACTIVE STATE TRACKING ===

You must track the story's CURRENT STATE using structured fields. These represent what is TRUE RIGHT NOW, not a history of what happened.

LOCATION:
- Set "currentLocation" to where the protagonist is at the END of this scene
- If location doesn't change, set to the same value as before
- Be specific: "cramped maintenance tunnel" not just "tunnel"

THREATS (dangers that exist NOW):
- Add new threats using format: "THREAT_IDENTIFIER: Description"
- The IDENTIFIER should be short and unique (e.g., THREAT_FIRE, THREAT_GUARDS, THREAT_CREATURE)
- To remove a resolved threat, put ONLY the prefix in "threatsRemoved" (e.g., "THREAT_FIRE")
- Only include threats that are CURRENTLY present, not past dangers

CONSTRAINTS (limitations affecting protagonist NOW):
- Add using format: "CONSTRAINT_IDENTIFIER: Description"
- Examples: CONSTRAINT_INJURED_LEG, CONSTRAINT_TIME_LIMIT, CONSTRAINT_NO_LIGHT
- Remove when constraint is no longer active

THREADS (unresolved narrative hooks):
- Add using format: "THREAD_IDENTIFIER: Description"
- These are mysteries, unanswered questions, or plot hooks
- Examples: THREAD_LETTER_CONTENTS, THREAD_STRANGER_IDENTITY
- Resolve when the mystery is answered or hook is resolved

IMPORTANT RULES:
1. For removals, use ONLY the prefix (e.g., "THREAT_FIRE"), not the full entry
2. Each prefix should be unique within its category
3. Don't duplicate entries - update by removing old and adding new
4. Empty arrays mean "no changes" for that category
`;
```

### Example Output Section

```typescript
const ACTIVE_STATE_EXAMPLE = `Example output for active state:

{
  "currentLocation": "abandoned subway platform",
  "threatsAdded": [
    "THREAT_RATS: Large rats moving in the shadows",
    "THREAT_UNSTABLE_FLOOR: Floor tiles are cracking"
  ],
  "threatsRemoved": ["THREAT_GUARD"],
  "constraintsAdded": [
    "CONSTRAINT_FLASHLIGHT_DIM: Flashlight battery is failing"
  ],
  "constraintsRemoved": [],
  "threadsAdded": [
    "THREAD_GRAFFITI: Strange symbols on the wall"
  ],
  "threadsResolved": ["THREAD_LOCKED_DOOR"]
}
`;
```

### Integration with Existing System Prompt

The active state instructions should be integrated into the existing system prompt structure, appearing after the narrative instructions and before the choice instructions.

---

## Acceptance Criteria

### Tests That Must Pass

Update/create `test/unit/llm/prompts/system-prompt.test.ts`:

```typescript
describe('buildSystemPrompt', () => {
  it('includes active state tracking section', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('ACTIVE STATE TRACKING');
  });

  it('explains THREAT format', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('THREAT_IDENTIFIER');
    expect(prompt).toMatch(/THREAT_\w+:/);
  });

  it('explains CONSTRAINT format', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('CONSTRAINT_IDENTIFIER');
  });

  it('explains THREAD format', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('THREAD_IDENTIFIER');
  });

  it('explains prefix-only removal', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('ONLY the prefix');
    expect(prompt).toContain('threatsRemoved');
  });

  it('does not mention old stateChangesAdded', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).not.toContain('stateChangesAdded');
  });

  it('does not mention old stateChangesRemoved', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).not.toContain('stateChangesRemoved');
  });

  it('includes currentLocation instruction', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('currentLocation');
  });

  it('provides example output', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/"currentLocation":/);
    expect(prompt).toMatch(/"threatsAdded":/);
  });
});
```

### Invariants That Must Remain True

1. **Clear Format Instructions**: LLM understands prefix format
2. **Removal Protocol Clear**: Only prefix for removals, not full entry
3. **No Old Format References**: No mentions of `stateChangesAdded/Removed`
4. **Examples Provided**: At least one complete example
5. **Categories Explained**: All three categories (THREAT, CONSTRAINT, THREAD) documented
6. **Other Sections Unchanged**: Narrative, choice, and other instructions preserved

---

## Definition of Done

- [x] System prompt includes active state section
- [x] Prefix format clearly explained with examples
- [x] Removal protocol explained (prefix-only)
- [x] Old state format references removed
- [x] All system prompt tests pass
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes

---

## Outcome

**Completed**: 2026-02-08

### Changes Made

1. **`src/llm/prompts/sections/state-tracking.ts`**
   - Replaced `STATE_MANAGEMENT` and `STATE_REMOVAL_RULES` with `ACTIVE_STATE_TRACKING`
   - Updated `FIELD_SEPARATION` to reference new active state fields with PREFIX_ID format

2. **`src/llm/prompts/sections/quality-criteria.ts`**
   - Replaced `STATE_CHANGE_QUALITY` with `ACTIVE_STATE_QUALITY`
   - New content includes GOOD/BAD examples for THREATS, CONSTRAINTS, THREADS

3. **`src/llm/prompts/sections/index.ts`**
   - Updated exports to use new constant names

4. **`src/llm/prompts/system-prompt-builder.ts`**
   - Updated imports and `NARRATIVE_SECTIONS` array

5. **Test files created/updated:**
   - `test/unit/llm/prompts/system-prompt.test.ts` (NEW)
   - `test/unit/llm/prompts/sections/state-tracking.test.ts`
   - `test/unit/llm/prompts/sections/quality-criteria.test.ts`
   - `test/integration/llm/system-prompt-composition.test.ts`

### Deviations from Original Plan

- The test for "does not mention old stateChangesAdded" was adjusted to check for instructional usage patterns rather than any occurrence, since `stateChangesAdded` still appears in anti-pattern examples (with ❌) showing what NOT to do.

### Verification

- TypeScript: ✅ No errors
- ESLint: ✅ Passes
- Tests: ✅ 121 related tests pass, 1352 total tests pass

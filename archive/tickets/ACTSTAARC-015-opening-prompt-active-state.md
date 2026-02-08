# ACTSTAARC-015: Update Opening Prompt for Active State

**Status**: PENDING
**Priority**: MEDIUM
**Depends On**: ACTSTAARC-005, ACTSTAARC-008
**Estimated Scope**: Small

---

## Summary

Update the opening prompt to instruct the LLM to output the new active state fields for the first page of a story. The opening establishes the initial location, any starting threats/constraints, and introduces narrative threads.

---

## Files to Touch

### Modify
- `src/llm/prompts/opening-prompt.ts` - Opening prompt builder

---

## Out of Scope (DO NOT CHANGE)

- `src/llm/prompts/continuation-prompt.ts` - Changed in ACTSTAARC-007
- `src/llm/prompts/system-prompt.ts` - Changed in ACTSTAARC-008
- `src/llm/schemas/**` - Changed in ACTSTAARC-005
- `src/engine/**` - Engine changes in ACTSTAARC-009
- Few-shot examples - Changed in ACTSTAARC-010

---

## Implementation Details

### Opening Context Considerations

The opening page is special:
- No previous scenes (no `previousNarrative` or `grandparentNarrative`)
- No parent state (starts with empty active state)
- Establishes initial location, threats, constraints, threads

### Updated Opening Prompt Structure

The opening prompt's REQUIREMENTS section should include:

```typescript
const OPENING_REQUIREMENTS = `REQUIREMENTS (follow ALL):
1. Establish the initial scene vividly and immediately
2. Set the initial LOCATION clearly (currentLocation field)
3. Introduce any starting THREATS (dangers present at story start)
4. Establish any starting CONSTRAINTS (limitations protagonist faces)
5. Plant narrative THREADS (mysteries, questions, hooks for later)
6. Present 3-4 meaningful initial choices
7. Set protagonistAffect for how the protagonist feels at scene end

ACTIVE STATE SETUP:
- currentLocation: Where the protagonist is at the END of this opening scene
- threatsAdded: Any dangers that exist from the start (THREAT_ID: description)
- constraintsAdded: Any limitations from the start (CONSTRAINT_ID: description)
- threadsAdded: Mysteries or hooks introduced (THREAD_ID: description)
- Leave removed arrays empty (nothing to remove on first page)`;
```

### Opening-Specific Guidance

Add guidance specific to openings:

```typescript
const OPENING_STATE_GUIDANCE = `OPENING PAGE STATE:
Since this is the first page:
- threatsRemoved, constraintsRemoved, threadsResolved should all be EMPTY
- You are ESTABLISHING the initial state, not modifying previous state
- currentLocation should be set to wherever the scene ends

Good opening state example:
{
  "currentLocation": "Village marketplace at midday",
  "threatsAdded": [],
  "constraintsAdded": ["CONSTRAINT_DEADLINE: Must deliver the package by nightfall"],
  "threadsAdded": ["THREAD_PACKAGE: The package's contents are unknown"],
  ...
}`;
```

---

## Acceptance Criteria

### Tests That Must Pass

Update/create `test/unit/llm/prompts/opening-prompt.test.ts`:

```typescript
describe('buildOpeningPrompt with active state', () => {
  it('includes currentLocation instruction', () => {
    const context: OpeningContext = {
      characterConcept: 'A traveling merchant',
      worldbuilding: 'Medieval fantasy',
      tone: 'Adventure',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('currentLocation');
  });

  it('includes threat/constraint/thread instructions', () => {
    const context: OpeningContext = {
      characterConcept: 'A detective',
      worldbuilding: 'Modern noir',
      tone: 'Mystery thriller',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('threatsAdded');
    expect(userMessage).toContain('constraintsAdded');
    expect(userMessage).toContain('threadsAdded');
  });

  it('instructs to leave removal arrays empty', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('threatsRemoved');
    expect(userMessage).toContain('EMPTY');
  });

  it('does not mention old stateChanges format', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).not.toContain('stateChangesAdded');
    expect(userMessage).not.toContain('stateChangesRemoved');
  });

  it('provides opening-specific example', () => {
    const context: OpeningContext = {
      characterConcept: 'Test',
      worldbuilding: 'Test',
      tone: 'Test',
    };

    const messages = buildOpeningPrompt(context);
    const content = messages.map(m => m.content).join('\n');

    // Should have an example showing opening state
    expect(content).toMatch(/"currentLocation":/);
    expect(content).toMatch(/"threadsAdded":/);
  });
});
```

### Invariants That Must Remain True

1. **Opening Has No Removals**: Removal arrays instructed to be empty
2. **Location Required**: Opening must establish initial location
3. **No Old Format**: No mentions of `stateChangesAdded/Removed`
4. **Prefix Format**: Uses same THREAT_/CONSTRAINT_/THREAD_ format
5. **Other Fields Unchanged**: Canon, inventory, health unchanged

---

## Definition of Done

- [ ] Opening prompt includes active state instructions
- [ ] Removal arrays instructed to be empty for first page
- [ ] Opening-specific state guidance included
- [ ] Old state format references removed
- [ ] All opening prompt tests pass
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

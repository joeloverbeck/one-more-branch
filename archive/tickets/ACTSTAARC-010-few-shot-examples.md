# ACTSTAARC-010: Update Few-Shot Examples for Active State

**Status**: ✅ COMPLETED
**Priority**: MEDIUM
**Depends On**: ACTSTAARC-008
**Estimated Scope**: Medium

---

## Summary

Update the few-shot examples used in prompts to demonstrate the new active state output format with prefix tags, replacing the old `stateChangesAdded/Removed` format.

---

## Files to Touch

### Modify
- `src/llm/few-shot-data.ts` - Example data (if exists)
- `src/llm/examples.ts` - Example builders
- `src/llm/few-shot-builder.ts` - Few-shot example builder

---

## Out of Scope (DO NOT CHANGE)

- `src/llm/prompts/**` - Prompt changes in other tickets
- `src/llm/schemas/**` - Schema changes in ACTSTAARC-005
- `src/engine/**` - Engine unchanged by this ticket
- Test mocks/fixtures - Updated in ACTSTAARC-013

---

## Implementation Details

### Old Example Format (REMOVE)

```typescript
// OLD - Remove this format
{
  stateChangesAdded: [
    "Fire is spreading through the building",
    "Guards are now aware of your presence"
  ],
  stateChangesRemoved: [
    "Fire extinguished"
  ]
}
```

### New Example Format (ADD)

```typescript
// NEW - Use this format
{
  currentLocation: "Smoke-filled corridor near the east wing",
  threatsAdded: [
    "THREAT_FIRE: Fire is spreading through the east wing",
    "THREAT_GUARDS: Guards are actively searching for intruders"
  ],
  threatsRemoved: [],
  constraintsAdded: [
    "CONSTRAINT_SMOKE: Thick smoke limits visibility to 10 feet"
  ],
  constraintsRemoved: [],
  threadsAdded: [
    "THREAD_ALARM: Someone triggered the alarm - who?"
  ],
  threadsResolved: []
}
```

### Continuation Example

```typescript
const CONTINUATION_EXAMPLE = {
  narrative: `You press yourself against the cold metal wall as the footsteps grow closer...`,
  choices: [
    "Slip through the ventilation shaft",
    "Wait for the guards to pass",
    "Create a distraction"
  ],
  currentLocation: "Maintenance corridor B-7",
  threatsAdded: [
    "THREAT_PATROL: Guard patrol passing nearby"
  ],
  threatsRemoved: [
    "THREAT_DOG"  // Dog was dealt with in previous scene
  ],
  constraintsAdded: [],
  constraintsRemoved: [
    "CONSTRAINT_LOCKED_DOOR"  // Door is now unlocked
  ],
  threadsAdded: [],
  threadsResolved: [
    "THREAD_KEYCARD"  // Found the keycard
  ],
  inventoryAdded: ["Security keycard (Level 2)"],
  inventoryRemoved: ["Lockpick (broken)"],
  healthAdded: [],
  healthRemoved: [],
  // ... other fields
};
```

### Opening Example

```typescript
const OPENING_EXAMPLE = {
  narrative: `The town of Millbrook lay quiet under a blanket of fresh snow...`,
  choices: [
    "Approach the tavern",
    "Head to the town square",
    "Follow the mysterious tracks"
  ],
  currentLocation: "Edge of Millbrook, near the old bridge",
  threatsAdded: [],
  threatsRemoved: [],
  constraintsAdded: [
    "CONSTRAINT_COLD: The bitter cold demands warm shelter soon"
  ],
  constraintsRemoved: [],
  threadsAdded: [
    "THREAD_LETTER: The letter mentions a contact in town",
    "THREAD_TRACKS: Fresh tracks lead into the forest"
  ],
  threadsResolved: [],
  // ... other fields
};
```

### Example Showing Threat Resolution

```typescript
const THREAT_RESOLUTION_EXAMPLE = {
  narrative: `With a final swing of your torch, you drive the creature back into the shadows...`,
  choices: [
    "Continue deeper into the cave",
    "Rest and tend to your wounds",
    "Search the creature's lair"
  ],
  currentLocation: "Cave interior - creature's former lair",
  threatsAdded: [],
  threatsRemoved: [
    "THREAT_CREATURE"  // Creature driven off
  ],
  constraintsAdded: [
    "CONSTRAINT_WOUNDED: Your arm is badly scratched"
  ],
  constraintsRemoved: [],
  threadsAdded: [
    "THREAD_CREATURE_ORIGIN: Where did this creature come from?"
  ],
  threadsResolved: [],
  // ...
};
```

---

## Acceptance Criteria

### Tests That Must Pass

Update/create `test/unit/llm/examples.test.ts`:

```typescript
describe('few-shot examples', () => {
  describe('continuation examples', () => {
    it('uses new active state format', () => {
      const examples = getContinuationExamples('minimal');

      examples.forEach(example => {
        // New fields present
        expect(example).toHaveProperty('currentLocation');
        expect(example).toHaveProperty('threatsAdded');
        expect(example).toHaveProperty('threatsRemoved');
        expect(example).toHaveProperty('constraintsAdded');
        expect(example).toHaveProperty('constraintsRemoved');
        expect(example).toHaveProperty('threadsAdded');
        expect(example).toHaveProperty('threadsResolved');

        // Old fields absent
        expect(example).not.toHaveProperty('stateChangesAdded');
        expect(example).not.toHaveProperty('stateChangesRemoved');
      });
    });

    it('threat additions use prefix format', () => {
      const examples = getContinuationExamples('standard');
      const examplesWithThreats = examples.filter(e => e.threatsAdded.length > 0);

      examplesWithThreats.forEach(example => {
        example.threatsAdded.forEach((threat: string) => {
          expect(threat).toMatch(/^THREAT_\w+:/);
        });
      });
    });

    it('threat removals use prefix-only format', () => {
      const examples = getContinuationExamples('standard');
      const examplesWithRemovals = examples.filter(e => e.threatsRemoved.length > 0);

      examplesWithRemovals.forEach(example => {
        example.threatsRemoved.forEach((removal: string) => {
          expect(removal).toMatch(/^THREAT_\w+$/);
          expect(removal).not.toContain(':');
        });
      });
    });

    it('constraint format is correct', () => {
      const examples = getContinuationExamples('standard');

      examples.forEach(example => {
        example.constraintsAdded.forEach((constraint: string) => {
          expect(constraint).toMatch(/^CONSTRAINT_\w+:/);
        });
        example.constraintsRemoved.forEach((removal: string) => {
          expect(removal).toMatch(/^CONSTRAINT_\w+$/);
        });
      });
    });

    it('thread format is correct', () => {
      const examples = getContinuationExamples('standard');

      examples.forEach(example => {
        example.threadsAdded.forEach((thread: string) => {
          expect(thread).toMatch(/^THREAD_\w+:/);
        });
        example.threadsResolved.forEach((resolved: string) => {
          expect(resolved).toMatch(/^THREAD_\w+$/);
        });
      });
    });
  });

  describe('opening examples', () => {
    it('uses new active state format', () => {
      const examples = getOpeningExamples('minimal');

      examples.forEach(example => {
        expect(example).toHaveProperty('currentLocation');
        expect(example).toHaveProperty('threatsAdded');
        expect(example).not.toHaveProperty('stateChangesAdded');
      });
    });
  });
});
```

### Invariants That Must Remain True

1. **No Old Format**: No examples use `stateChangesAdded/Removed`
2. **Consistent Prefixes**: All additions have `CATEGORY_ID:` format
3. **Removal Prefix-Only**: All removals use prefix without colon
4. **Valid Categories**: Only `THREAT_`, `CONSTRAINT_`, `THREAD_` prefixes
5. **Example Variety**: Examples cover additions, removals, and mixed operations
6. **Location Always Present**: `currentLocation` included in all examples

---

## Definition of Done

- [x] All continuation examples updated to new format
- [x] All opening examples updated to new format
- [x] Examples demonstrate threat resolution (removal)
- [x] Examples demonstrate constraint changes
- [x] Examples demonstrate thread resolution
- [x] All example tests pass
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes

---

## Outcome

**Completion Date**: 2026-02-08

### What Was Changed

1. **src/llm/few-shot-data.ts**:
   - Updated `OPENING_EXAMPLE_RESPONSE` with:
     - `currentLocation`: "Advanced Transmutation lecture hall, back row"
     - `threatsAdded`: ["THREAT_GRIMWALD_SUSPICION: Professor Grimwald is watching you closely"]
     - `constraintsAdded`: ["CONSTRAINT_CLASS_IN_SESSION: You are in the middle of a lecture"]
     - `threadsAdded`: ["THREAD_FORBIDDEN_LIBRARY: ...", "THREAD_JOURNAL_ORIGIN: ..."]
   - Updated `CONTINUATION_EXAMPLE_RESPONSE` with:
     - `currentLocation`: "East wing corridor, beside the statue of Archmagus Caelan"
     - `threatsAdded`: ["THREAT_FACULTY_APPROACHING: A senior faculty member is approaching"]
     - `constraintsAdded`: ["CONSTRAINT_RESTRICTED_AREA: You are trespassing in the restricted east wing"]
     - `constraintsRemoved`: ["CONSTRAINT_CLASS_IN_SESSION"]
     - `threadsAdded`: ["THREAD_STATUE_MECHANISM: The third rune may open a hidden passage"]
   - Updated `ENDING_EXAMPLE_RESPONSE` with:
     - `currentLocation`: "Academy entrance hall, reunited with Professor Grimwald"
     - `threatsRemoved`: ["THREAT_GRIMWALD_SUSPICION", "THREAT_FACULTY_APPROACHING"]
     - `constraintsRemoved`: ["CONSTRAINT_RESTRICTED_AREA"]
     - `threadsResolved`: ["THREAD_FORBIDDEN_LIBRARY", "THREAD_JOURNAL_ORIGIN"]
   - Removed all `stateChangesAdded/stateChangesRemoved` fields from all examples

2. **test/unit/llm/examples.test.ts**:
   - Updated interface definitions to include new active state fields
   - Renamed describe block from 'state change format' to 'active state format'
   - Added tests for THREAT_, CONSTRAINT_, THREAD_ prefix formats
   - Added tests verifying additions use `CATEGORY_ID: description` format
   - Added tests verifying removals use `CATEGORY_ID` prefix-only format (no colon)
   - Added tests verifying legacy fields are absent

3. **test/integration/llm/few-shot-examples.test.ts**:
   - Updated "Example data integrity" tests to check for new active state fields
   - Added assertions that legacy stateChangesAdded/Removed fields are NOT present

### Deviations from Original Plan

None. Implementation followed the ticket specification exactly.

### Verification Results

- `npm run typecheck`: ✅ Passed
- `npm test`: ✅ Passed (1375 tests)
- All active state format tests: ✅ Passing
- Prefix format validation: ✅ Correct for all categories

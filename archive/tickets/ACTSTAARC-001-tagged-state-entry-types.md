# ACTSTAARC-001: Define TaggedStateEntry Type and Prefix Parser

**Status**: ✅ COMPLETED
**Priority**: HIGH (blocking other tickets)
**Estimated Scope**: Small

---

## Summary

Create the foundational types and parsing functions for the new prefix-tagged state entry system. This replaces the event-log string entries with structured `TaggedStateEntry` objects that enable reliable prefix-based matching for additions and removals.

## Assumption Reassessment

1. Unit test layout in this repository does not currently use `test/unit/models/state/` for state tests. Existing state unit coverage is centralized in `test/unit/models/state.test.ts`.
2. Model-layer warnings are emitted via `modelWarn` (`src/models/model-logger.ts`), not direct console output. Parser validation tests should follow that pattern when asserting warnings.

---

## Files to Touch

### Create
- `src/models/state/tagged-entry.ts` - New file with types and parser functions

### Modify
- `src/models/state/index.ts` - Export new types and functions
- `test/unit/models/state.test.ts` - Add parser and removal-prefix unit tests

---

## Out of Scope (DO NOT CHANGE)

- `src/models/state/general-state.ts` - Old state types (will be deprecated in separate ticket)
- `src/models/state/inventory.ts` - Not affected by this change
- `src/models/state/health.ts` - Not affected by this change
- `src/models/state/character-state.ts` - Not affected by this change
- `src/models/page.ts` - Changed in separate ticket
- Any prompt files - Changed in separate ticket
- Any engine files - Changed in separate ticket

---

## Implementation Details

### TaggedStateEntry Type

```typescript
export interface TaggedStateEntry {
  readonly prefix: string;       // e.g., "THREAT_FIRE"
  readonly description: string;  // e.g., "Fire spreading from the east"
  readonly raw: string;          // Original string: "THREAT_FIRE: Fire spreading from the east"
}
```

### Category Constants

```typescript
export const VALID_CATEGORIES = ['THREAT', 'CONSTRAINT', 'THREAD'] as const;
export type StateCategory = typeof VALID_CATEGORIES[number];
```

### parseTaggedEntry Function

Parses a raw string like `"THREAT_FIRE: Fire spreading"` into a `TaggedStateEntry`.

**Rules**:
1. Must contain a colon separator
2. Prefix must start with a valid category (`THREAT_`, `CONSTRAINT_`, `THREAD_`)
3. Trim whitespace from prefix and description
4. Return `null` for invalid entries (log warning)

### isValidRemovalPrefix Function

Validates that a string is a valid removal prefix (e.g., `"THREAT_FIRE"`).

**Rules**:
1. Must NOT contain a colon
2. Must start with a valid category followed by underscore
3. Must have characters after the category prefix
4. Return `false` for invalid prefixes

### extractPrefixFromRemoval Function

Helper to extract prefix from a removal string, handling edge cases where LLM includes description.

---

## Acceptance Criteria

### Tests That Must Pass

Add coverage to `test/unit/models/state.test.ts`:

```typescript
describe('parseTaggedEntry', () => {
  it('parses valid THREAT entry', () => {
    const result = parseTaggedEntry('THREAT_ENTITIES: Multiple entities tracking');
    expect(result).toEqual({
      prefix: 'THREAT_ENTITIES',
      description: 'Multiple entities tracking',
      raw: 'THREAT_ENTITIES: Multiple entities tracking',
    });
  });

  it('parses valid CONSTRAINT entry', () => {
    const result = parseTaggedEntry('CONSTRAINT_BETTY_BREATHING: Breathing fragile');
    expect(result?.prefix).toBe('CONSTRAINT_BETTY_BREATHING');
  });

  it('parses valid THREAD entry', () => {
    const result = parseTaggedEntry('THREAD_GRAFFITI: Meaning unknown');
    expect(result?.prefix).toBe('THREAD_GRAFFITI');
  });

  it('returns null for entry without colon', () => {
    expect(parseTaggedEntry('THREAT_FIRE Fire spreading')).toBeNull();
  });

  it('returns null for invalid category', () => {
    expect(parseTaggedEntry('DANGER_FIRE: Fire spreading')).toBeNull();
  });

  it('handles extra whitespace', () => {
    const result = parseTaggedEntry('  THREAT_FIRE:   Fire spreading  ');
    expect(result?.prefix).toBe('THREAT_FIRE');
    expect(result?.description).toBe('Fire spreading');
  });

  it('handles empty description', () => {
    const result = parseTaggedEntry('THREAT_FIRE:');
    expect(result?.prefix).toBe('THREAT_FIRE');
    expect(result?.description).toBe('');
  });

  it('handles description with colons', () => {
    const result = parseTaggedEntry('THREAD_TIME: Clock reads 3:45 PM');
    expect(result?.description).toBe('Clock reads 3:45 PM');
  });
});

describe('isValidRemovalPrefix', () => {
  it('accepts valid THREAT prefix', () => {
    expect(isValidRemovalPrefix('THREAT_ENTITIES')).toBe(true);
  });

  it('accepts valid CONSTRAINT prefix', () => {
    expect(isValidRemovalPrefix('CONSTRAINT_TIME_LIMIT')).toBe(true);
  });

  it('accepts valid THREAD prefix', () => {
    expect(isValidRemovalPrefix('THREAD_MYSTERY_BOX')).toBe(true);
  });

  it('rejects prefix with description', () => {
    expect(isValidRemovalPrefix('THREAT_FIRE: Fire spreading')).toBe(false);
  });

  it('rejects invalid category', () => {
    expect(isValidRemovalPrefix('DANGER_FIRE')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidRemovalPrefix('')).toBe(false);
  });

  it('rejects category without identifier', () => {
    expect(isValidRemovalPrefix('THREAT_')).toBe(false);
  });

  it('rejects just category name', () => {
    expect(isValidRemovalPrefix('THREAT')).toBe(false);
  });
});
```

### Invariants That Must Remain True

1. **Immutability**: All returned `TaggedStateEntry` objects must be readonly
2. **No Side Effects**: Parsing functions are pure - same input always produces same output
3. **Graceful Degradation**: Invalid entries return `null` instead of throwing
4. **Existing Code Unaffected**: No changes to existing state types in this ticket
5. **Type Safety**: All exports must be properly typed with no `any`

---

## Definition of Done

- [x] `src/models/state/tagged-entry.ts` created with all types and functions
- [x] `src/models/state/index.ts` exports new module
- [x] Tagged-entry parser/removal tests pass in `test/unit/models/state.test.ts`
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] No console.log statements in production code

---

## Outcome

- **Completed**: 2026-02-08
- **What changed**:
  - Added `TaggedStateEntry` support in `src/models/state/tagged-entry.ts` with `VALID_CATEGORIES`, `StateCategory`, `parseTaggedEntry`, `isValidRemovalPrefix`, and `extractPrefixFromRemoval`.
  - Exported the new tagged-entry module from `src/models/state/index.ts`.
  - Added parser/removal-prefix unit coverage to `test/unit/models/state.test.ts`, including warning-path assertions through `modelWarn` test logger wiring.
- **Deviation from original plan**:
  - Tests were added to existing `test/unit/models/state.test.ts` rather than creating `test/unit/models/state/tagged-entry.test.ts`, matching current repository test organization.
- **Verification**:
  - `npm run test:unit -- --testPathPattern=test/unit/models/state.test.ts`
  - `npm run typecheck`
  - `npm run lint`

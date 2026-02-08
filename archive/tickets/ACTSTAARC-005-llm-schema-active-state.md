# ACTSTAARC-005: Update LLM Response Schema for Active State

**Status**: PENDING
**Priority**: HIGH (blocking prompt changes)
**Depends On**: ACTSTAARC-001, ACTSTAARC-002
**Estimated Scope**: Medium

---

## Summary

Update the JSON schema used for LLM responses to include the new active state fields: `currentLocation`, `threatsAdded`, `threatsRemoved`, `constraintsAdded`, `constraintsRemoved`, `threadsAdded`, `threadsResolved`. Remove the old `stateChangesAdded` and `stateChangesRemoved` fields from the schema.

---

## Files to Touch

### Modify
- `src/llm/schemas/validation-schema.ts` - Update response validation schema
- `src/llm/schemas/response-transformer.ts` - Update transformer to map new fields
- `src/llm/types.ts` - Update GenerationResult interface

---

## Out of Scope (DO NOT CHANGE)

- `src/llm/schemas/structure-schema.ts` - Structure generation unaffected
- `src/llm/prompts/**` - Prompt changes in ACTSTAARC-007
- `src/models/**` - Model changes in other tickets
- `src/engine/**` - Engine changes in ACTSTAARC-008
- Error detection schemas

---

## Implementation Details

### GenerationResult Type Changes

Update `src/llm/types.ts`:

```typescript
export interface GenerationResult {
  narrative: string;
  choices: string[];

  // Remove these:
  // stateChangesAdded: string[];
  // stateChangesRemoved: string[];

  // Add these:
  currentLocation: string;
  threatsAdded: string[];
  threatsRemoved: string[];
  constraintsAdded: string[];
  constraintsRemoved: string[];
  threadsAdded: string[];
  threadsResolved: string[];

  // Keep unchanged:
  newCanonFacts: string[];
  newCharacterCanonFacts: Record<string, string[]>;
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
  characterStateChangesRemoved: Array<{ characterName: string; states: string[] }>;
  protagonistAffect: ProtagonistAffect;
  isEnding: boolean;
  beatConcluded: boolean;
  beatResolution: string;
  rawResponse: string;
}
```

### Schema Definition Changes

Update `src/llm/schemas/validation-schema.ts`:

```typescript
// Add new properties
currentLocation: {
  type: 'string',
  description: 'Where the protagonist is at the END of this scene',
},
threatsAdded: {
  type: 'array',
  items: { type: 'string' },
  description: 'New threats in format "THREAT_ID: description"',
},
threatsRemoved: {
  type: 'array',
  items: { type: 'string' },
  description: 'Resolved threats by prefix only (e.g., "THREAT_FIRE")',
},
constraintsAdded: {
  type: 'array',
  items: { type: 'string' },
  description: 'New constraints in format "CONSTRAINT_ID: description"',
},
constraintsRemoved: {
  type: 'array',
  items: { type: 'string' },
  description: 'Removed constraints by prefix only',
},
threadsAdded: {
  type: 'array',
  items: { type: 'string' },
  description: 'New narrative threads in format "THREAD_ID: description"',
},
threadsResolved: {
  type: 'array',
  items: { type: 'string' },
  description: 'Resolved threads by prefix only',
},

// Remove old properties:
// stateChangesAdded - removed
// stateChangesRemoved - removed
```

### Response Transformer Changes

Update `src/llm/schemas/response-transformer.ts`:

```typescript
export function transformLLMResponse(raw: unknown): GenerationResult {
  // ... validation ...

  return {
    narrative: validated.narrative,
    choices: validated.choices,

    // New active state fields
    currentLocation: validated.currentLocation ?? '',
    threatsAdded: validated.threatsAdded ?? [],
    threatsRemoved: validated.threatsRemoved ?? [],
    constraintsAdded: validated.constraintsAdded ?? [],
    constraintsRemoved: validated.constraintsRemoved ?? [],
    threadsAdded: validated.threadsAdded ?? [],
    threadsResolved: validated.threadsResolved ?? [],

    // Other fields unchanged
    newCanonFacts: validated.newCanonFacts ?? [],
    // ...
  };
}
```

---

## Acceptance Criteria

### Tests That Must Pass

Update/create `test/unit/llm/schemas/validation-schema.test.ts`:

```typescript
describe('LLM response schema', () => {
  describe('active state fields', () => {
    it('accepts valid currentLocation', () => {
      const response = createValidResponse({
        currentLocation: 'Dark corridor with water-stained tiles',
      });
      expect(() => validateResponse(response)).not.toThrow();
    });

    it('accepts empty currentLocation', () => {
      const response = createValidResponse({
        currentLocation: '',
      });
      expect(() => validateResponse(response)).not.toThrow();
    });

    it('accepts valid threatsAdded array', () => {
      const response = createValidResponse({
        threatsAdded: ['THREAT_FIRE: Fire spreading from east wing'],
      });
      const result = validateResponse(response);
      expect(result.threatsAdded).toEqual(['THREAT_FIRE: Fire spreading from east wing']);
    });

    it('accepts valid threatsRemoved array', () => {
      const response = createValidResponse({
        threatsRemoved: ['THREAT_FIRE'],
      });
      const result = validateResponse(response);
      expect(result.threatsRemoved).toEqual(['THREAT_FIRE']);
    });

    it('accepts valid constraintsAdded array', () => {
      const response = createValidResponse({
        constraintsAdded: ['CONSTRAINT_TIME: Only 5 minutes remaining'],
      });
      const result = validateResponse(response);
      expect(result.constraintsAdded).toHaveLength(1);
    });

    it('accepts valid threadsAdded array', () => {
      const response = createValidResponse({
        threadsAdded: ['THREAD_LETTER: Contents of letter unknown'],
      });
      const result = validateResponse(response);
      expect(result.threadsAdded).toHaveLength(1);
    });

    it('defaults missing arrays to empty', () => {
      const response = createValidResponse({});
      const result = validateResponse(response);
      expect(result.threatsAdded).toEqual([]);
      expect(result.threatsRemoved).toEqual([]);
      expect(result.constraintsAdded).toEqual([]);
      expect(result.constraintsRemoved).toEqual([]);
      expect(result.threadsAdded).toEqual([]);
      expect(result.threadsResolved).toEqual([]);
    });
  });

  describe('removed old fields', () => {
    it('does not include stateChangesAdded in result', () => {
      const response = createValidResponse({});
      const result = validateResponse(response);
      expect((result as any).stateChangesAdded).toBeUndefined();
    });

    it('does not include stateChangesRemoved in result', () => {
      const response = createValidResponse({});
      const result = validateResponse(response);
      expect((result as any).stateChangesRemoved).toBeUndefined();
    });
  });
});
```

Update `test/unit/llm/schemas/response-transformer.test.ts`:

```typescript
describe('transformLLMResponse', () => {
  it('transforms currentLocation', () => {
    const raw = {
      narrative: 'Test',
      choices: ['A', 'B'],
      currentLocation: 'Cave entrance',
      // ... required fields ...
    };
    const result = transformLLMResponse(raw);
    expect(result.currentLocation).toBe('Cave entrance');
  });

  it('transforms threat arrays', () => {
    const raw = {
      narrative: 'Test',
      choices: ['A', 'B'],
      threatsAdded: ['THREAT_X: X'],
      threatsRemoved: ['THREAT_Y'],
      // ... required fields ...
    };
    const result = transformLLMResponse(raw);
    expect(result.threatsAdded).toEqual(['THREAT_X: X']);
    expect(result.threatsRemoved).toEqual(['THREAT_Y']);
  });

  it('defaults missing active state to empty', () => {
    const raw = {
      narrative: 'Test',
      choices: ['A', 'B'],
      // ... minimal required fields ...
    };
    const result = transformLLMResponse(raw);
    expect(result.currentLocation).toBe('');
    expect(result.threatsAdded).toEqual([]);
  });
});
```

### Invariants That Must Remain True

1. **No Old Fields**: `stateChangesAdded` and `stateChangesRemoved` removed from types
2. **All Arrays Default Empty**: Missing arrays default to `[]`, not undefined
3. **Location Defaults Empty**: Missing `currentLocation` defaults to `''`
4. **Other Fields Unchanged**: Canon, inventory, health, character state unchanged
5. **Existing Schemas Valid**: Structure and error detection schemas unaffected

---

## Definition of Done

- [ ] `GenerationResult` interface updated with new fields
- [ ] Old state fields removed from `GenerationResult`
- [ ] JSON schema updated with new field definitions
- [ ] Response transformer maps new fields correctly
- [ ] All schema tests pass
- [ ] All transformer tests pass
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

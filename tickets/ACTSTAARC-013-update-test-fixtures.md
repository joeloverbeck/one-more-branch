# ACTSTAARC-013: Update Test Fixtures and Mocks

**Status**: PENDING
**Priority**: MEDIUM
**Depends On**: ACTSTAARC-004, ACTSTAARC-005, ACTSTAARC-006
**Estimated Scope**: Medium

---

## Summary

Update all test fixtures, mock factories, and helper functions across the test suite to include the new active state fields. This ensures all existing tests continue to work with the new data structures.

---

## Files to Touch

### Modify
- `test/fixtures/pages.ts` - Page fixtures (if exists)
- `test/fixtures/stories.ts` - Story fixtures (if exists)
- `test/fixtures/generation-results.ts` - LLM result fixtures (if exists)
- `test/helpers/mock-factories.ts` - Mock factory functions (if exists)
- `test/helpers/context-builders.ts` - Context builders for prompts (if exists)

### Create (if not exist)
- `test/fixtures/active-state.ts` - Active state specific fixtures

---

## Out of Scope (DO NOT CHANGE)

- Production source code - Changes in other tickets
- Test logic/assertions - Only update data structures
- Test file organization - Keep existing structure

---

## Implementation Details

### Page Fixture Updates

```typescript
// test/fixtures/pages.ts

import { createEmptyActiveState, createEmptyActiveStateChanges } from '../../src/models/state';

export function createMockPage(overrides: Partial<Page> = {}): Page {
  return {
    id: 1,
    narrativeText: 'Default narrative text',
    choices: [
      { text: 'Choice A', nextPageId: null },
      { text: 'Choice B', nextPageId: null },
    ],
    stateChanges: { added: [], removed: [] },
    accumulatedState: { changes: [] },

    // NEW: Active state fields
    activeStateChanges: createEmptyActiveStateChanges(),
    accumulatedActiveState: createEmptyActiveState(),

    inventoryChanges: { added: [], removed: [] },
    accumulatedInventory: [],
    healthChanges: { added: [], removed: [] },
    accumulatedHealth: [],
    characterStateChanges: { added: [], removed: [] },
    accumulatedCharacterState: {},
    accumulatedStructureState: {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [],
    },
    protagonistAffect: createDefaultProtagonistAffect(),
    structureVersionId: null,
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,

    ...overrides,
  };
}
```

### Generation Result Fixture Updates

```typescript
// test/fixtures/generation-results.ts

export function createMockGenerationResult(overrides: Partial<GenerationResult> = {}): GenerationResult {
  return {
    narrative: 'Generated narrative text',
    choices: ['Choice 1', 'Choice 2', 'Choice 3'],

    // NEW: Active state fields (replace old stateChanges)
    currentLocation: '',
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],

    newCanonFacts: [],
    newCharacterCanonFacts: {},
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: createDefaultProtagonistAffect(),
    isEnding: false,
    beatConcluded: false,
    beatResolution: '',
    rawResponse: '{}',

    ...overrides,
  };
}
```

### Context Fixture Updates

```typescript
// test/fixtures/contexts.ts

export function createMockContinuationContext(
  overrides: Partial<ContinuationContext> = {}
): ContinuationContext {
  return {
    characterConcept: 'A brave adventurer',
    worldbuilding: 'Fantasy medieval world',
    tone: 'Epic adventure',
    globalCanon: [],
    globalCharacterCanon: {},
    storyArc: null,
    previousNarrative: 'Previous scene narrative...',
    selectedChoice: 'Go forward',
    accumulatedState: [],  // OLD, kept for compat
    accumulatedInventory: [],
    accumulatedHealth: [],
    accumulatedCharacterState: {},

    // NEW: Active state
    activeState: createEmptyActiveState(),

    // NEW: Grandparent narrative
    grandparentNarrative: null,

    ...overrides,
  };
}
```

### Active State Fixtures

```typescript
// test/fixtures/active-state.ts

import {
  ActiveState,
  ActiveStateChanges,
  TaggedStateEntry,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
} from '../../src/models/state';

export function createMockTaggedEntry(
  category: 'THREAT' | 'CONSTRAINT' | 'THREAD',
  id: string,
  description: string
): TaggedStateEntry {
  const prefix = `${category}_${id}`;
  return {
    prefix,
    description,
    raw: `${prefix}: ${description}`,
  };
}

export function createMockActiveState(overrides: Partial<ActiveState> = {}): ActiveState {
  return {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
    ...overrides,
  };
}

export function createMockActiveStateChanges(
  overrides: Partial<ActiveStateChanges> = {}
): ActiveStateChanges {
  return {
    newLocation: null,
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
    ...overrides,
  };
}

// Common fixture scenarios
export const FIXTURES = {
  emptyActiveState: createEmptyActiveState(),
  emptyActiveStateChanges: createEmptyActiveStateChanges(),

  stateWithThreat: {
    currentLocation: 'Dark corridor',
    activeThreats: [createMockTaggedEntry('THREAT', 'FIRE', 'Fire spreading')],
    activeConstraints: [],
    openThreads: [],
  },

  stateWithConstraint: {
    currentLocation: 'Library',
    activeThreats: [],
    activeConstraints: [createMockTaggedEntry('CONSTRAINT', 'QUIET', 'Must stay quiet')],
    openThreads: [],
  },

  stateWithThread: {
    currentLocation: 'Town square',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [createMockTaggedEntry('THREAD', 'LETTER', 'Letter contents unknown')],
  },

  fullState: {
    currentLocation: 'Cave entrance',
    activeThreats: [
      createMockTaggedEntry('THREAT', 'WOLVES', 'Wolves nearby'),
      createMockTaggedEntry('THREAT', 'STORM', 'Storm approaching'),
    ],
    activeConstraints: [
      createMockTaggedEntry('CONSTRAINT', 'INJURED', 'Injured leg'),
    ],
    openThreads: [
      createMockTaggedEntry('THREAD', 'MAP', 'Map destination unknown'),
    ],
  },
};
```

### Helper Function Updates

Update any test helper that creates pages, contexts, or generation results:

```typescript
// test/helpers/page-helpers.ts

export async function createTestPage(
  storyId: string,
  pageNumber: number,
  options: {
    activeState?: Partial<ActiveStateChanges>;
    parentActiveState?: ActiveState;
    // ... other options
  } = {}
): Promise<Page> {
  return createPage({
    id: pageNumber,
    narrativeText: `Test narrative for page ${pageNumber}`,
    choices: [
      { text: 'Choice A', nextPageId: null },
      { text: 'Choice B', nextPageId: null },
    ],
    isEnding: false,
    parentPageId: pageNumber === 1 ? null : pageNumber - 1,
    parentChoiceIndex: pageNumber === 1 ? null : 0,
    activeStateChanges: {
      ...createEmptyActiveStateChanges(),
      ...options.activeState,
    },
    parentAccumulatedActiveState: options.parentActiveState,
  });
}
```

---

## Acceptance Criteria

### Tests That Must Pass

All existing tests must pass after fixture updates:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Specific Fixture Tests

Create `test/fixtures/active-state.test.ts`:

```typescript
describe('Active state fixtures', () => {
  describe('createMockTaggedEntry', () => {
    it('creates valid THREAT entry', () => {
      const entry = createMockTaggedEntry('THREAT', 'FIRE', 'Fire spreading');
      expect(entry.prefix).toBe('THREAT_FIRE');
      expect(entry.description).toBe('Fire spreading');
      expect(entry.raw).toBe('THREAT_FIRE: Fire spreading');
    });

    it('creates valid CONSTRAINT entry', () => {
      const entry = createMockTaggedEntry('CONSTRAINT', 'TIME', 'Limited time');
      expect(entry.prefix).toBe('CONSTRAINT_TIME');
    });

    it('creates valid THREAD entry', () => {
      const entry = createMockTaggedEntry('THREAD', 'MYSTERY', 'Unknown origin');
      expect(entry.prefix).toBe('THREAD_MYSTERY');
    });
  });

  describe('createMockActiveState', () => {
    it('creates empty state by default', () => {
      const state = createMockActiveState();
      expect(state.currentLocation).toBe('');
      expect(state.activeThreats).toEqual([]);
    });

    it('allows overrides', () => {
      const state = createMockActiveState({
        currentLocation: 'Test Location',
      });
      expect(state.currentLocation).toBe('Test Location');
    });
  });

  describe('FIXTURES', () => {
    it('provides valid empty state', () => {
      expect(isActiveState(FIXTURES.emptyActiveState)).toBe(true);
    });

    it('provides valid full state', () => {
      expect(isActiveState(FIXTURES.fullState)).toBe(true);
      expect(FIXTURES.fullState.activeThreats).toHaveLength(2);
    });
  });
});
```

### Invariants That Must Remain True

1. **All Existing Tests Pass**: No regressions in test suite
2. **Consistent Fixtures**: All fixture factories produce valid data
3. **Type Safety**: All fixtures are properly typed
4. **Default Values**: Missing overrides use sensible defaults
5. **Backward Compatibility**: Old fixture APIs still work (deprecated)

---

## Definition of Done

- [ ] `createMockPage` includes active state fields
- [ ] `createMockGenerationResult` uses new format
- [ ] `createMockContinuationContext` includes active state
- [ ] New active state fixture helpers created
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

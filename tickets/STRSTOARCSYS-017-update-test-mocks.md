# STRSTOARCSYS-017: Update Test Mocks

## Summary
Update all existing test mocks throughout the codebase to include the new structure-related fields and remove storyArc references. This ensures existing tests don't break when the implementation changes.

## Files to Touch
- `test/unit/engine/page-service.test.ts`
- `test/unit/engine/story-service.test.ts`
- `test/unit/llm/*.test.ts` (multiple files)
- `test/unit/persistence/*.test.ts` (multiple files)
- `test/fixtures/*.ts` (if any)
- Any other test files with mocks for Story, Page, or GenerationResult

## Out of Scope
- DO NOT modify source code
- DO NOT create new tests (other tickets handle that)
- DO NOT change test logic, only update mock data

## Implementation Details

### GenerationResult Mocks

All mocks for `GenerationResult` must:
- Remove `storyArc` field
- Add `beatConcluded: false` (or true for specific tests)
- Add `beatResolution: ''` (or actual resolution for specific tests)

```typescript
// BEFORE
const mockResult: GenerationResult = {
  narrative: 'Test narrative',
  choices: ['Choice 1', 'Choice 2'],
  stateChangesAdded: [],
  stateChangesRemoved: [],
  newCanonFacts: [],
  newCharacterCanonFacts: {},
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  isEnding: false,
  storyArc: 'Test arc',  // REMOVE
  rawResponse: '{}',
};

// AFTER
const mockResult: GenerationResult = {
  narrative: 'Test narrative',
  choices: ['Choice 1', 'Choice 2'],
  stateChangesAdded: [],
  stateChangesRemoved: [],
  newCanonFacts: [],
  newCharacterCanonFacts: {},
  inventoryAdded: [],
  inventoryRemoved: [],
  healthAdded: [],
  healthRemoved: [],
  characterStateChangesAdded: [],
  characterStateChangesRemoved: [],
  isEnding: false,
  beatConcluded: false,   // NEW
  beatResolution: '',     // NEW
  rawResponse: '{}',
};
```

### Story Mocks

All mocks for `Story` must:
- Remove `storyArc` field
- Add `structure: null` or valid `StoryStructure`

```typescript
// BEFORE
const mockStory: Story = {
  id: 'test-story-id' as StoryId,
  title: 'Test Story',
  characterConcept: 'A test character',
  worldbuilding: 'A test world',
  tone: 'test tone',
  globalCanon: [],
  globalCharacterCanon: {},
  storyArc: null,  // REMOVE
  createdAt: new Date(),
  updatedAt: new Date(),
};

// AFTER
const mockStory: Story = {
  id: 'test-story-id' as StoryId,
  title: 'Test Story',
  characterConcept: 'A test character',
  worldbuilding: 'A test world',
  tone: 'test tone',
  globalCanon: [],
  globalCharacterCanon: {},
  structure: null,  // NEW
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Page Mocks

All mocks for `Page` must:
- Add `accumulatedStructureState`

```typescript
// BEFORE
const mockPage: Page = {
  id: 1 as PageId,
  narrativeText: 'Test narrative',
  choices: [],
  stateChanges: { added: [], removed: [] },
  accumulatedState: { changes: [] },
  // ... other fields
  isEnding: true,
  parentPageId: null,
  parentChoiceIndex: null,
};

// AFTER
const mockPage: Page = {
  id: 1 as PageId,
  narrativeText: 'Test narrative',
  choices: [],
  stateChanges: { added: [], removed: [] },
  accumulatedState: { changes: [] },
  // ... other fields
  accumulatedStructureState: {  // NEW
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions: [],
  },
  isEnding: true,
  parentPageId: null,
  parentChoiceIndex: null,
};
```

### ContinuationContext Mocks

All mocks for `ContinuationContext` must:
- Remove `storyArc` field
- Add `structure` (optional)
- Add `accumulatedStructureState` (optional)

```typescript
// BEFORE
const mockContext: ContinuationContext = {
  characterConcept: 'Test',
  worldbuilding: 'Test',
  tone: 'test',
  globalCanon: [],
  globalCharacterCanon: {},
  storyArc: null,  // REMOVE
  previousNarrative: 'Test',
  selectedChoice: 'Choice',
  accumulatedState: [],
  accumulatedInventory: [],
  accumulatedHealth: [],
  accumulatedCharacterState: {},
};

// AFTER
const mockContext: ContinuationContext = {
  characterConcept: 'Test',
  worldbuilding: 'Test',
  tone: 'test',
  globalCanon: [],
  globalCharacterCanon: {},
  structure: undefined,                    // NEW (optional)
  accumulatedStructureState: undefined,    // NEW (optional)
  previousNarrative: 'Test',
  selectedChoice: 'Choice',
  accumulatedState: [],
  accumulatedInventory: [],
  accumulatedHealth: [],
  accumulatedCharacterState: {},
};
```

### Helper Function

Create a test helper for structure state:

```typescript
// test/helpers/structure-helpers.ts
export function createMockStructureState(
  actIndex = 0,
  beatIndex = 0,
): AccumulatedStructureState {
  return {
    currentActIndex: actIndex,
    currentBeatIndex: beatIndex,
    beatProgressions: [],
  };
}

export function createMockStructure(): StoryStructure {
  return {
    overallTheme: 'Test theme',
    acts: [/* 3 acts with beats */],
    generatedAt: new Date(),
  };
}
```

## Acceptance Criteria

### Tests That Must Pass

After updating mocks:
1. All existing unit tests pass (`npm run test:unit`)
2. All existing integration tests pass (`npm run test:integration`)
3. TypeScript compilation succeeds (`npm run typecheck`)

### Search Patterns to Find Affected Tests

```bash
# Find all files that reference storyArc
grep -r "storyArc" test/

# Find all files that create Story mocks
grep -r "Story" test/ | grep -E "(mock|Mock|fixture)"

# Find all files that create Page mocks
grep -r "Page" test/ | grep -E "(mock|Mock|fixture)"

# Find all files that create GenerationResult mocks
grep -r "GenerationResult" test/
```

### Invariants That Must Remain True
- All test assertions still test the same behavior
- No change to test logic, only mock data
- All mocks conform to new type definitions
- TypeScript strict mode passes

## Dependencies
- STRSTOARCSYS-001, 002, 003 (model changes must exist)
- STRSTOARCSYS-012 (schema changes must exist)

## Notes

This ticket should be done **after** the model and type changes are complete, but **before** running the full test suite to verify the implementation.

It may be helpful to:
1. Make the model changes
2. Run `npm run typecheck` to find all type errors
3. Fix each type error by updating the mock
4. Run tests to verify

## Estimated Scope
~200-300 lines of mock updates across 10-15 test files

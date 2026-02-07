# STRSTOARCSYS-015: Integration Tests

## Summary
Create comprehensive integration tests for the structured story arc system. Tests should validate the complete flow from structure generation through page generation and beat progression.

## Files to Touch
- `test/integration/engine/structure-flow.test.ts` (NEW)
- `test/integration/persistence/story-structure.test.ts` (NEW)

## Out of Scope
- DO NOT modify source code
- DO NOT create E2E tests (that's STRSTOARCSYS-016)
- DO NOT test individual units (covered by unit tests in other tickets)

## Implementation Details

### Create `test/integration/engine/structure-flow.test.ts`

```typescript
describe('Structure Generation Flow', () => {
  describe('structure generation', () => {
    it('generates valid 3-act structure from context');
    it('structure has 2-4 beats per act');
    it('all acts have required fields (name, objective, stakes, entryCondition)');
    it('all beats have required fields (description, objective)');
    it('beat IDs follow hierarchical format (1.1, 1.2, 2.1, etc.)');
  });

  describe('story creation with structure', () => {
    it('creates story with structure after structure generation');
    it('first page has initial structure state');
    it('first page structure state has first beat as active');
    it('structure is persisted to story.json');
    it('structure can be loaded back correctly');
  });

  describe('beat progression flow', () => {
    it('advances beat when LLM reports beatConcluded: true');
    it('stores beat resolution in page structure state');
    it('marks concluded beat with resolution');
    it('marks new current beat as active');
    it('advances act when last beat of act concludes');
    it('child pages inherit advanced structure state');
    it('does not advance when beatConcluded: false');
  });

  describe('branch isolation', () => {
    it('different branches can have different structure progression');
    it('beat concluded in one branch does not affect other branches');
    it('structure state is independent per branch path');
    it('sibling pages from same parent can progress differently');
  });

  describe('story completion', () => {
    it('marks structure complete when last beat of last act concludes');
    it('completed structure state persists correctly');
  });
});
```

### Create `test/integration/persistence/story-structure.test.ts`

```typescript
describe('Story Structure Persistence', () => {
  describe('story with structure', () => {
    it('saves structure to story.json');
    it('loads structure from story.json');
    it('preserves all structure fields through save/load cycle');
    it('preserves generatedAt date correctly');
    it('handles stories with structure: null');
  });

  describe('page with structure state', () => {
    it('saves accumulatedStructureState to page JSON');
    it('loads accumulatedStructureState from page JSON');
    it('preserves beat progressions through save/load');
    it('preserves current indices through save/load');
    it('preserves beat resolutions for concluded beats');
  });

  describe('multi-page persistence', () => {
    it('each page has correct structure state');
    it('parent-child structure state inheritance is correct after reload');
    it('branch divergence in structure state persists correctly');
  });
});
```

### Test Fixtures

Create shared fixtures for integration tests:

```typescript
// test/fixtures/structure-fixtures.ts

export function createTestStructure(): StoryStructure {
  return {
    overallTheme: 'A test story theme',
    acts: [
      {
        id: '1',
        name: 'Act One',
        objective: 'Setup',
        stakes: 'Low stakes',
        entryCondition: 'Story begins',
        beats: [
          { id: '1.1', description: 'Beat 1.1', objective: 'Objective 1.1' },
          { id: '1.2', description: 'Beat 1.2', objective: 'Objective 1.2' },
        ],
      },
      // ... acts 2 and 3
    ],
    generatedAt: new Date(),
  };
}

export function createTestStructureState(
  actIndex: number,
  beatIndex: number,
  concludedBeats: string[] = [],
): AccumulatedStructureState {
  // Create state at specific position
}
```

### Mock LLM Responses

For integration tests that don't need real API calls:

```typescript
const mockStructureResponse: StructureGenerationResult = {
  overallTheme: 'Test theme',
  acts: [/* 3 acts with 2-4 beats each */],
  rawResponse: '...',
};

const mockPageWithBeatConcluded: GenerationResult = {
  narrative: 'Test narrative',
  choices: ['Choice 1', 'Choice 2'],
  beatConcluded: true,
  beatResolution: 'Beat was resolved by...',
  // ... other fields
};
```

## Acceptance Criteria

### Tests That Must Pass

All tests in both new files must pass:

1. Structure generation flow (8+ tests)
2. Story creation with structure (5+ tests)
3. Beat progression flow (7+ tests)
4. Branch isolation (4+ tests)
5. Story persistence (5+ tests)
6. Page persistence (5+ tests)
7. Multi-page persistence (3+ tests)

### Invariants Validated by Tests

```typescript
// INV-1: Index bounds
state.currentActIndex >= 0 && state.currentActIndex < structure.acts.length

// INV-2: Beat index bounds
state.currentBeatIndex >= 0 &&
state.currentBeatIndex < structure.acts[state.currentActIndex].beats.length

// INV-3: Beat status consistency
// Concluded before current, active at current, pending after

// INV-4: Concluded beats have resolution
progression.status === 'concluded' → resolution.length > 0

// INV-5: 2-4 beats per act
act.beats.length >= 2 && act.beats.length <= 4

// INV-6: Exactly 3 acts
structure.acts.length === 3

// INV-7: Unique beat IDs
new Set(beatIds).size === beatIds.length
```

### Test Environment

- Use Jest with async/await
- Mock external API calls (OpenRouter)
- Use temporary directories for file operations
- Clean up after each test

## Dependencies
- All implementation tickets (STRSTOARCSYS-001 through 014)

## Estimated Scope
~400 lines of test code across both files

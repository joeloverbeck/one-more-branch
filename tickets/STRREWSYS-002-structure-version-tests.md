# STRREWSYS-002: Create Unit Tests for Structure Version Types

## Summary
Create comprehensive unit tests for the structure version types defined in STRREWSYS-001.

## Dependencies
- STRREWSYS-001 must be completed first

## Files to Touch

### New Files
- `test/unit/models/structure-version.test.ts`

### Modified Files
- None

## Out of Scope
- Do NOT modify any source files in `src/`
- Do NOT create integration tests (handled later)
- Do NOT test deviation detection (handled in STRREWSYS-006)

## Implementation Details

### `test/unit/models/structure-version.test.ts`

```typescript
import {
  createStructureVersionId,
  isStructureVersionId,
  parseStructureVersionId,
  createInitialVersionedStructure,
  createRewrittenVersionedStructure,
  isVersionedStoryStructure,
  StructureVersionId,
  VersionedStoryStructure,
} from '../../../src/models/structure-version';
import { StoryStructure } from '../../../src/models/story-arc';

describe('StructureVersion', () => {
  // Test fixture
  const mockStructure: StoryStructure = {
    acts: [
      {
        id: '1',
        name: 'Act One',
        objective: 'Test objective',
        stakes: 'Test stakes',
        entryCondition: 'Test entry',
        beats: [
          { id: '1.1', description: 'Beat 1', objective: 'Obj 1' },
          { id: '1.2', description: 'Beat 2', objective: 'Obj 2' },
        ],
      },
      // ... add acts 2 and 3
    ],
    overallTheme: 'Test theme',
    generatedAt: new Date(),
  };

  describe('createStructureVersionId', () => {
    it('should generate unique IDs');
    it('should follow sv-{timestamp}-{random} format');
    it('should generate different IDs on each call');
  });

  describe('isStructureVersionId', () => {
    it('should return true for valid structure version IDs');
    it('should return false for invalid formats');
    it('should return false for non-string values');
    it('should return false for empty strings');
  });

  describe('parseStructureVersionId', () => {
    it('should parse valid structure version ID string');
    it('should throw for invalid format');
  });

  describe('createInitialVersionedStructure', () => {
    it('should set previousVersionId to null');
    it('should set createdAtPageId to null');
    it('should set rewriteReason to null');
    it('should set preservedBeatIds to empty array');
    it('should copy structure immutably');
    it('should set createdAt to current time');
    it('should generate unique ID');
  });

  describe('createRewrittenVersionedStructure', () => {
    it('should set previousVersionId to previous version');
    it('should set createdAtPageId to triggering page');
    it('should set rewriteReason');
    it('should record preservedBeatIds');
    it('should generate new unique ID');
    it('should set createdAt to current time');
    it('should copy structure immutably');
  });

  describe('isVersionedStoryStructure', () => {
    it('should return true for valid versioned structure');
    it('should return false for missing id');
    it('should return false for invalid structure');
    it('should return false for null');
    it('should return false for non-object values');
  });
});
```

## Acceptance Criteria

### Tests That Must Pass
- All tests in `test/unit/models/structure-version.test.ts`
- Run with: `npm test -- test/unit/models/structure-version.test.ts`

### Invariants That Must Remain True
1. **Test isolation** - Each test is independent
2. **No external dependencies** - Tests don't require API keys or network
3. **Existing tests unaffected** - `npm run test:unit` passes

## Technical Notes
- Follow existing test patterns in `test/unit/models/story-arc.test.ts`
- Use descriptive test names that explain the expected behavior
- Test edge cases: empty arrays, null values, invalid types

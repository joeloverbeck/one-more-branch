# STRREWSYS-004: Add Structure Version Reference to Page Model

## Summary
Add `structureVersionId` field to Page model so pages can reference the specific structure version they were generated with, enabling deterministic replay.

## Dependencies
- STRREWSYS-001 must be completed first

## Files to Touch

### Modified Files
- `src/models/page.ts`
- `test/unit/models/page.test.ts`

## Out of Scope
- Do NOT modify page-service.ts (handled in STRREWSYS-011)
- Do NOT modify page-repository.ts or persistence (handled in STRREWSYS-009)
- Do NOT implement structure rewriting logic
- Do NOT modify CreatePageData extensively - only add the new field

## Implementation Details

### `src/models/page.ts` Changes

Add import:
```typescript
import { StructureVersionId } from './structure-version';
```

Update Page interface:
```typescript
export interface Page {
  readonly id: PageId;
  readonly narrativeText: string;
  readonly choices: Choice[];
  readonly stateChanges: StateChanges;
  readonly accumulatedState: AccumulatedState;
  readonly inventoryChanges: InventoryChanges;
  readonly accumulatedInventory: Inventory;
  readonly healthChanges: HealthChanges;
  readonly accumulatedHealth: Health;
  readonly characterStateChanges: CharacterStateChanges;
  readonly accumulatedCharacterState: AccumulatedCharacterState;
  readonly accumulatedStructureState: AccumulatedStructureState;

  /**
   * Structure version ID this page was generated with.
   * Enables deterministic replay with correct structure.
   * Null for pages created before versioning or stories without structure.
   */
  readonly structureVersionId: StructureVersionId | null;

  readonly isEnding: boolean;
  readonly parentPageId: PageId | null;
  readonly parentChoiceIndex: number | null;
}
```

Update CreatePageData:
```typescript
export interface CreatePageData {
  id: PageId;
  narrativeText: string;
  choices: Choice[];
  stateChanges?: StateChanges;
  inventoryChanges?: InventoryChanges;
  healthChanges?: HealthChanges;
  characterStateChanges?: CharacterStateChanges;
  isEnding: boolean;
  parentPageId: PageId | null;
  parentChoiceIndex: number | null;
  parentAccumulatedState?: AccumulatedState;
  parentAccumulatedInventory?: Inventory;
  parentAccumulatedHealth?: Health;
  parentAccumulatedCharacterState?: AccumulatedCharacterState;
  parentAccumulatedStructureState?: AccumulatedStructureState;
  structureVersionId?: StructureVersionId | null;  // NEW
}
```

Update `createPage` function:
```typescript
export function createPage(data: CreatePageData): Page {
  // ... existing validation ...

  return {
    id: data.id,
    narrativeText: data.narrativeText.trim(),
    choices: data.choices,
    stateChanges,
    accumulatedState: applyStateChanges(parentState, stateChanges),
    inventoryChanges,
    accumulatedInventory: applyInventoryChanges(parentInventory, inventoryChanges),
    healthChanges,
    accumulatedHealth: applyHealthChanges(parentHealth, healthChanges),
    characterStateChanges,
    accumulatedCharacterState: applyCharacterStateChanges(parentCharacterState, characterStateChanges),
    accumulatedStructureState: parentStructureState,
    structureVersionId: data.structureVersionId ?? null,  // NEW
    isEnding: data.isEnding,
    parentPageId: data.parentPageId,
    parentChoiceIndex: data.parentChoiceIndex,
  };
}
```

Update `isPage` type guard:
```typescript
export function isPage(value: unknown): value is Page {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Allow structureVersionId to be null or a valid StructureVersionId
  const structureVersionIdValid =
    obj['structureVersionId'] === null ||
    obj['structureVersionId'] === undefined ||
    (typeof obj['structureVersionId'] === 'string' &&
     obj['structureVersionId'].startsWith('sv-'));

  return (
    typeof obj['id'] === 'number' &&
    Number.isInteger(obj['id']) &&
    obj['id'] >= 1 &&
    typeof obj['narrativeText'] === 'string' &&
    Array.isArray(obj['choices']) &&
    obj['choices'].every(isChoice) &&
    isStateChanges(obj['stateChanges']) &&
    isAccumulatedStructureState(obj['accumulatedStructureState']) &&
    structureVersionIdValid &&  // NEW
    typeof obj['isEnding'] === 'boolean'
  );
}
```

### `test/unit/models/page.test.ts` Updates

Add tests:
```typescript
describe('Page with structureVersionId', () => {
  it('should create page with structureVersionId');
  it('should default structureVersionId to null when not provided');
  it('should accept null structureVersionId explicitly');
});

describe('isPage with structureVersionId', () => {
  it('should return true for page with valid structureVersionId');
  it('should return true for page with null structureVersionId');
  it('should return true for page without structureVersionId (migration)');
  it('should return false for page with invalid structureVersionId format');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/models/page.test.ts` - all existing tests still pass
- New tests for structureVersionId handling
- Run with: `npm test -- test/unit/models/page.test.ts`

### Invariants That Must Remain True
1. **I3: Page Structure Version Exists** - Every page references a valid structure version (or null for no structure)
2. **Backward compatibility** - Pages without `structureVersionId` (pre-migration) are valid
3. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Allow undefined/null for backward compatibility with existing pages
- The `isPage` type guard should be lenient for migration purposes
- Actual validation of structureVersionId against story versions happens at runtime in page-service

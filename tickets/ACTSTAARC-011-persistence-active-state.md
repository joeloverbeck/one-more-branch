# ACTSTAARC-011: Update Persistence Layer for Active State

**Status**: PENDING
**Priority**: HIGH (data must persist correctly)
**Depends On**: ACTSTAARC-004
**Estimated Scope**: Medium

---

## Summary

Update the persistence layer to serialize and deserialize the new active state fields (`activeStateChanges`, `accumulatedActiveState`) when reading and writing page files.

---

## Files to Touch

### Modify
- `src/persistence/page-storage.ts` - Page serialization/deserialization (or equivalent)
- `src/persistence/story-storage.ts` - Story loading (if it touches pages)

---

## Out of Scope (DO NOT CHANGE)

- Story file format (`story.json`) - Unchanged
- `src/models/page.ts` - Changed in ACTSTAARC-004
- `src/engine/**` - Engine changes in ACTSTAARC-009
- Migration logic - Separate ticket ACTSTAARC-012
- Old stories detection - Separate ticket ACTSTAARC-012

---

## Implementation Details

### Page JSON Structure

The new page file format includes:

```json
{
  "id": 2,
  "narrativeText": "...",
  "choices": [...],

  "stateChanges": {
    "added": [],
    "removed": []
  },
  "accumulatedState": {
    "changes": []
  },

  "activeStateChanges": {
    "newLocation": "Cave entrance",
    "threatsAdded": ["THREAT_CAVE: Unstable rocks"],
    "threatsRemoved": ["THREAT_WOLVES"],
    "constraintsAdded": [],
    "constraintsRemoved": [],
    "threadsAdded": [],
    "threadsResolved": []
  },
  "accumulatedActiveState": {
    "currentLocation": "Cave entrance",
    "activeThreats": [
      {
        "prefix": "THREAT_CAVE",
        "description": "Unstable rocks",
        "raw": "THREAT_CAVE: Unstable rocks"
      }
    ],
    "activeConstraints": [],
    "openThreads": []
  },

  "inventoryChanges": {...},
  "accumulatedInventory": [...],
  "..." : "..."
}
```

### Serialization

When writing a page to disk:

```typescript
function serializePage(page: Page): string {
  // Existing serialization works - just need to ensure new fields are included
  return JSON.stringify(page, null, 2);
}
```

The `JSON.stringify` will automatically include the new fields since they're part of the Page interface. No special handling needed.

### Deserialization

When reading a page from disk, handle missing fields for backward compatibility:

```typescript
function deserializePage(json: string): Page {
  const data = JSON.parse(json);

  // Handle pages without new fields (old format)
  if (!data.activeStateChanges) {
    data.activeStateChanges = createEmptyActiveStateChanges();
  }
  if (!data.accumulatedActiveState) {
    data.accumulatedActiveState = createEmptyActiveState();
  }

  // Validate and return
  if (!isPage(data)) {
    throw new Error('Invalid page data');
  }

  return data;
}
```

### Type Guard Updates

Ensure `isPage` handles both old and new format (done in ACTSTAARC-004):

```typescript
// isPage should accept pages with or without active state fields
// during the transition period
```

---

## Acceptance Criteria

### Tests That Must Pass

Update/create `test/integration/persistence/page-storage.test.ts`:

```typescript
describe('page persistence with active state', () => {
  it('writes page with active state to disk', async () => {
    const page = createPage({
      id: 1,
      narrativeText: 'Test',
      choices: [{ text: 'A', nextPageId: null }, { text: 'B', nextPageId: null }],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
      activeStateChanges: {
        newLocation: 'Test Location',
        threatsAdded: ['THREAT_X: X'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      },
    });

    await savePage('test-story', page);
    const loaded = await loadPage('test-story', 1);

    expect(loaded.activeStateChanges.newLocation).toBe('Test Location');
    expect(loaded.accumulatedActiveState.currentLocation).toBe('Test Location');
    expect(loaded.accumulatedActiveState.activeThreats).toHaveLength(1);
  });

  it('reads old-format page without active state', async () => {
    // Simulate an old page file
    const oldPageJson = JSON.stringify({
      id: 1,
      narrativeText: 'Old page',
      choices: [{ text: 'A', nextPageId: null }, { text: 'B', nextPageId: null }],
      stateChanges: { added: ['old event'], removed: [] },
      accumulatedState: { changes: ['old event'] },
      inventoryChanges: { added: [], removed: [] },
      accumulatedInventory: [],
      healthChanges: { added: [], removed: [] },
      accumulatedHealth: [],
      characterStateChanges: { added: [], removed: [] },
      accumulatedCharacterState: {},
      accumulatedStructureState: { currentActIndex: 0, currentBeatIndex: 0, beatProgressions: [] },
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
      structureVersionId: null,
      // NO activeStateChanges or accumulatedActiveState
    });

    await writeRawPageFile('test-story', 1, oldPageJson);
    const loaded = await loadPage('test-story', 1);

    // Should have defaults
    expect(loaded.activeStateChanges).toEqual(createEmptyActiveStateChanges());
    expect(loaded.accumulatedActiveState).toEqual(createEmptyActiveState());
  });

  it('round-trips page with complex active state', async () => {
    const page = createPage({
      id: 2,
      narrativeText: 'Complex test',
      choices: [{ text: 'A', nextPageId: null }, { text: 'B', nextPageId: null }],
      isEnding: false,
      parentPageId: 1,
      parentChoiceIndex: 0,
      activeStateChanges: {
        newLocation: 'Complex Location',
        threatsAdded: ['THREAT_A: A', 'THREAT_B: B'],
        threatsRemoved: ['THREAT_OLD'],
        constraintsAdded: ['CONSTRAINT_C: C'],
        constraintsRemoved: [],
        threadsAdded: ['THREAD_D: D'],
        threadsResolved: ['THREAD_OLD'],
      },
      parentAccumulatedActiveState: {
        currentLocation: 'Previous Location',
        activeThreats: [{ prefix: 'THREAT_OLD', description: 'Old', raw: 'THREAT_OLD: Old' }],
        activeConstraints: [],
        openThreads: [{ prefix: 'THREAD_OLD', description: 'Old', raw: 'THREAD_OLD: Old' }],
      },
    });

    await savePage('test-story', page);
    const loaded = await loadPage('test-story', 2);

    // Verify changes preserved
    expect(loaded.activeStateChanges.newLocation).toBe('Complex Location');
    expect(loaded.activeStateChanges.threatsAdded).toHaveLength(2);
    expect(loaded.activeStateChanges.threatsRemoved).toEqual(['THREAT_OLD']);

    // Verify accumulated state computed correctly
    expect(loaded.accumulatedActiveState.currentLocation).toBe('Complex Location');
    expect(loaded.accumulatedActiveState.activeThreats).toHaveLength(2);
    expect(loaded.accumulatedActiveState.openThreads).toHaveLength(1);
    expect(loaded.accumulatedActiveState.openThreads[0].prefix).toBe('THREAD_D');
  });

  it('preserves TaggedStateEntry structure in JSON', async () => {
    const page = createPage({
      id: 1,
      narrativeText: 'Test',
      choices: [{ text: 'A', nextPageId: null }, { text: 'B', nextPageId: null }],
      isEnding: false,
      parentPageId: null,
      parentChoiceIndex: null,
      activeStateChanges: {
        newLocation: 'Loc',
        threatsAdded: ['THREAT_X: Description here'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
      },
    });

    await savePage('test-story', page);

    // Read raw JSON to verify structure
    const rawJson = await readRawPageFile('test-story', 1);
    const parsed = JSON.parse(rawJson);

    expect(parsed.accumulatedActiveState.activeThreats[0]).toEqual({
      prefix: 'THREAT_X',
      description: 'Description here',
      raw: 'THREAT_X: Description here',
    });
  });
});
```

### Invariants That Must Remain True

1. **Backward Compatibility**: Old pages without active state load with defaults
2. **Data Integrity**: Active state persisted and loaded correctly
3. **TaggedStateEntry Structure**: Prefix, description, and raw preserved
4. **Immutability**: Loaded pages are immutable
5. **Validation**: Invalid pages throw on load
6. **No Data Loss**: All existing page fields still persist correctly

---

## Definition of Done

- [ ] Pages with active state serialize correctly
- [ ] Pages without active state (old format) load with defaults
- [ ] TaggedStateEntry structure preserved in JSON
- [ ] Round-trip tests pass
- [ ] Backward compatibility tests pass
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

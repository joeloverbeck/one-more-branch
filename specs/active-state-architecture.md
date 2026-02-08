# Spec: Active State Architecture Migration

**Status**: PENDING IMPLEMENTATION
**Created**: 2026-02-08
**Type**: Architecture Refactor

---

## 1. Changes/Improvements Necessary

### 1.1 Replace Event-Log State with Active State

**Current Problem**: `accumulatedState` is an event log containing 64+ entries of historical events mixed with current conditions. This causes token bloat, contradictions (e.g., "Betty collapsed" coexisting with "Betty is breathing again"), and brittle string-matching removals.

**Solution**: Replace with four new fields representing "truths that are true right now":

| New Field | Replaces | Purpose |
|-----------|----------|---------|
| `currentLocation: string` | (implicit in narrative) | Where protagonist is at END of scene |
| `activeThreats: TaggedStateEntry[]` | Part of `accumulatedState` | Dangers that exist NOW |
| `activeConstraints: TaggedStateEntry[]` | Part of `accumulatedState` | Limitations affecting protagonist NOW |
| `openThreads: TaggedStateEntry[]` | (new) | Unresolved narrative hooks |

**Remove**:
- `stateChanges` (added/removed arrays)
- `accumulatedState` (the event log)

**Keep unchanged**:
- `inventoryChanges` / `accumulatedInventory`
- `healthChanges` / `accumulatedHealth`
- `characterStateChanges` / `accumulatedCharacterState`
- `protagonistAffect`

### 1.2 Implement Prefix Tag System

**Purpose**: Enable reliable removal matching without exact string matching.

**Format**: `CATEGORY_IDENTIFIER: description`

**Examples**:
```
THREAT_ENTITIES: Multiple small entities are tracking you
CONSTRAINT_BETTY_BREATHING: Betty's breathing is fragile
THREAD_GRAFFITI_MEANING: The warning graffiti's meaning is unknown
```

**Removal Protocol**: LLM outputs ONLY the prefix (e.g., `THREAT_ENTITIES`) to remove an entry. The system matches on prefix, ignoring description text.

**Categories**:
- `THREAT_*` - Active dangers
- `CONSTRAINT_*` - Current limitations
- `THREAD_*` - Unresolved narrative hooks

### 1.3 Extend Scene Context

**Current**: Show 1 previous scene (truncated to 2000 chars)

**New**: Show last 2 scenes:
- Previous scene (parent page narrative, 2000 chars)
- Grandparent scene (if exists, 1000 chars)

**Rationale**: Compensates for removal of the event log by providing more narrative context.

### 1.4 Update Beat Evaluation Context

**Current**: Uses last 10 entries from `accumulatedState`

**New**: Uses:
- `activeState` (current location, threats, constraints)
- `openThreads` (unresolved hooks)
- Last 1-2 scenes

### 1.5 Migration Strategy

**No backwards compatibility**. Old stories will be:
1. Detected by presence of `stateChanges` and absence of `activeStateChanges` in page files
2. Moved to `old-stories/` directory
3. No longer loadable by the application

---

## 2. Variants That Must Pass

### 2.1 Page Lifecycle Variants

| Variant | Previous Scenes | Parent State | Notes |
|---------|-----------------|--------------|-------|
| Opening page (page 1) | None | Empty | Initial state set by LLM |
| Page 2 | 1 scene | From page 1 | No grandparent narrative |
| Page 3+ | 2 scenes | From parent | Full context available |

### 2.2 Active State Variants

| Variant | Description |
|---------|-------------|
| Empty state | All arrays empty, location may be set |
| Full state | Multiple threats, constraints, and threads |
| Mixed operations | Simultaneous additions and removals |
| Removal-only | LLM resolves threats without adding new ones |
| Location unchanged | `newLocation` is null, previous location preserved |
| Location changed | `newLocation` set, overwrites previous |

### 2.3 Prefix Tag Variants

| Variant | Input | Expected Behavior |
|---------|-------|-------------------|
| Valid add | `THREAT_FIRE: Fire spreading` | Parsed into `{ prefix: 'THREAT_FIRE', description: 'Fire spreading', raw: '...' }` |
| Valid remove | `THREAT_FIRE` | Matches and removes entry with prefix `THREAT_FIRE` |
| Invalid add (no colon) | `THREAT_FIRE Fire spreading` | Logged as warning, skipped |
| Invalid add (bad category) | `DANGER_FIRE: Fire spreading` | Logged as warning, skipped |
| Invalid remove (with description) | `THREAT_FIRE: Fire spreading` | Logged as warning, prefix extracted and used |
| Remove non-existent | `THREAT_NONEXISTENT` | Logged as warning, operation continues |
| Duplicate prefix | Two entries with same prefix | Both kept (array allows duplicates) |

### 2.4 Edge Cases

| Case | Behavior |
|------|----------|
| LLM outputs empty `currentLocation` | Empty string preserved, not null |
| LLM outputs only whitespace entries | Filtered out during processing |
| Very long threat list | No limit, but prompts may warn about context |
| Circular thread resolution | Thread can be re-added after resolution |

---

## 3. Tests That Must Pass

### 3.1 Unit Tests

#### Prefix Parser (`test/unit/models/state/prefix-parser.test.ts`)

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
});
```

#### Active State Application (`test/unit/models/state/active-state-apply.test.ts`)

```typescript
describe('applyActiveStateChanges', () => {
  const emptyState: ActiveState = {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };

  it('applies threat addition', () => {
    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: ['THREAT_FIRE: Fire spreading from east'],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(emptyState, changes);
    expect(result.activeThreats).toHaveLength(1);
    expect(result.activeThreats[0].prefix).toBe('THREAT_FIRE');
  });

  it('removes threat by prefix match', () => {
    const currentState: ActiveState = {
      currentLocation: 'Corridor',
      activeThreats: [
        { prefix: 'THREAT_FIRE', description: 'Fire spreading', raw: 'THREAT_FIRE: Fire spreading' },
      ],
      activeConstraints: [],
      openThreads: [],
    };

    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: ['THREAT_FIRE'],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, changes);
    expect(result.activeThreats).toHaveLength(0);
  });

  it('ignores removal of non-existent prefix (logs warning)', () => {
    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: ['THREAT_NONEXISTENT'],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    // Should not throw, should complete with warning logged
    const result = applyActiveStateChanges(emptyState, changes);
    expect(result.activeThreats).toHaveLength(0);
  });

  it('updates location when newLocation provided', () => {
    const changes: ActiveStateChanges = {
      newLocation: 'New Room',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(emptyState, changes);
    expect(result.currentLocation).toBe('New Room');
  });

  it('preserves location when newLocation is null', () => {
    const currentState: ActiveState = {
      ...emptyState,
      currentLocation: 'Original Room',
    };

    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, changes);
    expect(result.currentLocation).toBe('Original Room');
  });

  it('handles empty changes (returns state unchanged)', () => {
    const currentState: ActiveState = {
      currentLocation: 'Room',
      activeThreats: [{ prefix: 'THREAT_A', description: 'A', raw: 'THREAT_A: A' }],
      activeConstraints: [],
      openThreads: [],
    };

    const emptyChanges: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, emptyChanges);
    expect(result).toEqual(currentState);
  });

  it('processes removals before additions', () => {
    const currentState: ActiveState = {
      currentLocation: '',
      activeThreats: [{ prefix: 'THREAT_OLD', description: 'Old', raw: 'THREAT_OLD: Old' }],
      activeConstraints: [],
      openThreads: [],
    };

    const changes: ActiveStateChanges = {
      newLocation: null,
      threatsAdded: ['THREAT_OLD: New version of old threat'],
      threatsRemoved: ['THREAT_OLD'],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
    };

    const result = applyActiveStateChanges(currentState, changes);
    // Old removed first, then new added
    expect(result.activeThreats).toHaveLength(1);
    expect(result.activeThreats[0].description).toBe('New version of old threat');
  });
});
```

### 3.2 Integration Tests

#### Prompt Generation (`test/integration/llm/prompts/continuation-prompt.test.ts`)

```typescript
describe('buildContinuationPrompt with active state', () => {
  it('includes CURRENT LOCATION section when location set', () => {
    const context = createMockContinuationContext({
      activeState: {
        currentLocation: 'Gray corridor with water-stained tiles',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('CURRENT LOCATION:');
    expect(userMessage).toContain('Gray corridor with water-stained tiles');
  });

  it('includes ACTIVE THREATS section when threats present', () => {
    const context = createMockContinuationContext({
      activeState: {
        currentLocation: '',
        activeThreats: [
          { prefix: 'THREAT_ENTITIES', description: 'Entities tracking', raw: 'THREAT_ENTITIES: Entities tracking' },
        ],
        activeConstraints: [],
        openThreads: [],
      },
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('ACTIVE THREATS');
    expect(userMessage).toContain('THREAT_ENTITIES: Entities tracking');
  });

  it('omits ACTIVE THREATS section when no threats', () => {
    const context = createMockContinuationContext({
      activeState: {
        currentLocation: 'Room',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).not.toContain('ACTIVE THREATS');
  });

  it('includes both previous scenes when grandparent available', () => {
    const context = createMockContinuationContext({
      previousNarrative: 'Previous scene narrative...',
      grandparentNarrative: 'Grandparent scene narrative...',
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('SCENE BEFORE LAST');
    expect(userMessage).toContain('Grandparent scene narrative');
    expect(userMessage).toContain('PREVIOUS SCENE');
    expect(userMessage).toContain('Previous scene narrative');
  });

  it('omits grandparent section when not available', () => {
    const context = createMockContinuationContext({
      previousNarrative: 'Previous scene narrative...',
      grandparentNarrative: null,
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).not.toContain('SCENE BEFORE LAST');
    expect(userMessage).toContain('PREVIOUS SCENE');
  });
});
```

#### Page Building (`test/integration/engine/page-builder.test.ts`)

```typescript
describe('buildPage with active state', () => {
  it('creates first page with initial active state', () => {
    const result: GenerationResult = {
      narrative: 'Opening narrative...',
      choices: ['Choice A', 'Choice B'],
      currentLocation: 'Town square at dusk',
      threatsAdded: ['THREAT_BANDITS: Bandits spotted on the road'],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: ['THREAD_LETTER: The mysterious letter remains unread'],
      threadsResolved: [],
      // ... other fields
    };

    const page = buildFirstPage(result, createMockFirstPageContext());

    expect(page.accumulatedActiveState.currentLocation).toBe('Town square at dusk');
    expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
    expect(page.accumulatedActiveState.activeThreats[0].prefix).toBe('THREAT_BANDITS');
    expect(page.accumulatedActiveState.openThreads).toHaveLength(1);
  });

  it('accumulates state from parent page', () => {
    const parentState: ActiveState = {
      currentLocation: 'Forest path',
      activeThreats: [{ prefix: 'THREAT_WOLVES', description: 'Wolves howling', raw: 'THREAT_WOLVES: Wolves howling' }],
      activeConstraints: [],
      openThreads: [],
    };

    const result: GenerationResult = {
      // ...
      currentLocation: 'Cave entrance',
      threatsAdded: ['THREAT_CAVE: Cave is unstable'],
      threatsRemoved: ['THREAT_WOLVES'],
      // ...
    };

    const page = buildContinuationPage(result, createMockContinuationContext({ parentActiveState: parentState }));

    expect(page.accumulatedActiveState.currentLocation).toBe('Cave entrance');
    expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
    expect(page.accumulatedActiveState.activeThreats[0].prefix).toBe('THREAT_CAVE');
  });
});
```

### 3.3 E2E Tests

#### Story Flow (`test/e2e/story-flow.test.ts`)

```typescript
describe('Story flow with active state', () => {
  it('creates new story with active state format', async () => {
    const story = await createNewStory({
      characterConcept: 'A wandering knight',
      worldbuilding: 'Medieval fantasy kingdom',
      tone: 'Epic adventure',
    });

    const page1 = await getPage(story.id, 1);

    // New format fields exist
    expect(page1.accumulatedActiveState).toBeDefined();
    expect(page1.accumulatedActiveState.currentLocation).toBeDefined();
    expect(page1.activeStateChanges).toBeDefined();

    // Old format fields don't exist
    expect((page1 as any).stateChanges).toBeUndefined();
    expect((page1 as any).accumulatedState).toBeUndefined();
  });

  it('accumulates active state across pages', async () => {
    const story = await createNewStory(/* ... */);
    await makeChoice(story.id, 1, 0);
    await makeChoice(story.id, 2, 1);

    const page3 = await getPage(story.id, 3);

    // State should accumulate
    expect(page3.accumulatedActiveState.currentLocation).toBeTruthy();
  });

  it('resolves threats through removal', async () => {
    // Setup story with a threat
    const story = await createStoryWithThreat();
    const page1 = await getPage(story.id, 1);
    expect(page1.accumulatedActiveState.activeThreats).toHaveLength(1);

    // Make choice that resolves threat
    await makeChoiceThatResolvesThreat(story.id, 1);
    const page2 = await getPage(story.id, 2);

    // Threat should be removed
    expect(page2.accumulatedActiveState.activeThreats).toHaveLength(0);
  });
});
```

#### Migration (`test/e2e/migration.test.ts`)

```typescript
describe('Old story migration', () => {
  it('moves old-format stories to old-stories/', async () => {
    // Create a mock old-format story
    await createOldFormatStory('test-old-story');

    // Run migration
    await migrateOldStories();

    // Old story should be moved
    expect(await exists('stories/test-old-story')).toBe(false);
    expect(await exists('old-stories/test-old-story')).toBe(true);
  });

  it('leaves new-format stories in place', async () => {
    // Create a new-format story
    const story = await createNewStory(/* ... */);

    // Run migration (should be no-op)
    await migrateOldStories();

    // New story should remain
    expect(await exists(`stories/${story.id}`)).toBe(true);
  });
});
```

---

## Summary

This spec defines:
1. **17 files** to modify/create
2. **4 new TypeScript types** (ActiveState, ActiveStateChanges, TaggedStateEntry, prefix functions)
3. **Prefix tag format** with 3 categories (THREAT, CONSTRAINT, THREAD)
4. **2 scenes** shown instead of 1
5. **Migration** of old stories to `old-stories/`
6. **50+ test cases** across unit, integration, and E2E

The primary goal is eliminating the event-log bloat while maintaining all existing specialized state tracking (inventory, health, character state, protagonist affect).

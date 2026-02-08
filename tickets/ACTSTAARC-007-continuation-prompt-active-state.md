# ACTSTAARC-007: Update Continuation Prompt for Active State

**Status**: PENDING
**Priority**: HIGH (core functionality change)
**Depends On**: ACTSTAARC-006
**Estimated Scope**: Large

---

## Summary

Rewrite the `buildContinuationPrompt` function to:
1. Replace the old `CURRENT STATE:` section with new `CURRENT LOCATION:`, `ACTIVE THREATS:`, `ACTIVE CONSTRAINTS:`, and `OPEN THREADS:` sections
2. Add `SCENE BEFORE LAST:` section for grandparent narrative
3. Update beat evaluation context to use active state instead of event log

---

## Files to Touch

### Modify
- `src/llm/prompts/continuation-prompt.ts` - Main prompt builder
- `src/llm/prompts/sections/state-tracking.ts` - State tracking section (if exists)

---

## Out of Scope (DO NOT CHANGE)

- `src/llm/prompts/opening-prompt.ts` - Opening prompts unchanged
- `src/llm/prompts/structure-prompt.ts` - Structure generation unchanged
- `src/llm/prompts/structure-rewrite-prompt.ts` - Structure rewrite unchanged
- `src/llm/prompts/system-prompt.ts` - System prompt unchanged (update in separate ticket)
- `src/llm/schemas/**` - Schema changes in ACTSTAARC-005
- `src/engine/**` - Engine changes in ACTSTAARC-008

---

## Implementation Details

### New Prompt Sections

#### CURRENT LOCATION Section

```typescript
function buildLocationSection(activeState: ActiveState): string {
  if (!activeState.currentLocation) {
    return '';
  }
  return `CURRENT LOCATION:
${activeState.currentLocation}

`;
}
```

#### ACTIVE THREATS Section

```typescript
function buildThreatsSection(activeState: ActiveState): string {
  if (activeState.activeThreats.length === 0) {
    return '';
  }
  return `ACTIVE THREATS (dangers that exist NOW):
${activeState.activeThreats.map(t => `- ${t.raw}`).join('\n')}

`;
}
```

#### ACTIVE CONSTRAINTS Section

```typescript
function buildConstraintsSection(activeState: ActiveState): string {
  if (activeState.activeConstraints.length === 0) {
    return '';
  }
  return `ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):
${activeState.activeConstraints.map(c => `- ${c.raw}`).join('\n')}

`;
}
```

#### OPEN THREADS Section

```typescript
function buildThreadsSection(activeState: ActiveState): string {
  if (activeState.openThreads.length === 0) {
    return '';
  }
  return `OPEN NARRATIVE THREADS (unresolved hooks):
${activeState.openThreads.map(t => `- ${t.raw}`).join('\n')}

`;
}
```

### Extended Scene Context

Change from 1 scene to 2 scenes:

```typescript
function buildSceneContextSection(
  previousNarrative: string,
  grandparentNarrative: string | null
): string {
  let result = '';

  if (grandparentNarrative) {
    result += `SCENE BEFORE LAST:
${truncateText(grandparentNarrative, 1000)}

`;
  }

  result += `PREVIOUS SCENE:
${truncateText(previousNarrative, 2000)}

`;

  return result;
}
```

### Beat Evaluation Context Update

Replace the `accumulatedStateSummary` section that uses old event log with new active state:

```typescript
// OLD (remove):
const accumulatedStateSummary =
  context.accumulatedState.length > 0
    ? `ACCUMULATED STORY PROGRESS (for beat evaluation):
Key events that have occurred so far:
${context.accumulatedState.slice(-10).map(change => `- ${change}`).join('\n')}
...`
    : '';

// NEW (replace with):
const activeStateForBeatEval = buildActiveStateForBeatEvaluation(context.activeState);
```

```typescript
function buildActiveStateForBeatEvaluation(activeState: ActiveState): string {
  const parts: string[] = [];

  if (activeState.currentLocation) {
    parts.push(`Location: ${activeState.currentLocation}`);
  }

  if (activeState.activeThreats.length > 0) {
    parts.push(`Active threats: ${activeState.activeThreats.map(t => t.prefix).join(', ')}`);
  }

  if (activeState.activeConstraints.length > 0) {
    parts.push(`Constraints: ${activeState.activeConstraints.map(c => c.prefix).join(', ')}`);
  }

  if (activeState.openThreads.length > 0) {
    parts.push(`Open threads: ${activeState.openThreads.map(t => t.prefix).join(', ')}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `CURRENT STATE (for beat evaluation):
${parts.map(p => `- ${p}`).join('\n')}
(Consider these when evaluating beat completion)

`;
}
```

### Complete Section Order

The user prompt should have this order:

1. CHARACTER CONCEPT
2. WORLDBUILDING (if present)
3. TONE/GENRE
4. STORY STRUCTURE (if present)
5. ESTABLISHED WORLD FACTS (canon)
6. CHARACTER INFORMATION
7. NPC CURRENT STATE
8. **CURRENT LOCATION** (NEW)
9. **ACTIVE THREATS** (NEW, replaces CURRENT STATE)
10. **ACTIVE CONSTRAINTS** (NEW)
11. **OPEN NARRATIVE THREADS** (NEW)
12. YOUR INVENTORY
13. YOUR HEALTH
14. PROTAGONIST'S CURRENT EMOTIONAL STATE
15. **SCENE BEFORE LAST** (NEW, if available)
16. PREVIOUS SCENE
17. PLAYER'S CHOICE
18. REQUIREMENTS

---

## Acceptance Criteria

### Tests That Must Pass

Update `test/integration/llm/prompts/continuation-prompt.test.ts`:

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

  it('omits CURRENT LOCATION section when empty', () => {
    const context = createMockContinuationContext({
      activeState: {
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).not.toContain('CURRENT LOCATION:');
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

  it('includes ACTIVE CONSTRAINTS section when constraints present', () => {
    const context = createMockContinuationContext({
      activeState: {
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [
          { prefix: 'CONSTRAINT_TIME', description: 'Limited time', raw: 'CONSTRAINT_TIME: Limited time' },
        ],
        openThreads: [],
      },
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('ACTIVE CONSTRAINTS');
    expect(userMessage).toContain('CONSTRAINT_TIME: Limited time');
  });

  it('includes OPEN THREADS section when threads present', () => {
    const context = createMockContinuationContext({
      activeState: {
        currentLocation: '',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [
          { prefix: 'THREAD_LETTER', description: 'Letter unread', raw: 'THREAD_LETTER: Letter unread' },
        ],
      },
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('OPEN NARRATIVE THREADS');
    expect(userMessage).toContain('THREAD_LETTER: Letter unread');
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

  it('does not include old CURRENT STATE section', () => {
    const context = createMockContinuationContext({
      accumulatedState: ['Old event 1', 'Old event 2'],
      activeState: {
        currentLocation: 'Room',
        activeThreats: [],
        activeConstraints: [],
        openThreads: [],
      },
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    // Old format should NOT appear
    expect(userMessage).not.toMatch(/CURRENT STATE:\n- Old event/);
  });

  it('truncates grandparent narrative to 1000 chars', () => {
    const longNarrative = 'x'.repeat(2000);
    const context = createMockContinuationContext({
      grandparentNarrative: longNarrative,
    });

    const messages = buildContinuationPrompt(context);
    const userMessage = messages.find(m => m.role === 'user')!.content;

    // Should be truncated
    expect(userMessage.length).toBeLessThan(2000 + 1000);  // grandparent limit is 1000
  });
});
```

### Invariants That Must Remain True

1. **Old State Section Removed**: No `CURRENT STATE:` with event log format
2. **Section Order**: Active state sections appear after NPC state, before inventory
3. **Truncation Limits**: Previous = 2000 chars, Grandparent = 1000 chars
4. **Conditional Sections**: Empty sections are omitted entirely
5. **Beat Evaluation Uses Active State**: Not old accumulated state
6. **Other Sections Unchanged**: Canon, inventory, health, character state unchanged

---

## Definition of Done

- [ ] `buildContinuationPrompt` uses new active state sections
- [ ] Old `CURRENT STATE:` section removed
- [ ] `SCENE BEFORE LAST:` section added for grandparent
- [ ] Beat evaluation context uses active state
- [ ] All prompt integration tests pass
- [ ] Verified output format matches spec
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

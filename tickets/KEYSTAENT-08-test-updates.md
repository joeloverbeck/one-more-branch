# KEYSTAENT-08: Update all remaining test files and fixtures

**Status**: PENDING
**Priority**: 8
**Depends on**: KEYSTAENT-01 through KEYSTAENT-06
**Branch**: keyed-state-entries

---

## Summary

Update all test files and fixtures that reference the old `TaggedStateEntry` type, plain-string state arrays, or the old `CharacterStateChanges` shape. This is a sweep ticket for any test breakage not already covered by individual tickets.

## Files to Touch

- `test/unit/models/state.test.ts` — **MODIFY** (if not fully covered by KEYSTAENT-02)
- `test/unit/engine/page-builder.test.ts` — **MODIFY**
- `test/unit/engine/page-service.test.ts` — **MODIFY** (mock updates)
- `test/unit/engine/story-engine.test.ts` — **MODIFY** (mock updates)
- `test/unit/engine/parent-state-collector.test.ts` — **MODIFY** (type updates)
- `test/unit/llm/prompts.test.ts` — **MODIFY** (if exists, prompt output checks)
- `test/unit/llm/prompts/continuation/context-sections.test.ts` — **MODIFY**
- Any test fixtures using `TaggedStateEntry` or plain string state arrays

## What to Implement

### Mock Updates

Every test that creates mock `WriterResult` objects must update `characterStateChangesRemoved`:
```typescript
// OLD:
characterStateChangesRemoved: [{ characterName: 'Mira', states: ['Freed'] }]
// NEW:
characterStateChangesRemoved: ['cs-1']
```

Every test that creates mock `Page` objects must update:
- `accumulatedInventory`: `['Sword']` → `[{id:'inv-1', text:'Sword'}]`
- `accumulatedHealth`: `['Bruised']` → `[{id:'hp-1', text:'Bruised'}]`
- `accumulatedCharacterState`: `{'Mira': ['Freed']}` → `{'Mira': [{id:'cs-1', text:'Freed'}]}`
- `accumulatedActiveState.activeThreats`: `[{prefix:'THREAT_X', description:'x', raw:'THREAT_X: x'}]` → `[{id:'th-1', text:'x'}]`
- Same for `activeConstraints` and `openThreads`
- `characterStateChanges`: old array format → new `{added, removed}` format

Every test that creates mock `ContinuationContext` objects must update:
- `accumulatedInventory`: `KeyedEntry[]`
- `accumulatedHealth`: `KeyedEntry[]`
- `accumulatedCharacterState`: `Record<string, KeyedEntry[]>`

### Fixture Updates

Search all test files for:
- `TaggedStateEntry` references → replace with `KeyedEntry`
- `prefix:` / `description:` / `raw:` in active state mocks → replace with `id:` / `text:`
- `THREAT_`, `CONSTRAINT_`, `THREAD_` prefixes in mock data → replace with `th-N`, `cn-N`, `td-N` IDs
- Plain string inventory/health arrays → `KeyedEntry[]` arrays

### Assertion Updates

Update test assertions that check:
- Active state entry format (`.raw` → `.text`, `.prefix` → `.id`)
- Prompt output format (check for `[th-1]` instead of `THREAT_X:`)
- Serialization output format

## Out of Scope

- Writing new test cases for keyed-entry behavior (already covered in KEYSTAENT-01 and KEYSTAENT-02)
- Integration or e2e test changes (KEYSTAENT-09)
- Performance or memory test changes (unlikely to be affected)

## Acceptance Criteria

### Tests that must pass

1. `npm run test:unit` — ALL unit tests pass
2. No references to `TaggedStateEntry` remain in any test file
3. No references to `prefix`, `description`, `raw` pattern remain in active state test mocks
4. No plain-string `accumulatedInventory` or `accumulatedHealth` arrays remain in test mocks
5. No `SingleCharacterStateChanges` references remain in test files

### Invariants that must remain true

- Total test count does not decrease (tests are updated, not deleted)
- All existing test scenarios are preserved (same behaviors tested, just with new types)
- `npm run typecheck` passes for all files in `test/`
- No test uses `@ts-ignore` or `as any` to work around type mismatches

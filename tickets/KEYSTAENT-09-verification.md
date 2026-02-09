# KEYSTAENT-09: Full verification and integration testing

**Status**: PENDING
**Priority**: 9
**Depends on**: KEYSTAENT-01 through KEYSTAENT-08
**Branch**: keyed-state-entries

---

## Summary

Final verification ticket. Run all quality gates, integration tests, and perform manual smoke-testing to confirm the keyed-entry system works end-to-end.

## Files to Touch

- No source files modified
- Integration and e2e test fixtures may need updates if they reference old formats

## What to Verify

### Automated Checks

1. `npm run typecheck` — zero errors across entire codebase
2. `npm run lint` — zero lint errors
3. `npm run test:unit` — all unit tests pass
4. `npm run test:integration` — all integration tests pass
5. `npm run test:e2e` — all e2e tests pass (if any reference state formats)

### Manual Smoke Test

1. Start dev server: `npm run dev`
2. Create a new story with a character concept, worldbuilding, and tone
3. Play through 3-4 pages, making choices that:
   - Add inventory items (verify `[inv-N]` format in prompt debug output)
   - Cause health changes (verify `[hp-N]` format)
   - Introduce threats (verify `[th-N]` format)
   - Resolve threats (verify LLM references IDs correctly in removal)
   - Add NPC state changes (verify `[cs-N]` format)
4. Verify in browser console: absence of "removal did not match" warnings
5. Verify accumulated state is clean (no stale entries that should have been removed)

### Migration Verification (if stories exist)

1. Run migration: `npx tsx scripts/migrate-to-keyed-entries.ts`
2. Verify page JSON files have `{ id, text }` format for all keyed fields
3. Load a migrated story in the browser and verify it renders correctly
4. Continue playing a migrated story and verify new pages generate correctly

## Out of Scope

- Any code changes (this is verification only)
- Performance optimization
- UI changes

## Acceptance Criteria

### Tests that must pass

1. `npm run typecheck` — 0 errors
2. `npm run lint` — 0 errors
3. `npm run test:unit` — all pass
4. `npm run test:integration` — all pass
5. Manual smoke test confirms keyed IDs appear in prompts and LLM uses them for removals

### Invariants that must remain true

- Page immutability: generated pages never change
- Deterministic replay: same choice → same content
- Acyclic graph: no cycles in page links
- Branch isolation: state changes don't leak across branches
- Ending consistency: `isEnding === true` ⟺ `choices.length === 0`
- Choice minimum: non-ending pages have 2-5 choices
- API key security: never persisted to disk

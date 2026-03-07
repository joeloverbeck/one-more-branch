# REDUND-09: Prune Monotonic Accumulated Fields

**Priority**: Low
**Effort**: L
**Dependencies**: REDUND-07 (prune promises — establishes pattern)
**Category**: Storage redundancy (architectural)

## Summary

Multiple accumulated fields grow monotonically with no pruning, causing O(n^2) total story storage. Implement pruning strategies for each field to keep only active/relevant data.

## Problem

Fields that grow without bound:

| Field | Growth Pattern | Pruning Strategy |
|-------|---------------|-----------------|
| `accumulatedDelayedConsequences` | +0-1/page, triggered ones stay | Remove after triggering |
| `accumulatedKnowledgeState` | +0-3/page, resolved gaps stay | Remove when knowledge gap closes |
| `accumulatedFulfilledPremisePromises` | Strings accumulate | Keep (bounded by premise count) |
| `threadAges` | Keys accumulate as threads resolve | Remove entries for resolved threads |

For a 100-page story, these fields alone account for ~180KB of redundant data.

## Proposed Fix

For each field, implement pruning in `page-builder.ts`:

1. **`accumulatedDelayedConsequences`**: Filter out consequences where `triggered === true` (keep only pending)
2. **`accumulatedKnowledgeState`**: Filter out asymmetries that have been resolved (character gained correct knowledge)
3. **`threadAges`**: Remove entries for thread IDs no longer in `accumulatedActiveState.openThreads`
4. **`accumulatedFulfilledPremisePromises`**: No change needed (naturally bounded by spine premise count)

## Files to Touch

- `src/engine/page-builder.ts` — add pruning logic for each field
- `src/engine/continuation-context-builder.ts` — verify pruned data isn't needed downstream
- `test/` — add pruning tests, update existing fixtures

## Risks

- Must verify no prompt needs historical (resolved/triggered) data for callbacks or echoes
- Delayed consequences might need a "recently triggered" window for narrative continuity
- Mitigation: keep items for 1-2 pages after resolution, then prune

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Triggered delayed consequences pruned from accumulated array
- [ ] Resolved knowledge asymmetries pruned
- [ ] Thread ages for resolved threads pruned
- [ ] Total accumulated data size grows linearly with active items, not total history
- [ ] All existing tests pass
- [ ] `npm run test:coverage` thresholds met

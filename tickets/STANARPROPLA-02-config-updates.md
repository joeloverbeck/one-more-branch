# STANARPROPLA-02: Remove dead promise constants, add PROMISE_AGING_NOTICE_PAGES

**Status**: PENDING
**Depends on**: None
**Blocks**: STANARPROPLA-07, STANARPROPLA-10

## Summary

Remove the dead constants `MAX_INHERITED_PROMISES` (used only in `page-builder.ts`'s `computeInheritedNarrativePromises` which is being replaced) and `PROMISE_AGE_OUT_PAGES` (never imported anywhere). Add `PROMISE_AGING_NOTICE_PAGES: 3` - the age threshold at which the planner starts seeing a promise as an opportunity for reincorporation.

## File list

- **Modify**: `src/config/thread-pacing-config.ts`
  - Remove `MAX_INHERITED_PROMISES: 5` from the `THREAD_PACING` object
  - Remove `PROMISE_AGE_OUT_PAGES: 10` from the `THREAD_PACING` object
  - Add `PROMISE_AGING_NOTICE_PAGES: 3` to the `THREAD_PACING` object

## Out of scope

- Do NOT modify `page-builder.ts` (that file's reference to `MAX_INHERITED_PROMISES` is removed in STANARPROPLA-07)
- Do NOT modify any test files
- Do NOT modify any prompt files

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` will show an error in `page-builder.ts` referencing `THREAD_PACING.MAX_INHERITED_PROMISES` - this is expected (fixed in STANARPROPLA-07)
- No other files should reference the removed constants. Verify with: `grep -r 'MAX_INHERITED_PROMISES\|PROMISE_AGE_OUT_PAGES' src/ --include='*.ts'` - only `page-builder.ts` should match.

### Invariants that must remain true

- Thread pacing constants are unchanged: `HIGH_URGENCY_OVERDUE_PAGES: 4`, `MEDIUM_URGENCY_OVERDUE_PAGES: 7`, `LOW_URGENCY_OVERDUE_PAGES: 10`
- `PROMISE_AGING_NOTICE_PAGES` is `3` (number of pages after which a promise is considered "aging" and presented with encouragement to the planner)
- The `THREAD_PACING` object is still `as const`

# STOARCIMP-06: Wire pacing fields through result merger and page-service runtime

**Phase**: 2 (Analyst Pacing Detection)
**Spec sections**: 2.6, 2.7
**Depends on**: STOARCIMP-02, STOARCIMP-05
**Blocks**: STOARCIMP-08

## Description

Complete the pacing detection runtime path:

1. **Result merger** (`result-merger.ts`): Pass through pacing fields from analyst to `ContinuationGenerationResult`. When analyst is null, default to `pacingIssueDetected: false`, `pacingIssueReason: ''`, `recommendedAction: 'none'`.

2. **Page service** (`page-service.ts`): After the existing deviation handling block in `generateNextPage`:
   - If `recommendedAction === 'rewrite'` and no deviation was triggered: log a warning with `pacingIssueReason` and `pagesInCurrentBeat`. Do NOT trigger actual rewrite (deferred per spec).
   - If `recommendedAction === 'nudge'` and no deviation was triggered: log info. Set `pacingNudge` on the resulting `AccumulatedStructureState` to `pacingIssueReason`.
   - Otherwise: set `pacingNudge` to `null` (fire-once: if a previous page had a nudge, it should not persist unless the analyst fires again).

## Files to touch

| File | Change |
|------|--------|
| `src/llm/result-merger.ts` | Add `pacingIssueDetected`, `pacingIssueReason`, `recommendedAction` to returned object, with null-safe defaults from analyst. |
| `src/engine/page-service.ts` | Add pacing response logic after deviation handling. Set `pacingNudge` on structure state based on `recommendedAction`. |
| `test/unit/llm/result-merger.test.ts` | Test pacing field pass-through: analyst present with pacing fields, analyst null (defaults), analyst with no pacing issue. |
| `test/unit/engine/page-service.test.ts` | Test: when analyst returns `recommendedAction: 'nudge'`, resulting structure state has `pacingNudge` set. When `recommendedAction: 'none'`, `pacingNudge` is null. When `recommendedAction: 'rewrite'`, a warning is logged but no rewrite triggered. Fire-once: `pacingNudge` clears when analyst says 'none'. |

## Out of scope

- Analyst type definitions -- STOARCIMP-05.
- Analyst schema/validation/transformer -- STOARCIMP-05.
- Analyst prompt pacing instructions -- STOARCIMP-08.
- Continuation prompt nudge injection -- STOARCIMP-08.
- Writer/structure prompt changes -- STOARCIMP-07, STOARCIMP-08.
- `AccumulatedStructureState` type changes -- STOARCIMP-02.
- Data model changes -- STOARCIMP-01.

## Acceptance criteria

### Tests that must pass

1. **Merger -- analyst with pacing fields**: Given analyst with `pacingIssueDetected: true`, `pacingIssueReason: 'Stalled'`, `recommendedAction: 'nudge'`, merged result includes these values.
2. **Merger -- analyst null**: Merged result has `pacingIssueDetected: false`, `pacingIssueReason: ''`, `recommendedAction: 'none'`.
3. **Merger -- analyst with no pacing issue**: `pacingIssueDetected: false` passes through correctly.
4. **Page service -- nudge sets pacingNudge**: When continuation result has `recommendedAction: 'nudge'` and `pacingIssueReason: 'Beat stalled'`, the page's structure state has `pacingNudge: 'Beat stalled'`.
5. **Page service -- no issue clears pacingNudge**: When `recommendedAction: 'none'`, `pacingNudge` is `null` on the result state (even if parent had a nudge).
6. **Page service -- rewrite logs but does not rewrite**: When `recommendedAction: 'rewrite'`, a `logger.warn` is called and no deviation/rewrite flow is triggered.
7. **Page service -- deviation takes priority**: When deviation is detected, pacing logic is skipped entirely.
8. **All existing result-merger and page-service tests pass**.
9. **TypeScript build (`npm run typecheck`) passes**.

### Invariants that must remain true

- **Page immutability**: Generated pages never change after creation.
- **Branch isolation**: `pacingNudge` is per-branch (inherited from parent state).
- **Deviation priority**: Deviation handling always takes precedence over pacing.
- **No actual rewrite for pacing**: `recommendedAction: 'rewrite'` only logs -- no structure rewrite triggered.
- **Fire-once nudge**: `pacingNudge` clears after consumption unless analyst fires again.
- **All existing tests pass**.

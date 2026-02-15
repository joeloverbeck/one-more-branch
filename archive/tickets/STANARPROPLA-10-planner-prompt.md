# STANARPROPLA-10: Update planner prompt to display tracked promises with soft encouragement

**Status**: COMPLETED
**Depends on**: STANARPROPLA-01, STANARPROPLA-02, STANARPROPLA-09
**Blocks**: STANARPROPLA-12

## Summary

The migration from `NarrativePromise` to `TrackedPromise` is already complete in this codebase. The remaining work is to refine `buildTrackedPromisesSection()` so planner-facing promise rendering is structurally clearer and more actionable: sort oldest-first, split aging (`age >= THREAD_PACING.PROMISE_AGING_NOTICE_PAGES`) from recent promises, and apply soft encouragement language to the aging group without turning promises into mandates.

## Reassessed assumptions (vs current codebase)

- `buildNarrativePromisesSection()` is already removed; `buildTrackedPromisesSection()` is already in use.
- `continuation-context.ts` already calls `buildTrackedPromisesSection(context.accumulatedPromises ?? [])`.
- `TrackedPromise` is imported via `models/state/index.ts` in the target file, not directly from `models/state/keyed-entry.ts`.
- The live threshold is `THREAD_PACING.PROMISE_AGING_NOTICE_PAGES = 5` (not 3).
- Existing implementation currently uses one mixed list with inline `"reincorporation opportunity"` tagging, which is less explicit than separate aging/recent sections.

## File list

- **Modify**: `src/llm/prompts/sections/planner/thread-pacing-directive.ts`
  - Keep `buildTrackedPromisesSection(accumulatedPromises: readonly TrackedPromise[]): string` as the single formatter.
  - Refactor rendering to split into two explicit groups:
    - aging promises (`age >= THREAD_PACING.PROMISE_AGING_NOTICE_PAGES`)
    - recent promises (`age < THREAD_PACING.PROMISE_AGING_NOTICE_PAGES`)
  - Preserve oldest-first ordering across displayed items.
  - Keep tone as soft encouragement for aging promises (opportunities, not mandates).
  - Keep return behavior: empty string when there are no promises.

- **Modify**: `src/llm/prompts/sections/planner/continuation-context.ts`
  - No baseline migration work required (already done).
  - Only update if needed to accommodate revised section text output.

- **Create or modify**: `test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts`
  - Test: returns empty string when no promises
  - Test: sorts promises oldest-first and formats with IDs and age
  - Test: separates aging vs recent promises at `PROMISE_AGING_NOTICE_PAGES` threshold (currently 5)
  - Test: includes soft encouragement language for aging section and no mandatory wording
  - Test: threshold edge case (`age === PROMISE_AGING_NOTICE_PAGES`) is classified as aging

## Out of scope

- Do NOT modify writer prompts (writer doesn't interact with promises)
- Do NOT modify accountant prompt behavior in this ticket
- Do NOT modify analyst prompt - that's STANARPROPLA-11
- Do NOT modify `page-service.ts` or `page-builder.ts`
- Do NOT modify the planner's JSON Schema or types (the planner doesn't output promise data)

## Acceptance criteria

### Specific tests that must pass

- `npx jest test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts --testNamePattern="buildTrackedPromisesSection" --no-coverage` - all updated tests PASS
- Existing thread pacing tests (overdue thread directives) still PASS

### Invariants that must remain true

- Aging threshold is `THREAD_PACING.PROMISE_AGING_NOTICE_PAGES` (configurable, currently 5)
- Aging promises are presented with soft encouragement (opportunities for reincorporation), not mandates
- Each promise line includes: `[pr-N]`, `(PROMISE_TYPE/URGENCY, N pages)`, description
- Promises are sorted oldest-first (highest age first)
- The section header remains `=== TRACKED PROMISES (implicit foreshadowing not yet captured as threads) ===`
- Returns empty string (not a header with no content) when there are no promises
- All other planner prompt sections (beat context, thread pacing, choice intents, etc.) are unchanged

## Outcome

- Completed on: 2026-02-14
- Actually changed:
  - Refined `buildTrackedPromisesSection()` to explicitly split promises into aging vs recent groups using `THREAD_PACING.PROMISE_AGING_NOTICE_PAGES`.
  - Preserved oldest-first ordering and explicit ID/type/urgency/age formatting for each promise line.
  - Added soft-encouragement copy for aging promises and explicit non-mandatory framing.
  - Strengthened unit tests for ordering, threshold grouping, exact-threshold edge case, and wording guarantees.
- Deviation from original plan:
  - Baseline migration tasks in this ticket were already completed before this work began (`buildTrackedPromisesSection` already wired in continuation context).
  - Because `buildTrackedPromisesSection()` is shared, the wording update also affects state-accountant prompt context formatting. Behavior remains soft and consistent with tracked-promise architecture.
- Verification:
  - `npx jest test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts --testNamePattern="buildTrackedPromisesSection" --no-coverage` PASS
  - `npx jest test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts --no-coverage` PASS
  - `npm run typecheck` PASS
  - `npm run lint` PASS

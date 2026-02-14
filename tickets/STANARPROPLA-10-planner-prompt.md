# STANARPROPLA-10: Update planner prompt to display tracked promises with soft encouragement

**Status**: PENDING
**Depends on**: STANARPROPLA-01, STANARPROPLA-02, STANARPROPLA-09
**Blocks**: STANARPROPLA-12

## Summary

Replace `buildNarrativePromisesSection()` with `buildTrackedPromisesSection()` that sorts promises oldest-first, separates aging (>= PROMISE_AGING_NOTICE_PAGES) from recent, and presents aging promises with soft encouragement language. Update the continuation context prompt section to call the new function.

## File list

- **Modify**: `src/llm/prompts/sections/planner/thread-pacing-directive.ts`
  - Remove `buildNarrativePromisesSection()` function
  - Remove import of `NarrativePromise`
  - Add import: `TrackedPromise` from `'../../../../models/state/keyed-entry.js'`, `THREAD_PACING` from `'../../../../config/thread-pacing-config.js'`
  - Add `buildTrackedPromisesSection(promises: readonly TrackedPromise[]): string` (exported)
  - Function behavior: returns empty string if no promises; sorts oldest-first; splits into aging (age >= `PROMISE_AGING_NOTICE_PAGES`) and recent; formats aging section with soft encouragement header, recent section below

- **Modify**: `src/llm/prompts/sections/planner/continuation-context.ts`
  - Replace call to `buildNarrativePromisesSection` with `buildTrackedPromisesSection`
  - Pass `context.accumulatedPromises ?? []` instead of old fields
  - Update the template string to use the new section variable name

- **Create or modify**: `test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts`
  - Test: returns empty string when no promises
  - Test: sorts promises oldest-first and formats with IDs and age
  - Test: separates aging vs recent promises at PROMISE_AGING_NOTICE_PAGES threshold
  - Test: includes soft encouragement language for aging section

## Out of scope

- Do NOT modify writer prompts (writer doesn't interact with promises)
- Do NOT modify accountant prompts
- Do NOT modify analyst prompt - that's STANARPROPLA-11
- Do NOT modify `page-service.ts` or `page-builder.ts`
- Do NOT modify the planner's JSON Schema or types (the planner doesn't output promise data)

## Acceptance criteria

### Specific tests that must pass

- `npx jest test/unit/llm/prompts/sections/planner/thread-pacing-directive.test.ts --testNamePattern="buildTrackedPromisesSection" --no-coverage` - all new tests PASS
- Existing thread pacing tests (overdue thread directives) still PASS

### Invariants that must remain true

- Aging threshold is `THREAD_PACING.PROMISE_AGING_NOTICE_PAGES` (configurable, currently 3)
- Aging promises are presented with soft encouragement: "represent opportunities for reincorporation. Consider whether any fit naturally into the upcoming scene" - NOT mandates
- Each promise line includes: `[pr-N]`, `(PROMISE_TYPE/URGENCY, N pages)`, description
- Promises are sorted oldest-first (highest age first)
- The section header is `=== ACTIVE NARRATIVE PROMISES ===`
- Returns empty string (not a header with no content) when there are no promises
- All other planner prompt sections (beat context, thread pacing, choice intents, etc.) are unchanged

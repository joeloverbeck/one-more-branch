# WRIANASPL-06: Add buildWriterStructureContext() to story-structure-section.ts

## Summary

Add a new function `buildWriterStructureContext()` to the existing `story-structure-section.ts` file. This function provides story structure context to the writer LLM call — showing acts, beats, and status — but **without** any evaluation or deviation detection instructions. The writer sees structure for creative context only.

## Files to Touch

- `src/llm/prompts/continuation/story-structure-section.ts` — Add `buildWriterStructureContext()` function
- `test/unit/llm/prompts/continuation/writer-structure-context.test.ts` — **New file**: Unit tests

## Out of Scope

- Do NOT modify `buildStoryStructureSection()` — it is preserved (deprecated) for backward compat
- Do NOT modify or remove `DEVIATION_DETECTION_SECTION`, `getRemainingBeats`, or `buildActiveStateForBeatEvaluation`
- Do NOT create the analyst structure evaluation function (that is WRIANASPL-07)
- Do NOT update `continuation/index.ts` exports (that is WRIANASPL-10)
- Do NOT modify `continuation-prompt.ts` (that is WRIANASPL-08)

## Implementation Details

Add to `src/llm/prompts/continuation/story-structure-section.ts`:

```typescript
export function buildWriterStructureContext(
  structure: StoryStructure | undefined,
  accumulatedStructureState: AccumulatedStructureState | undefined,
): string
```

**Signature difference from `buildStoryStructureSection`**: No `activeState` parameter — the writer doesn't need it.

**Returns empty string** if `structure` or `accumulatedStructureState` is undefined/null.

**Includes** (same as current `buildStoryStructureSection`):
- `=== STORY STRUCTURE ===` header
- `Overall Theme: ${structure.overallTheme}`
- `CURRENT ACT:` with name, objective, stakes
- `BEATS IN THIS ACT:` with beat lines showing `[x] CONCLUDED`, `[>] ACTIVE`, `[ ] PENDING` status (identical format to current function)
- `REMAINING ACTS:` overview

**Does NOT include** (removed compared to `buildStoryStructureSection`):
- `=== BEAT EVALUATION ===` section
- `DEVIATION_DETECTION_SECTION`
- `REMAINING BEATS TO EVALUATE FOR DEVIATION:` section
- `PROGRESSION CHECK:` hint
- `buildActiveStateForBeatEvaluation()` output
- Any evaluation instructions whatsoever

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/prompts/continuation/writer-structure-context.test.ts`:
  - Returns empty string when structure is undefined
  - Returns empty string when accumulatedStructureState is undefined
  - Returns empty string when currentAct is out of bounds
  - Includes overall theme
  - Includes current act name, objective, stakes
  - Shows beat status lines (concluded with resolution, active with objective, pending)
  - Includes remaining acts overview
  - Does NOT contain "BEAT EVALUATION"
  - Does NOT contain "DEVIATION"
  - Does NOT contain "REMAINING BEATS TO EVALUATE"
  - Does NOT contain "PROGRESSION CHECK"
  - Does NOT contain "CURRENT STATE (for beat evaluation)"

### Invariants that must remain true

- `buildStoryStructureSection()` is unchanged and still exported
- `DEVIATION_DETECTION_SECTION` constant is unchanged
- `getRemainingBeats()` function is unchanged
- `buildActiveStateForBeatEvaluation()` function is unchanged
- All existing tests in `story-structure-section.test.ts` still pass

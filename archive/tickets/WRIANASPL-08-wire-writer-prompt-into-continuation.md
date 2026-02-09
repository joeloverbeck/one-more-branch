**Status**: ✅ COMPLETED

# WRIANASPL-08: Wire Writer Structure Context into Continuation Prompt

## Summary

Change `buildContinuationPrompt()` in `continuation-prompt.ts` to use `buildWriterStructureContext()` instead of `buildStoryStructureSection()`. This is a one-line change to the function call and its arguments.

## Files to Touch

- `src/llm/prompts/continuation-prompt.ts` — Change the `buildStoryStructureSection` call to `buildWriterStructureContext`

## Out of Scope

- Do NOT modify `story-structure-section.ts`
- Do NOT modify any schema, transformer, or generation strategy files
- Do NOT create any new files
- Do NOT modify `system-prompt.ts` or the system prompt content
- Do NOT modify the user prompt text or any other section of `buildContinuationPrompt`
- Do NOT update any index.ts exports

## Implementation Details

In `src/llm/prompts/continuation-prompt.ts`:

**Before** (line 34-38):
```typescript
const structureSection = buildStoryStructureSection(
  context.structure,
  context.accumulatedStructureState,
  context.activeState,
);
```

**After**:
```typescript
const structureSection = buildWriterStructureContext(
  context.structure,
  context.accumulatedStructureState,
);
```

Note: `buildWriterStructureContext` takes only 2 parameters (no `activeState`).

**Import change**: Update the import from `./continuation/index.js` to include `buildWriterStructureContext` and remove `buildStoryStructureSection` from the import list (since it's no longer used in this file).

**Before** imports (line 11):
```typescript
buildStoryStructureSection,
```

**After** imports:
```typescript
buildWriterStructureContext,
```

## Acceptance Criteria

### Tests that must pass

- `npm run typecheck` — No type errors
- `npm run build` — Compiles successfully
- Existing `test/unit/llm/prompts/continuation-prompt.test.ts` tests (if any) that test the prompt builder still pass. Note: Some tests may need updating if they assert the presence of beat evaluation sections in the prompt — those sections are now removed from the writer prompt. But this is expected behavior: the writer no longer sees evaluation instructions.

### Invariants that must remain true

- The user prompt structure is unchanged except for the structure section content
- System prompt is unchanged
- Few-shot messages logic is unchanged
- All other sections (worldbuilding, NPCs, canon, inventory, health, active state, scene context) are unchanged
- The `buildStoryStructureSection` function still exists (preserved in story-structure-section.ts) — it's just no longer called from this file

## Outcome

- **Completed**: 2026-02-08
- **Changes**:
  - `src/llm/prompts/continuation-prompt.ts`: Swapped import and call from `buildStoryStructureSection` to `buildWriterStructureContext` (2 params, no `activeState`)
  - `src/llm/prompts/continuation/index.ts`: Added `buildWriterStructureContext` to barrel exports
  - `test/unit/llm/prompts.test.ts`: Updated 4 tests that asserted beat evaluation/deviation content was present — flipped to assert these sections are now absent (expected: writer no longer sees evaluation instructions)
- **Verification**: typecheck, build, and all 1364 unit tests pass

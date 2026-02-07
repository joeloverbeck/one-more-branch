# STRSTOARCSYS-006: Update Continuation Prompt

## Status
Completed (2026-02-07).

## Summary
Update the continuation prompt to display full structure state and request beat completion evaluation when structure context is available.

Current codebase note: `storyArc` is still referenced by engine/persistence paths outside this ticket, so this ticket preserves `ContinuationContext.storyArc` for compatibility and only removes prompt text that surfaces it.

## Files to Touch
- `src/llm/prompts/continuation-prompt.ts`
- `src/llm/types.ts` (add structure fields to ContinuationContext)
- `test/unit/llm/prompts.test.ts` (continuation prompt tests live here)

## Out of Scope
- DO NOT modify `opening-prompt.ts` (that's STRSTOARCSYS-005)
- DO NOT modify `structure-prompt.ts` (that's STRSTOARCSYS-004)
- DO NOT modify schemas (that's STRSTOARCSYS-012)
- DO NOT modify engine layer
- DO NOT implement the structure progression logic

## Implementation Details

### Update `ContinuationContext` Interface

In `src/llm/types.ts`:

```typescript
// BEFORE
export interface ContinuationContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: readonly string[];
  globalCharacterCanon: Readonly<Record<string, readonly string[]>>;
  storyArc: string | null;  // REMOVE
  previousNarrative: string;
  selectedChoice: string;
  accumulatedState: readonly string[];
  accumulatedInventory: readonly string[];
  accumulatedHealth: readonly string[];
  accumulatedCharacterState: Readonly<Record<string, readonly string[]>>;
}

// AFTER (compatibility-preserving in this ticket)
export interface ContinuationContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  globalCanon: readonly string[];
  globalCharacterCanon: Readonly<Record<string, readonly string[]>>;
  storyArc: string | null; // retained for cross-ticket compatibility
  structure?: StoryStructure;                      // NEW
  accumulatedStructureState?: AccumulatedStructureState;  // NEW
  previousNarrative: string;
  selectedChoice: string;
  accumulatedState: readonly string[];
  accumulatedInventory: readonly string[];
  accumulatedHealth: readonly string[];
  accumulatedCharacterState: Readonly<Record<string, readonly string[]>>;
}
```

### Modify `buildContinuationPrompt()`

When `structure` and `accumulatedStructureState` are present, build a detailed structure section:

```
=== STORY STRUCTURE ===
Overall Theme: [theme]

CURRENT ACT: [current act name] (Act [N] of 3)
Objective: [act objective]
Stakes: [act stakes]

BEATS IN THIS ACT:
  ✓ CONCLUDED: [beat 1 description]
    Resolution: [how it was resolved]
  → ACTIVE: [beat 2 description]
    Objective: [beat 2 objective]
  ○ PENDING: [beat 3 description]

REMAINING ACTS:
  - Act 2: [name] - [objective]
  - Act 3: [name] - [objective]

=== BEAT EVALUATION ===
After writing the narrative, evaluate:
1. Has the current beat's objective been achieved in this scene?
2. If yes, set beatConcluded: true and describe how it was resolved.
3. If no, set beatConcluded: false and leave beatResolution empty.

Do not force beat completion - only conclude if naturally achieved.
```

### Remove storyArc Handling

- Remove continuation prompt text that reads/displays `context.storyArc`
- Keep the `ContinuationContext.storyArc` field itself for now

### Beat Status Visualization

Use the `accumulatedStructureState.beatProgressions` to determine:
- Which beats are `concluded` (show with resolution)
- Which beat is `active` (highlight as current)
- Which beats are `pending` (show as upcoming)

### Output Instructions

Add clear instructions about new output fields:
- `beatConcluded`: boolean
- `beatResolution`: string (required if beatConcluded is true)

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/llm/prompts.test.ts` under `describe('buildContinuationPrompt', ...)`:

1. `buildContinuationPrompt` without structure (backwards compat)
   - Works when `structure` and `accumulatedStructureState` not provided
   - Does not include structure section

2. `buildContinuationPrompt` with structure
   - Includes detailed structure section
   - Shows beat statuses from `accumulatedStructureState`
   - Shows beat resolutions for concluded beats
   - Includes beat evaluation instructions

3. Structure visualization
   - Shows current act name and number
   - Shows act objective and stakes
   - Shows all beats with correct status markers
   - Shows remaining acts overview

4. Beat evaluation instructions
   - Includes clear instructions about `beatConcluded`
   - Includes instructions about `beatResolution`
   - Emphasizes not forcing beat completion

5. Removed functionality
   - No `storyArc` section in prompt

### Invariants That Must Remain True
- Prompt still includes all existing context (canon, state, inventory, etc.)
- Prompt still includes content policy
- Prompt still follows ChatMessage[] format
- Existing continuation functionality not related to structure still works

## Dependencies
- STRSTOARCSYS-001 (needs StoryStructure and AccumulatedStructureState types)

## Breaking Changes
None in this ticket (compatibility-preserving scope).

## Estimated Scope
~120 lines of code changes + ~150 lines of test updates

## Outcome
- Implemented:
  - Added optional `structure` and `accumulatedStructureState` fields to `ContinuationContext`.
  - Updated `buildContinuationPrompt()` to render a detailed structure section and beat evaluation instructions when structure context is present.
  - Removed continuation prompt rendering of `storyArc` text.
  - Updated continuation prompt coverage in `test/unit/llm/prompts.test.ts`, including:
    - structure-enabled rendering assertions,
    - backwards-compatible no-structure behavior,
    - explicit no-story-arc rendering assertion,
    - edge-case invalid act index behavior.
- Adjusted from original plan:
  - Kept `ContinuationContext.storyArc` in the type for current cross-ticket compatibility; no public API break in this ticket.
  - Updated test target from the non-existent `test/unit/llm/prompts/continuation-prompt.test.ts` to the existing `test/unit/llm/prompts.test.ts`.

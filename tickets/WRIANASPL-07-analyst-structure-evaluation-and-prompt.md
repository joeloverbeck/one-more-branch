# WRIANASPL-07: Add buildAnalystStructureEvaluation() and Create Analyst Prompt

## Summary

Two related pieces: (1) Add `buildAnalystStructureEvaluation()` to `story-structure-section.ts` — the structure evaluation section for the analyst call. (2) Create `analyst-prompt.ts` — the prompt builder that composes the analyst system and user messages.

## Files to Touch

- `src/llm/prompts/continuation/story-structure-section.ts` — Add `buildAnalystStructureEvaluation()` function
- `src/llm/prompts/analyst-prompt.ts` — **New file**: `buildAnalystPrompt()` function
- `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts` — **New file**: Tests for structure evaluation
- `test/unit/llm/prompts/analyst-prompt.test.ts` — **New file**: Tests for analyst prompt builder

## Out of Scope

- Do NOT modify `buildStoryStructureSection()` or `buildWriterStructureContext()`
- Do NOT modify `continuation-prompt.ts`
- Do NOT update any index.ts exports (that is WRIANASPL-10)
- Do NOT create generation strategy files (that is WRIANASPL-09)

## Implementation Details

### `buildAnalystStructureEvaluation()`

Add to `src/llm/prompts/continuation/story-structure-section.ts`:

```typescript
export function buildAnalystStructureEvaluation(
  structure: StoryStructure,
  accumulatedStructureState: AccumulatedStructureState,
  activeState: ActiveState,
): string
```

**Note**: Parameters are NOT optional — this function is only called when structure exists.

Contains the **evaluation-focused** content from the current `buildStoryStructureSection()`, reframed for the analyst:

- Overall theme
- Current act: name, objective, stakes
- Beat lines with status (same format)
- Remaining acts overview
- `buildActiveStateForBeatEvaluation(activeState)` output
- `=== BEAT EVALUATION ===` section — reworded: "Evaluate the following narrative against this structure" instead of "After writing the narrative"
- `REMAINING BEATS TO EVALUATE FOR DEVIATION:` section (using `getRemainingBeats()`)
- `PROGRESSION CHECK:` hint (same logic as current)
- `DEVIATION_DETECTION_SECTION`

### `buildAnalystPrompt()`

Create `src/llm/prompts/analyst-prompt.ts`:

```typescript
export function buildAnalystPrompt(context: AnalystContext): ChatMessage[]
```

Import `AnalystContext` from `../types.js` and `ChatMessage` from `../types.js`.

Returns a messages array:

1. **System message**: Fixed system prompt:
```
You are a story structure analyst for interactive fiction. Your role is to evaluate a narrative passage against a planned story structure and determine:
1. Whether the current story beat has been concluded
2. Whether the narrative has deviated from the planned beats

You analyze ONLY structure progression and deviation. You do NOT write narrative or make creative decisions.

Be analytical and precise. Evaluate cumulative progress, not just single scenes.
Be conservative about deviation - minor variations are acceptable. Only mark true deviation when future beats are genuinely invalidated.
```

2. **User message**: Composed from:
   - `buildAnalystStructureEvaluation(context.structure, context.accumulatedStructureState, context.activeState)`
   - `\nNARRATIVE TO EVALUATE:\n${context.narrative}`

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts`:
  - Includes overall theme
  - Includes current act name, objective, stakes
  - Shows beat status lines
  - Includes remaining acts
  - Includes `BEAT EVALUATION` section
  - Includes `DEVIATION` section
  - Includes `REMAINING BEATS TO EVALUATE FOR DEVIATION`
  - Includes active state summary (from `buildActiveStateForBeatEvaluation`)
  - Uses evaluation-focused language (NOT "After writing the narrative")
  - Includes `PROGRESSION CHECK` hint when pending beats exist

- `test/unit/llm/prompts/analyst-prompt.test.ts`:
  - Returns array with 2 messages (system + user)
  - System message has role 'system' with analyst instructions
  - User message has role 'user'
  - User message contains structure evaluation section
  - User message contains `NARRATIVE TO EVALUATE:` followed by the narrative text
  - System message mentions "story structure analyst"
  - System message mentions "conservative about deviation"

### Invariants that must remain true

- `buildStoryStructureSection()` is unchanged
- `buildWriterStructureContext()` (from WRIANASPL-06) is unchanged
- All existing tests pass

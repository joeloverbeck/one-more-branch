# STRREWSYS-007: Add Deviation Detection to Continuation Prompt

## Summary
Extend the continuation prompt to instruct the LLM to evaluate whether the story has deviated from planned beats, and update the response format to include deviation signals.

## Dependencies
- None (can proceed independently)

## Files to Touch

### Modified Files
- `src/llm/prompts/continuation-prompt.ts`
- `test/unit/llm/prompts.test.ts` (if exists, or create test)

## Out of Scope
- Do NOT modify opening-prompt.ts (opening pages cannot have deviation)
- Do NOT modify response parsing (handled in STRREWSYS-008)
- Do NOT modify LLM client
- Do NOT modify system-prompt.ts

## Implementation Details

### `src/llm/prompts/continuation-prompt.ts` Changes

Add deviation detection section after the beat evaluation section (around line 72):

```typescript
const DEVIATION_DETECTION_SECTION = `
=== BEAT DEVIATION EVALUATION ===

After evaluating beat completion, also check if the story has DEVIATED from the remaining planned beats.

A deviation occurs when:
- Player choices have fundamentally changed the story direction
- Key assumptions in future beats are now invalid (e.g., "rescue allies" when player joined the enemy)
- The protagonist's goals or circumstances have shifted so dramatically that future beats don't make sense
- Story elements required for future beats no longer exist

Evaluate ONLY beats that have NOT been concluded. Never re-evaluate completed beats.

If deviation IS detected:
DEVIATION: YES
DEVIATION_REASON: [Clear explanation of why remaining beats are invalidated]
INVALIDATED_BEATS: [Comma-separated beat IDs that are now invalid, e.g., "2.2, 2.3, 3.1, 3.2, 3.3"]
NARRATIVE_SUMMARY: [1-2 sentence summary of current story state for structure regeneration]

If NO deviation:
DEVIATION: NO

IMPORTANT: Only signal deviation when future beats are truly impossible or nonsensical given current events. Minor variations are fine - beats are flexible milestones, not rigid gates.
`;
```

Update the `buildContinuationPrompt` function to include deviation section when structure exists:

```typescript
export function buildContinuationPrompt(
  context: ContinuationContext,
  options?: PromptOptions,
): ChatMessage[] {
  // ... existing code ...

  const structureSection =
    context.structure && context.accumulatedStructureState
      ? ((): string => {
          // ... existing structure section code ...

          // Add remaining beats display for deviation evaluation
          const remainingBeats = getRemainingBeats(structure, state);
          const remainingBeatsSection = remainingBeats.length > 0
            ? `\nREMAINING BEATS TO EVALUATE FOR DEVIATION:\n${remainingBeats.map(b => `  - ${b.id}: ${b.description}`).join('\n')}`
            : '';

          return `=== STORY STRUCTURE ===
// ... existing content ...

${remainingBeatsSection}

${DEVIATION_DETECTION_SECTION}
`;
        })()
      : '';

  // ... rest of function ...
}
```

Add helper function:
```typescript
function getRemainingBeats(
  structure: StoryStructure,
  state: AccumulatedStructureState
): Array<{ id: string; description: string }> {
  const concludedIds = new Set(
    state.beatProgressions
      .filter(bp => bp.status === 'concluded')
      .map(bp => bp.beatId)
  );

  const remaining: Array<{ id: string; description: string }> = [];

  for (const act of structure.acts) {
    for (const beat of act.beats) {
      if (!concludedIds.has(beat.id)) {
        remaining.push({ id: beat.id, description: beat.description });
      }
    }
  }

  return remaining;
}
```

Update the response format in the user prompt to include deviation fields:

```typescript
// At end of REQUIREMENTS section, add:
const RESPONSE_FORMAT_ADDITION = `

RESPONSE FORMAT (include ALL sections):
... existing format ...

BEAT_CONCLUDED: [YES/NO]
BEAT_RESOLUTION: [Resolution text if concluded]

DEVIATION: [YES/NO]
DEVIATION_REASON: [If YES - why beats are invalidated]
INVALIDATED_BEATS: [If YES - comma-separated beat IDs]
NARRATIVE_SUMMARY: [If YES - current story state summary]

IS_ENDING: [YES/NO]`;
```

### Test Updates

Add to existing prompt tests or create new:
```typescript
describe('buildContinuationPrompt with deviation detection', () => {
  it('should include deviation detection section when structure exists');
  it('should not include deviation section when no structure');
  it('should list remaining beats for evaluation');
  it('should not list concluded beats');
  it('should include response format with deviation fields');
});
```

## Acceptance Criteria

### Tests That Must Pass
- Prompt construction tests validate deviation section inclusion
- Run with: `npm test -- --grep "continuation.*prompt"`

### Invariants That Must Remain True
1. **Structure required** - Deviation section only appears when structure and state exist
2. **Concluded beats excluded** - Only pending/active beats listed for evaluation
3. **Response format complete** - All deviation fields documented in expected format
4. **Backward compatibility** - Prompts without structure work unchanged
5. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- The LLM is instructed to be conservative - deviation only for truly impossible beats
- Response format documents all fields to ensure consistent parsing
- Remaining beats are explicitly listed so LLM knows what to evaluate
- This is the "input" side; parsing the output is in STRREWSYS-008

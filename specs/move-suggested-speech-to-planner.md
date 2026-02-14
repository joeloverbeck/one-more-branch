# Move suggestedProtagonistSpeech from Writer to Planner

**Status**: IN PROGRESS

## Context

The `suggestedProtagonistSpeech` field lets players suggest dialogue for their protagonist before making a choice. Currently, this text is wired **only to the writer prompt** (`continuation-prompt.ts:207-220`) as "optional guidance" with hedging language ("Treat this as optional intent... If circumstances do not support it, omit it."). The planner never sees it.

**Problem**: By the time the writer receives the suggestion, it already has comprehensive instructions from the planner (sceneIntent, writerBrief, choiceIntents) and the lorekeeper (story bible). The writer frequently ignores the suggestion because the scene plan doesn't account for it.

**Solution**: Move the suggested speech instruction to the **planner prompt**, where it will shape the entire page plan (scene intent, must-include beats, choice consequences). Remove it from the writer entirely. No schema changes needed - the planner's existing output fields naturally communicate speech intent to the writer.

## Files to Modify

| File | Change |
|------|--------|
| `src/llm/prompts/sections/planner/continuation-context.ts` | Add suggested speech section to `buildPlannerContinuationContextSection()` |
| `src/llm/prompts/continuation-prompt.ts` | Remove suggested speech section (lines 207-220 and reference on line 229) |
| `test/unit/llm/prompts/sections/planner/continuation-context.test.ts` | Add 3 tests for planner speech section |
| `test/unit/llm/prompts/continuation-prompt.test.ts` | Update 3 existing tests to assert speech is ABSENT from writer |

## No Changes Needed

- **Type definitions** (`src/llm/context-types.ts`): `ContinuationPagePlanContext extends ContinuationContext` which already has `suggestedProtagonistSpeech` (line 55). The planner context builder just needs to read it.
- **Planner schema** (`src/llm/schemas/page-planner-schema.ts`): Existing output fields (`sceneIntent`, `writerBrief.mustIncludeBeats`, `choiceIntents`) are sufficient to communicate speech intent.
- **Route/engine/context-builder**: Data flow unchanged - speech still enters via POST route, flows through `MakeChoiceOptions` -> `ContinuationContext`. Only prompt consumption changes.
- **Lorekeeper**: Already receives `pagePlan` as input. If planner shapes the plan around the speech, lorekeeper naturally curates relevant context.
- **Client-side JS**: No changes - input collection, validation, and clearing logic remain identical.

## Change 1: Add to Planner Prompt

**File**: `src/llm/prompts/sections/planner/continuation-context.ts`
**Function**: `buildPlannerContinuationContextSection()`
**Location**: Insert before `PLAYER'S CHOICE:` (currently line 351)

Add a conditional section (same pattern as other optional sections like pacing briefing):

```
=== SUGGESTED PROTAGONIST SPEECH (PLAYER INTENT) ===
The player wants the protagonist to say something like:
"${suggestedProtagonistSpeech}"

Incorporate this into your plan:
- Shape the sceneIntent so the scene creates a natural moment for this speech
- Include a must-include beat in writerBrief that reflects the protagonist voicing this intent
- Consider how NPCs and the situation would react to this kind of statement
- Let the speech intent influence at least one choiceIntent's consequences

This is meaningful player input - plan around it, do not treat it as optional.
```

**Instruction design rationale**: Unlike the writer's old "optional guidance" framing, the planner instruction is **directive**. The planner shapes the entire scene, so it can build a scene where the speech makes narrative sense rather than hoping the writer finds room for it.

## Change 2: Remove from Writer Prompt

**File**: `src/llm/prompts/continuation-prompt.ts`
**Function**: `buildContinuationPrompt()`

1. Delete lines 207-220 (the `suggestedProtagonistSpeech` variable and `suggestedProtagonistSpeechSection` construction)
2. Remove `${suggestedProtagonistSpeechSection}` from the user prompt template (line 229)

The writer will now receive speech intent indirectly through the planner's output (sceneIntent, writerBrief.mustIncludeBeats, choiceIntents), which it already follows.

## Test Changes

### Planner Tests (`test/unit/llm/prompts/sections/planner/continuation-context.test.ts`)

Add 3 new tests:

1. **"includes suggested protagonist speech section when provided"**
   - Create context with `suggestedProtagonistSpeech: 'Get lost, I never want to see you again.'`
   - Assert output contains `SUGGESTED PROTAGONIST SPEECH (PLAYER INTENT)`
   - Assert output contains the quoted speech text
   - Assert output contains `do not treat it as optional`

2. **"omits suggested protagonist speech section when not provided"**
   - Create context without `suggestedProtagonistSpeech`
   - Assert output does NOT contain `SUGGESTED PROTAGONIST SPEECH`

3. **"omits suggested protagonist speech section when blank after trim"**
   - Create context with `suggestedProtagonistSpeech: '   '`
   - Assert output does NOT contain `SUGGESTED PROTAGONIST SPEECH`

### Writer Tests (`test/unit/llm/prompts/continuation-prompt.test.ts`)

Update existing tests (around lines 128-166):

1. **Modify "includes suggested protagonist speech guidance when provided"** -> Rename to "does NOT include suggested protagonist speech section even when provided"
   - Create context with `suggestedProtagonistSpeech: 'We can still leave through the north gate.'`
   - Assert output does NOT contain `SUGGESTED PROTAGONIST SPEECH`
   - Assert output does NOT contain `The protagonist has considered saying`

2. **Keep "omits suggested protagonist speech guidance when undefined"** -> Still passes (asserting absence)

3. **Keep "omits suggested protagonist speech guidance when field is blank after trim"** -> Still passes (asserting absence)

## Verification

1. `npm run typecheck` - no type errors (no type changes)
2. `npm test -- --testPathPattern="continuation-context.test|continuation-prompt.test"` - all tests pass
3. `npm run test:unit` - full unit suite passes
4. `npm run lint` - no lint issues

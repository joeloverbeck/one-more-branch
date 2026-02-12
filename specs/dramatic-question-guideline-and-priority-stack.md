# Spec: Dramatic Question Guideline and Priority Stack

## Overview

Add DRAMATIC COHERENCE as the #0 choice guideline in STRICT_CHOICE_GUIDELINES and add a priority stack footer to writer REQUIREMENTS in both opening and continuation prompts. This gives the writer clear prioritization when constraints conflict.

## Goals

1. Add a dramatic coherence guideline as the first choice requirement
2. Add a "WHEN IN CONFLICT, PRIORITIZE" section after REQUIREMENTS in both writer prompts
3. Ensure the priority stack is adapted for opening vs. continuation contexts

## Dependencies

- **Spec 4** (planner-choice-intents-and-dramatic-question) should be implemented first, since the dramatic coherence guideline references `dramaticQuestion` from the planner. However, the guideline degrades gracefully ("If the planner provided a dramaticQuestion..."), so this spec can technically be implemented independently.

## Implementation Details

### Dramatic Coherence Guideline

#### File: `src/llm/prompts/system-prompt-builder.ts`

Add as the first numbered item in `STRICT_CHOICE_GUIDELINES`, before the existing "1. IN-CHARACTER":

```
0. DRAMATIC COHERENCE: All choices must be natural answers to the same immediate dramatic question raised by the scene's final moment. If the planner provided a dramaticQuestion, ground your choices in it.
```

The existing items remain numbered 1-7. The full list becomes:

```
0. DRAMATIC COHERENCE: All choices must be natural answers to the same immediate dramatic question raised by the scene's final moment. If the planner provided a dramaticQuestion, ground your choices in it.
1. IN-CHARACTER: The protagonist would genuinely consider this action given their personality and situation
2. CONSEQUENTIAL: The choice meaningfully changes the story direction
3. DIVERGENT: Each choice MUST have a different choiceType OR primaryDelta from all other choices
4. ACTIONABLE: Describes a concrete action with active verbs (not "think about" or "consider")
5. BALANCED: Mix of cautious, bold, and creative options when appropriate
6. VERB-FIRST: Start each choice text with a clear immediate action verb (e.g., "Demand", "Flee", "Accept", "Attack")
7. SCENE-HOOKING: Each choice must introduce a distinct next-scene hook
```

### Priority Stack - Continuation Prompt

#### File: `src/llm/prompts/continuation-prompt.ts`

After the `REQUIREMENTS (follow all):` list and the `REMINDER:` paragraph, add:

```
WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. React to the player's choice immediately and visibly
2. Maintain consistency with established state, canon, and continuity
3. Choices answer the scene's dramatic question with divergent tags
4. Prose quality: character-filtered, emotionally resonant, forward-moving
5. sceneSummary and protagonistAffect accuracy
```

### Priority Stack - Opening Prompt

#### File: `src/llm/prompts/opening-prompt.ts`

After the `REQUIREMENTS (follow all):` list and the `REMINDER:` paragraph, add:

```
WHEN IN CONFLICT, PRIORITIZE (highest to lowest):
1. Ground the protagonist in the starting situation with immediate tension
2. Maintain consistency with established worldbuilding, tone, and character concept
3. Choices answer the scene's dramatic question with divergent tags
4. Prose quality: character-filtered, emotionally resonant, forward-moving
5. sceneSummary and protagonistAffect accuracy
```

Note: Item #1 differs between opening (no player choice to react to) and continuation (player choice reaction is paramount).

### What NOT to Change

- Existing choice requirement items (1-7) - content unchanged, only renumbered if needed
- DIVERGENCE ENFORCEMENT section - unchanged
- FORBIDDEN CHOICE PATTERNS section - unchanged
- CHOICE FORMATTING EXAMPLE - unchanged
- System prompt composition functions - unchanged
- Writer schemas - unchanged

## Invariants

- DRAMATIC COHERENCE is the first listed choice requirement (item 0)
- Priority stack appears after REQUIREMENTS and REMINDER in both prompts
- Existing choice quality requirements (IN-CHARACTER, CONSEQUENTIAL, DIVERGENT, etc.) are preserved and unchanged
- Opening prompt priority #1 is adapted for opening context (no "player's choice" to react to)
- Continuation prompt priority #1 references "the player's choice"
- Both priority stacks share items 2-5

## Test Impact

- Tests asserting exact text of `STRICT_CHOICE_GUIDELINES` must include the new DRAMATIC COHERENCE item
- Tests asserting opening prompt content must include the priority stack
- Tests asserting continuation prompt content must include the priority stack
- `npm run typecheck` must pass
- `npm run test` must pass

## Verification

1. Read `STRICT_CHOICE_GUIDELINES` and confirm DRAMATIC COHERENCE is item 0
2. Read opening prompt output and confirm priority stack is present with opening-specific item #1
3. Read continuation prompt output and confirm priority stack is present with continuation-specific item #1
4. Confirm existing choice requirements (1-7) are unchanged in content
5. Run `npm run typecheck && npm test`

# Spec: Planner Choice Intents and Dramatic Question

## Overview

Add `dramaticQuestion` and `choiceIntents` fields to the planner output. The planner will propose a scene-level dramatic question and 2-4 choice intents (hook + type/delta alignment). These are fed to the writer prompts as guidance, not mandates.

This is the highest-impact change in the prompt improvement batch. It gives the writer a structured blueprint for choices, improving coherence between planned scene intent and actual choices generated.

## Goals

1. Extend the planner schema, type, and prompt to produce `dramaticQuestion` and `choiceIntents`
2. Extend the planner validation and response transformer to handle new fields
3. Feed `dramaticQuestion` and `choiceIntents` to opening and continuation writer prompts
4. Writer treats these as guidance, not mandates - graceful degradation if empty

## Dependencies

**None** - This spec is self-contained. Spec 5 (dramatic-question-guideline-and-priority-stack) references `dramaticQuestion` but can be implemented independently.

## Implementation Details

### Planner Side

#### File: `src/llm/schemas/page-planner-schema.ts`

Add two new top-level properties to the schema:

```typescript
dramaticQuestion: {
  type: 'string',
  description: 'The single dramatic question this scene must raise and leave the choices to answer. Example: "Will you risk exposure to save the contact, or protect your cover?"',
},
choiceIntents: {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      hook: {
        type: 'string',
        description: 'A 1-sentence description of what this choice offers the protagonist.',
      },
      choiceType: {
        type: 'string',
        enum: [
          'TACTICAL_APPROACH', 'MORAL_DILEMMA', 'IDENTITY_EXPRESSION',
          'RELATIONSHIP_SHIFT', 'RESOURCE_COMMITMENT', 'INVESTIGATION',
          'PATH_DIVERGENCE', 'CONFRONTATION', 'AVOIDANCE_RETREAT',
        ],
        description: 'The intended ChoiceType for this choice.',
      },
      primaryDelta: {
        type: 'string',
        enum: [
          'LOCATION_CHANGE', 'GOAL_SHIFT', 'RELATIONSHIP_CHANGE',
          'URGENCY_CHANGE', 'ITEM_CONTROL', 'EXPOSURE_CHANGE',
          'CONDITION_CHANGE', 'INFORMATION_REVEALED', 'THREAT_SHIFT',
          'CONSTRAINT_CHANGE',
        ],
        description: 'The intended PrimaryDelta for this choice.',
      },
    },
    required: ['hook', 'choiceType', 'primaryDelta'],
    additionalProperties: false,
  },
  minItems: 2,
  maxItems: 4,
  description: 'Proposed choice intents for the writer. Each intent suggests a hook, choiceType, and primaryDelta. The writer may adjust these if the narrative takes an unexpected turn.',
},
```

Add `'dramaticQuestion'` and `'choiceIntents'` to the `required` array.

#### File: `src/llm/types.ts`

Add to `PagePlan` interface:

```typescript
export interface PagePlan {
  // ... existing fields ...
  dramaticQuestion: string;
  choiceIntents: Array<{
    hook: string;
    choiceType: ChoiceType;
    primaryDelta: PrimaryDelta;
  }>;
}
```

Add to `PagePlanGenerationResult` (it extends `PagePlan`, so the fields are inherited automatically).

#### File: `src/llm/prompts/page-planner-prompt.ts`

Update `PAGE_PLANNER_SYSTEM_PROMPT`:
- Remove the line: `- You do not produce player choices.`
- Add: `- You propose a dramaticQuestion that the scene raises and choiceIntents as a blueprint for the writer's choices.`
- Add: `- choiceIntents are suggestions, not final text. The writer may adjust wording and tags if the narrative warrants it.`

#### File: `src/llm/prompts/sections/planner/state-intent-rules.ts`

Add choice intent rules at the end of `PLANNER_STATE_INTENT_RULES`:

```
CHOICE INTENT RULES:
- Propose 2-4 choiceIntents aligned with the scene's dramatic question.
- Each intent must have a unique (choiceType, primaryDelta) combination.
- hook: a 1-sentence description of what the choice offers, not the final choice text.
- choiceType and primaryDelta must be valid enum values from the schema.
- Intents are guidance for the writer, not mandates. The writer may adjust if the narrative diverges.
- dramaticQuestion must be a single sentence framing the core tension the choices answer.
```

#### File: `src/llm/schemas/page-planner-validation-schema.ts`

Add Zod validation for new fields:

```typescript
const ChoiceIntentSchema = z.object({
  hook: z.string(),
  choiceType: z.nativeEnum(ChoiceType),
  primaryDelta: z.nativeEnum(PrimaryDelta),
});

// In PagePlannerResultSchema:
dramaticQuestion: z.string(),
choiceIntents: z.array(ChoiceIntentSchema).min(2).max(4),
```

Add to the `superRefine` block:
- `addRequiredTrimmedTextIssue(data.dramaticQuestion, ['dramaticQuestion'], ctx)`
- Validate each choice intent hook is non-empty
- Validate uniqueness of `(choiceType, primaryDelta)` pairs across intents

#### File: `src/llm/schemas/page-planner-response-transformer.ts`

In the `validatePagePlannerResponse` function, add to the return object:

```typescript
dramaticQuestion: validated.dramaticQuestion.trim(),
choiceIntents: validated.choiceIntents.map(intent => ({
  hook: intent.hook.trim(),
  choiceType: intent.choiceType,
  primaryDelta: intent.primaryDelta,
})),
```

### Writer Side

#### File: `src/llm/prompts/opening-prompt.ts`

After the existing `plannerSection`, add a `choiceIntentSection` that renders when `context.pagePlan?.choiceIntents` is present and non-empty:

```typescript
const choiceIntentSection = context.pagePlan?.choiceIntents?.length
  ? `=== CHOICE INTENT GUIDANCE (from planner) ===
Dramatic Question: ${context.pagePlan.dramaticQuestion}

Proposed Choice Intents:
${context.pagePlan.choiceIntents.map((intent, i) => `${i + 1}. [${intent.choiceType} / ${intent.primaryDelta}] ${intent.hook}`).join('\n')}

Use these choice intents as a starting blueprint. You may adjust if the narrative takes an unexpected turn, but aim to preserve the dramatic question framing and tag divergence.

`
  : '';
```

Insert `${choiceIntentSection}` in the user prompt after `${plannerSection}`.

#### File: `src/llm/prompts/continuation-prompt.ts`

Same pattern as opening-prompt.ts - add `choiceIntentSection` when `context.pagePlan?.choiceIntents` is present.

### What NOT to Change

- Writer schema (choices are still generated by the writer with full freedom on final text)
- State reconciliation pipeline
- Analyst prompt or schema
- Page builder or page service orchestration
- Existing `writerBrief` fields (openingLineDirective, mustIncludeBeats, forbiddenRecaps)

## Invariants

- Planner always outputs `dramaticQuestion` (non-empty string) and `choiceIntents` (array, 2-4 items)
- Each choice intent has `hook` (non-empty string), `choiceType` (valid ChoiceType enum), `primaryDelta` (valid PrimaryDelta enum)
- No two choice intents share the same `(choiceType, primaryDelta)` combination
- Writer prompts include choice intent guidance when available
- Writer is NOT mandated to follow intents exactly - they are guidance
- Opening prompt for the very first page also receives choice intents
- Existing choice generation still works if `choiceIntents` were somehow empty (graceful degradation via conditional section rendering)
- `PagePlan` type requires the new fields
- Zod validation schema enforces the new fields

## Test Impact

### Mock Updates Required

All test mocks creating `PagePlan` objects must include `dramaticQuestion` and `choiceIntents`. Grep for:
- `pagePlan:` or `pagePlan =` in test files
- `sceneIntent:` in test mock objects (likely part of PagePlan mocks)
- `PagePlan` type usage in test fixtures

Typical mock addition:
```typescript
dramaticQuestion: 'Will you confront the danger or seek another path?',
choiceIntents: [
  { hook: 'Face the threat directly', choiceType: ChoiceType.CONFRONTATION, primaryDelta: PrimaryDelta.THREAT_SHIFT },
  { hook: 'Find an alternative route', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.LOCATION_CHANGE },
  { hook: 'Gather more information first', choiceType: ChoiceType.INVESTIGATION, primaryDelta: PrimaryDelta.INFORMATION_REVEALED },
],
```

### New Tests

- Planner validation schema tests: verify `dramaticQuestion` and `choiceIntents` are required and correctly typed
- Planner validation schema tests: verify duplicate `(choiceType, primaryDelta)` pairs are rejected
- Planner validation schema tests: verify empty `dramaticQuestion` is rejected
- Planner response transformer tests: verify new fields are trimmed and included
- Opening prompt builder tests: verify choice intent section appears when intents are provided
- Continuation prompt builder tests: verify choice intent section appears when intents are provided
- Opening prompt builder tests: verify no choice intent section when intents are absent/empty

### Existing Tests

- `npm run typecheck` must pass
- `npm run test` must pass

## Verification

1. `npm run typecheck` passes
2. `npm run lint` passes
3. `npm test` passes (all existing + new tests)
4. Manual review: planner prompt includes choice intent rules
5. Manual review: writer prompts include choice intent section when plan provides intents
6. Manual review: planner schema includes new fields with correct enum constraints

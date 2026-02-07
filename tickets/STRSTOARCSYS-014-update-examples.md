# STRSTOARCSYS-014: Update Few-Shot Examples

## Summary
Update the few-shot examples in `examples.ts` to remove all `storyArc` references and add examples for structure-aware generation including `beatConcluded` and `beatResolution` fields.

## Files to Touch
- `src/llm/examples.ts`

## Out of Scope
- DO NOT modify prompts (those reference examples, not define them)
- DO NOT modify schemas
- DO NOT modify engine layer
- DO NOT create new example files (consolidate in existing)

## Implementation Details

### Remove storyArc from Existing Examples

Find all existing examples that include `storyArc` and remove the field. Examples should no longer demonstrate storyArc generation.

### Add Structure Generation Examples

Add few-shot examples for structure generation (used by structure-prompt.ts):

```typescript
export const STRUCTURE_GENERATION_EXAMPLES = [
  {
    context: {
      characterConcept: "A disgraced knight seeking redemption",
      worldbuilding: "A war-torn kingdom where magic is feared",
      tone: "dark fantasy with moments of hope",
    },
    output: {
      overallTheme: "Redemption through sacrifice in a world that fears what it doesn't understand",
      acts: [
        {
          name: "The Exile",
          objective: "Establish the knight's disgrace and set them on the path to redemption",
          stakes: "Being captured means execution for treason",
          entryCondition: "Story begins",
          beats: [
            {
              description: "The knight flees their former stronghold, hunted by former allies",
              objective: "Escape immediate pursuit and find temporary shelter",
            },
            {
              description: "An unlikely ally with their own agenda offers assistance",
              objective: "Decide whether to accept help from a morally ambiguous source",
            },
          ],
        },
        // ... acts 2 and 3
      ],
    },
  },
];
```

### Add Beat Evaluation Examples

Add examples for continuation prompts that demonstrate `beatConcluded` and `beatResolution`:

```typescript
export const CONTINUATION_WITH_BEAT_EXAMPLES = [
  {
    // Example where beat is NOT concluded
    input: {
      currentBeatObjective: "Escape the burning village",
      narrative: "The flames grew higher as...",
    },
    output: {
      narrative: "...",
      choices: ["...", "..."],
      beatConcluded: false,
      beatResolution: "",
      // ... other fields
    },
  },
  {
    // Example where beat IS concluded
    input: {
      currentBeatObjective: "Escape the burning village",
      narrative: "Finally beyond the village walls...",
    },
    output: {
      narrative: "...",
      choices: ["...", "..."],
      beatConcluded: true,
      beatResolution: "Escaped through the eastern gate with the merchant's help",
      // ... other fields
    },
  },
];
```

### Update Opening Examples

Update opening examples to NOT include `storyArc` in output:

```typescript
// BEFORE
output: {
  narrative: "...",
  choices: [...],
  storyArc: "A tale of...",  // REMOVE THIS
}

// AFTER
output: {
  narrative: "...",
  choices: [...],
  // No storyArc field
}
```

### Example Categories

Organize examples into clear categories:
1. `STRUCTURE_GENERATION_EXAMPLES` - For structure prompt
2. `OPENING_EXAMPLES` - For opening prompt (without storyArc)
3. `CONTINUATION_EXAMPLES` - For continuation (with beatConcluded/beatResolution)

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/llm/examples.test.ts`:

1. Example format validation
   - All examples have required fields
   - No example contains `storyArc` field
   - Continuation examples include `beatConcluded` and `beatResolution`

2. Structure examples
   - `STRUCTURE_GENERATION_EXAMPLES` has at least one example
   - Example has valid 3-act structure
   - Example has 2-4 beats per act

3. Opening examples
   - `OPENING_EXAMPLES` does NOT include `storyArc`
   - All required output fields present

4. Continuation examples
   - Has example with `beatConcluded: false`
   - Has example with `beatConcluded: true` and non-empty `beatResolution`

5. Example usage in prompts
   - Prompts can import and use examples correctly
   - Examples match expected schema format

### Invariants That Must Remain True
- All examples valid for their respective schemas
- No `storyArc` references anywhere in examples
- Beat evaluation examples show both true and false cases
- Examples follow content policy (NC-21 mature content allowed)
- TypeScript strict mode passes

## Dependencies
- STRSTOARCSYS-012 (schemas must be updated first to know correct format)

## Breaking Changes
- Existing example imports may need updates if structure changes
- Tests validating example format need updates

## Estimated Scope
~150 lines of example changes + ~50 lines of test updates

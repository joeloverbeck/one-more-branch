# STRSTOARCSYS-005: Update Opening Prompt

## Summary
Modify the opening prompt to accept and display the pre-generated story structure. Remove the instruction to generate `storyArc` since structure is now generated separately.

## Files to Touch
- `src/llm/prompts/opening-prompt.ts`

## Out of Scope
- DO NOT modify `continuation-prompt.ts` (that's STRSTOARCSYS-006)
- DO NOT modify `structure-prompt.ts` (that's STRSTOARCSYS-004)
- DO NOT modify schemas (that's STRSTOARCSYS-012)
- DO NOT modify engine layer
- DO NOT modify the structure generation flow

## Implementation Details

### Update `OpeningContext` Interface

Location: This interface may be in `types.ts` or in `opening-prompt.ts` itself.

```typescript
// BEFORE (in types.ts)
export interface OpeningContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
}

// AFTER
export interface OpeningContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  structure?: StoryStructure;  // NEW - optional for backwards compat during transition
}
```

### Modify `buildOpeningPrompt()`

When `context.structure` is present:

1. **Add structure section to prompt**:
```
=== STORY STRUCTURE ===
Overall Theme: [structure.overallTheme]

CURRENT ACT: [Act 1 name]
Objective: [Act 1 objective]
Stakes: [Act 1 stakes]

CURRENT BEAT: [Beat 1.1 description]
Beat Objective: [Beat 1.1 objective]

Your task: Write the opening scene working toward this beat's objective.
```

2. **Remove storyArc generation instruction**:
   - Delete any text asking the LLM to "determine the story arc"
   - Delete any mention of `storyArc` in output requirements

3. **Keep all other functionality**:
   - Character concept handling
   - Worldbuilding handling
   - Tone handling
   - Few-shot examples (updated to not include storyArc)
   - Content policy

### When `context.structure` is NOT present

For backwards compatibility during transition:
- Fall back to current behavior (without structure section)
- This allows gradual rollout

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/llm/prompts/opening-prompt.test.ts`:

1. `buildOpeningPrompt` without structure (backwards compat)
   - Works exactly as before when `structure` is not provided
   - Does not include structure section

2. `buildOpeningPrompt` with structure
   - Includes structure section when `structure` provided
   - Shows current act name and objective (Act 1)
   - Shows current beat objective (Beat 1.1)
   - Does NOT request `storyArc` generation

3. Structure section content
   - Displays `overallTheme`
   - Displays Act 1 stakes
   - Displays Beat 1.1 description
   - Instructs LLM to work toward beat objective

4. Removed functionality
   - No mention of "determine the story arc" in output
   - No `storyArc` field requested in output schema hints

### Invariants That Must Remain True
- Prompt still includes character concept, worldbuilding, tone
- Prompt still includes content policy
- Prompt still follows ChatMessage[] format
- Few-shot examples work correctly (no storyArc in examples)
- TypeScript strict mode passes
- Existing tests pass (may need updates for storyArc removal)

## Dependencies
- STRSTOARCSYS-001 (needs StoryStructure type for import)

## Breaking Changes
- `storyArc` no longer requested from LLM in opening
- Tests expecting `storyArc` in prompt content will fail

## Estimated Scope
~60 lines of code changes + ~80 lines of test updates

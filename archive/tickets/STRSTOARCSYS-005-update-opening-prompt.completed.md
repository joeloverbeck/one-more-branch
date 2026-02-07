# STRSTOARCSYS-005: Update Opening Prompt

## Status
Completed on 2026-02-07.

## Summary
Modify the opening prompt to accept and display the pre-generated story structure. Remove the instruction to generate `storyArc` since structure is now generated separately.

## Assumptions Reassessment (Against Current Code)
- `OpeningContext` currently lives in `src/llm/types.ts` (not in `opening-prompt.ts`).
- `StoryStructure` already exists in `src/models/story-arc.ts` (from STRSTOARCSYS-001), so this ticket can type `OpeningContext.structure`.
- Opening prompt tests are in `test/unit/llm/prompts.test.ts`; `test/unit/llm/prompts/opening-prompt.test.ts` does not exist.
- `storyArc` is still requested in `src/llm/prompts/opening-prompt.ts` requirement #5, so this ticket should remove that opening-prompt-specific instruction.
- `storyArc` is still present in schemas and few-shot examples, but those concerns belong to other tickets in the index:
  - Schema updates: STRSTOARCSYS-012
  - Example payload updates: STRSTOARCSYS-014

## Updated Scope
- Add optional `structure?: StoryStructure` to `OpeningContext` in `src/llm/types.ts`.
- Update `buildOpeningPrompt()` in `src/llm/prompts/opening-prompt.ts`:
  - Include a story structure section when `context.structure` is present (using Act 1 / Beat 1.1).
  - Remove the opening prompt instruction to determine/generate a `storyArc`.
  - Keep non-structure behavior unchanged when `context.structure` is absent.
- Update and add focused opening prompt assertions in `test/unit/llm/prompts.test.ts`.

## Files to Touch
- `src/llm/prompts/opening-prompt.ts`
- `src/llm/types.ts`
- `test/unit/llm/prompts.test.ts`

## Out of Scope
- DO NOT modify `continuation-prompt.ts` (that's STRSTOARCSYS-006)
- DO NOT modify `structure-prompt.ts` (that's STRSTOARCSYS-004)
- DO NOT modify schemas (that's STRSTOARCSYS-012)
- DO NOT modify `src/llm/examples.ts` opening example payload shape (that's STRSTOARCSYS-014)
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

2. **Remove storyArc generation instruction from opening prompt text**:
   - Delete any text asking the LLM to "determine the story arc"
   - Do not add any new storyArc output instruction in this prompt

3. **Keep all other functionality**:
   - Character concept handling
   - Worldbuilding handling
   - Tone handling
   - Few-shot injection behavior
   - Content policy

### When `context.structure` is NOT present

For backwards compatibility during transition:
- Fall back to current behavior (without structure section)
- This allows gradual rollout

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/llm/prompts.test.ts`:

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
   - Opening prompt requirement list no longer asks for story arc generation

### Invariants That Must Remain True
- Prompt still includes character concept, worldbuilding, tone
- Prompt still includes content policy
- Prompt still follows ChatMessage[] format
- Few-shot message injection still works (`none`/`minimal`/`standard`)
- TypeScript strict mode passes
- Existing tests pass (may need updates for storyArc removal)

## Dependencies
- STRSTOARCSYS-001 (needs StoryStructure type for import)

## Breaking Changes
- `storyArc` no longer requested from LLM in opening
- Tests expecting `storyArc` in prompt content will fail

## Estimated Scope
~60 lines of code changes + ~80 lines of test updates

## Outcome
- Implemented optional `structure?: StoryStructure` on `OpeningContext` in `src/llm/types.ts`.
- Updated `src/llm/prompts/opening-prompt.ts` to:
  - Render a `=== STORY STRUCTURE ===` section when structure data is provided (overall theme, Act 1, Beat 1.1, and beat-objective guidance).
  - Remove the opening requirement to determine the story arc.
  - Preserve behavior when no structure is provided.
- Updated `test/unit/llm/prompts.test.ts` (actual prompt test location in this repo) with:
  - Assertions that structure content appears when provided.
  - Assertions that structure content is omitted when absent.
  - Assertion that opening prompt no longer asks for story arc determination.
- Original plan vs actual:
  - Planned: update opening prompt and an opening-specific test file path that does not exist.
  - Actual: same functional change, applied to the real consolidated prompt test file (`test/unit/llm/prompts.test.ts`) and kept schema/examples changes out-of-scope per ticket index dependencies.

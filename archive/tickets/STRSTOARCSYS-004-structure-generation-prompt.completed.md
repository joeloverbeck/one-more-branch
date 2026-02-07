# STRSTOARCSYS-004: Structure Generation Prompt

## Status
Completed on 2026-02-07.

## Summary
Create the new prompt for generating story structure BEFORE the first page. This prompt runs separately from opening/continuation prompts and outputs the 3-act structure with beats.

## Assumptions Reassessment (Against Current Code)
- `src/llm/prompts/structure-prompt.ts` does not exist yet.
- Prompt modules use ESM-style TypeScript imports with `.js` extensions in source files (for example `../types.js`), so new prompt code should follow that style.
- Public prompt access currently goes through both `src/llm/prompts/index.ts` and the facade `src/llm/prompts.ts`; exporting from only one would make the new prompt inconsistent to import.
- `PromptOptions.fewShotMode` supports `'none' | 'minimal' | 'standard'`; this ticket should treat both non-`none` modes as enabling a few-shot example.
- Existing prompt unit tests are concentrated in `test/unit/llm/prompts.test.ts`, but creating a dedicated `structure-prompt` test file is valid and lower risk for this isolated change.

## Updated Scope
- Add a new structure-generation prompt builder in `src/llm/prompts/structure-prompt.ts`.
- Export it from both prompt barrels: `src/llm/prompts/index.ts` and `src/llm/prompts.ts`.
- Add focused unit tests in `test/unit/llm/prompts/structure-prompt.test.ts`.
- Keep all other prompt behavior unchanged.

## Files to Touch
- `src/llm/prompts/structure-prompt.ts` (NEW)
- `src/llm/prompts/index.ts` (add export)
- `src/llm/prompts.ts` (add export)
- `test/unit/llm/prompts/structure-prompt.test.ts` (NEW)

## Out of Scope
- DO NOT modify `opening-prompt.ts` (that's STRSTOARCSYS-005)
- DO NOT modify `continuation-prompt.ts` (that's STRSTOARCSYS-006)
- DO NOT create the structure generator orchestration (that's STRSTOARCSYS-007)
- DO NOT create schemas (that's a separate concern handled alongside)
- DO NOT modify engine layer

## Implementation Details

### Create `src/llm/prompts/structure-prompt.ts`

```typescript
import type { ChatMessage, PromptOptions } from '../types.js';

export interface StructureContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
}

export function buildStructurePrompt(
  context: StructureContext,
  options?: PromptOptions,
): ChatMessage[] {
  // Build system + user messages for structure generation
}
```

### Prompt Requirements

The prompt must instruct the LLM to:

1. **Create a 3-act structure** following setup/confrontation/resolution pattern
2. **Generate 2-4 beats per act** (milestones, not rigid checkpoints)
3. **Consider the character concept** when designing protagonist's journey
4. **Consider the worldbuilding** when setting stakes and entry conditions
5. **Consider the tone** when determining intensity and style

### Required Output Fields

For each **Act**:
- `name`: Evocative title (e.g., "The Discovery", "The Descent")
- `objective`: Main goal of this act
- `stakes`: What's at risk if the protagonist fails
- `entryCondition`: What triggers transition into this act

For each **Beat** within an act:
- `description`: What should happen in this beat
- `objective`: Specific goal for the protagonist

### Overall:
- `overallTheme`: Central conflict or goal of the entire story

### Prompt Content Guidelines

1. Use the existing content policy from `content-policy.ts`
2. Emphasize flexibility - beats are milestones, not rigid gates
3. Beats should work for any choice path (branching-aware)
4. Structure should support 15-50 page stories
5. Include few-shot example if `options?.fewShotMode !== 'none'`

### Example Structure Output (for prompt illustration)

```json
{
  "overallTheme": "A fallen knight seeks redemption while hunted by former allies",
  "acts": [
    {
      "name": "The Exile",
      "objective": "Establish the protagonist's disgrace and desperate situation",
      "stakes": "Capture means execution for treason",
      "entryCondition": "Story begins",
      "beats": [
        {
          "description": "The protagonist flees their former stronghold",
          "objective": "Escape immediate pursuit and find temporary shelter"
        },
        {
          "description": "An unlikely ally offers assistance with strings attached",
          "objective": "Decide whether to accept help from a morally ambiguous source"
        }
      ]
    }
    // ... acts 2 and 3
  ]
}
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/llm/prompts/structure-prompt.test.ts`:

1. `buildStructurePrompt` basic output
   - Returns array of ChatMessage objects
   - First message has role 'system'
   - Contains at least one 'user' message

2. `buildStructurePrompt` content inclusion
   - Includes character concept in prompt
   - Includes worldbuilding when provided
   - Includes tone in prompt
   - Requests 3-act structure
   - Requests 2-4 beats per act

3. `buildStructurePrompt` with options
   - Includes few-shot example when `fewShotMode: 'standard'`
   - Includes few-shot example when `fewShotMode: 'minimal'`
   - Omits few-shot example when `fewShotMode: 'none'`

4. Content policy
   - Includes NC-21 content policy (mature content allowed)

### Invariants That Must Remain True
- Prompt always requests exactly 3 acts
- Prompt always requests 2-4 beats per act
- Prompt follows existing ChatMessage format
- No runtime validation of LLM output (that's schema's job)
- TypeScript strict mode passes
- Existing tests continue to pass

## Dependencies
- None (can be developed in parallel with data models)

## Estimated Scope
~100 lines of prompt code + ~80 lines of tests

## Outcome
- Implemented `src/llm/prompts/structure-prompt.ts` with `buildStructurePrompt()` and `StructureContext`.
- Prompt now explicitly requires exactly 3 acts, 2-4 beats per act, branching-aware milestones, and 15-50 page pacing while incorporating character concept, worldbuilding, and tone.
- Few-shot behavior was implemented for all non-`none` modes (`minimal` and `standard`) to match current `PromptOptions`.
- Exported `buildStructurePrompt` through both `src/llm/prompts/index.ts` and `src/llm/prompts.ts` so existing import patterns remain consistent.
- Added focused tests in `test/unit/llm/prompts/structure-prompt.test.ts` for structure requirements, few-shot behavior, and NC-21 content policy inclusion.
- Original plan vs actual:
  - Planned: new structure prompt + prompt index export + dedicated tests.
  - Actual: same scope, plus one additional export in `src/llm/prompts.ts` to align with the repository's prompt facade pattern.

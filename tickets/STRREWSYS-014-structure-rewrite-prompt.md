# STRREWSYS-014: Create Structure Rewrite Prompt

## Summary
Create the LLM prompt for regenerating story structure when deviation is detected, including context about completed beats and current narrative state.

## Dependencies
- STRREWSYS-006 (StructureRewriteContext type)

## Files to Touch

### New Files
- `src/llm/prompts/structure-rewrite-prompt.ts`
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`

### Modified Files
- `src/llm/prompts/index.ts` (add export)

## Out of Scope
- Do NOT modify continuation-prompt.ts
- Do NOT modify structure-prompt.ts (for initial generation)
- Do NOT implement response parsing (handled in STRREWSYS-013)
- Do NOT modify system prompt

## Implementation Details

### New File: `src/llm/prompts/structure-rewrite-prompt.ts`

```typescript
import { StructureRewriteContext } from '../types';
import { CONTENT_POLICY } from '../content-policy';

/**
 * Builds the prompt for structure regeneration.
 */
export function buildStructureRewritePrompt(
  context: StructureRewriteContext
): string {
  const completedBeatsSection = context.completedBeats.length > 0
    ? context.completedBeats
        .map(beat => `  - Act ${beat.actIndex + 1}, Beat ${beat.beatIndex + 1}: "${beat.description}"
    Objective: ${beat.objective}
    Resolution: ${beat.resolution}`)
        .join('\n')
    : '  - None (story is at the beginning)';

  const actsToRegenerate = getActsToRegenerate(context);

  return `# STORY STRUCTURE REGENERATION

You are regenerating the story structure for an interactive branching narrative. The story has deviated from its original plan and needs new beats to guide future narrative.

${CONTENT_POLICY}

## STORY CONTEXT

Character: ${context.characterConcept}

World: ${context.worldbuilding}

Tone: ${context.tone}

Original Theme: ${context.originalTheme}

## WHAT HAS ALREADY HAPPENED (CANON - DO NOT CHANGE)

The following beats have been completed. Their resolutions are permanent and MUST be respected:

${completedBeatsSection}

## CURRENT SITUATION

Deviation occurred at: Act ${context.currentActIndex + 1}, Beat ${context.currentBeatIndex + 1}
Reason for deviation: ${context.deviationReason}

Current narrative state:
${context.narrativeSummary}

## YOUR TASK

Generate NEW beats to replace the invalidated ones. You are regenerating: ${actsToRegenerate}

Requirements:
1. PRESERVE the completed beats exactly as shown above (they are canon)
2. Maintain thematic coherence with: "${context.originalTheme}"
3. Build naturally from the current narrative state
4. Follow three-act structure principles (setup, confrontation, resolution)
5. Each act should have 2-4 beats total (including preserved)
6. Beats should be flexible milestones, not rigid gates
7. Account for branching narrative - beats should work for multiple paths

## OUTPUT FORMAT

Provide your response in this EXACT format:

REGENERATED_ACTS:

${formatActInstructions(context)}

THEME_EVOLUTION: [Brief note on how the theme may evolve given the new direction, or "Unchanged" if staying the same]`;
}

/**
 * Determines which acts need regeneration.
 */
function getActsToRegenerate(context: StructureRewriteContext): string {
  const currentAct = context.currentActIndex + 1;

  if (currentAct === 1) {
    return 'remaining beats in Act 1, plus all of Acts 2 and 3';
  } else if (currentAct === 2) {
    return 'remaining beats in Act 2, plus all of Act 3';
  } else {
    return 'remaining beats in Act 3';
  }
}

/**
 * Formats the act template instructions based on what needs regeneration.
 */
function formatActInstructions(context: StructureRewriteContext): string {
  const instructions: string[] = [];

  for (let actNum = context.currentActIndex + 1; actNum <= 3; actNum++) {
    const preservedInAct = context.completedBeats.filter(
      b => b.actIndex === actNum - 1
    );

    const preservedSection = preservedInAct.length > 0
      ? `\n[PRESERVED BEATS - DO NOT REGENERATE]\n${preservedInAct.map(b =>
          `- Beat ${b.beatIndex + 1}: "${b.description}" (CONCLUDED)`
        ).join('\n')}\n\n[NEW BEATS - GENERATE THESE]`
      : '';

    instructions.push(`ACT_${actNum}:
NAME: [Evocative name for this act]
OBJECTIVE: [Main goal for protagonists in this act]
STAKES: [What happens if they fail]
ENTRY_CONDITION: [${actNum === context.currentActIndex + 1 ? 'Already met - currently in this act' : 'How protagonists enter this act'}]
${preservedSection}
BEATS:
- DESCRIPTION: [What should happen in this beat]
  OBJECTIVE: [Specific goal for protagonist]
- DESCRIPTION: [What should happen in this beat]
  OBJECTIVE: [Specific goal for protagonist]
[Add more beats if needed, 2-4 total per act including any preserved]`);
  }

  return instructions.join('\n\n');
}
```

### `src/llm/prompts/index.ts` Updates

Add export:
```typescript
export { buildStructureRewritePrompt } from './structure-rewrite-prompt';
```

### `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`

```typescript
import { buildStructureRewritePrompt } from '../../../../src/llm/prompts/structure-rewrite-prompt';
import { StructureRewriteContext } from '../../../../src/llm/types';

describe('buildStructureRewritePrompt', () => {
  const baseContext: StructureRewriteContext = {
    characterConcept: 'A young wizard',
    worldbuilding: 'Medieval fantasy kingdom',
    tone: 'Epic adventure',
    completedBeats: [],
    narrativeSummary: 'The protagonist has just made a major decision',
    currentActIndex: 0,
    currentBeatIndex: 0,
    deviationReason: 'Player chose to join the antagonist',
    originalTheme: 'Good versus evil',
  };

  describe('prompt structure', () => {
    it('should include content policy');
    it('should include character concept');
    it('should include worldbuilding');
    it('should include tone');
    it('should include original theme');
    it('should include deviation reason');
    it('should include narrative summary');
  });

  describe('completed beats section', () => {
    it('should show "None" when no beats completed');
    it('should list completed beats with resolutions');
    it('should mark completed beats as CANON');
    it('should include act and beat numbers');
  });

  describe('acts to regenerate', () => {
    it('should regenerate Acts 1-3 when deviation in Act 1');
    it('should regenerate Acts 2-3 when deviation in Act 2');
    it('should regenerate only Act 3 when deviation in Act 3');
  });

  describe('act instructions', () => {
    it('should include template for each act to regenerate');
    it('should mark preserved beats as DO NOT REGENERATE');
    it('should include required fields: NAME, OBJECTIVE, STAKES, ENTRY_CONDITION, BEATS');
  });

  describe('output format', () => {
    it('should request REGENERATED_ACTS section');
    it('should request THEME_EVOLUTION section');
    it('should specify exact beat format');
  });
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
- Run with: `npm test -- test/unit/llm/prompts/structure-rewrite-prompt.test.ts`

### Invariants That Must Remain True
1. **Completed beats marked as canon** - Clear instruction to preserve
2. **Three-act structure** - Template covers all three acts
3. **Beat count guidance** - 2-4 beats per act instruction
4. **Content policy included** - NC-21 policy in prompt
5. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Prompt is similar to initial structure-prompt but with deviation context
- Completed beats are explicitly shown to prevent LLM from changing them
- Acts to regenerate is calculated from currentActIndex
- Format matches what structure-rewriter parser expects
- Theme evolution allows LLM to adapt theme without losing original

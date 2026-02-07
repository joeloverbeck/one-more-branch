import type { ChatMessage, PromptOptions, StructureRewriteContext } from '../types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';

function getActsToRegenerate(currentActIndex: number): string {
  if (currentActIndex === 0) {
    return 'remaining beats in Act 1, plus all of Acts 2 and 3';
  }

  if (currentActIndex === 1) {
    return 'remaining beats in Act 2, plus all of Act 3';
  }

  return 'remaining beats in Act 3';
}

function formatActInstructions(context: StructureRewriteContext): string {
  const instructions: string[] = [];

  for (let actNumber = context.currentActIndex + 1; actNumber <= 3; actNumber += 1) {
    const preservedInAct = context.completedBeats.filter(beat => beat.actIndex === actNumber - 1);

    const preservedSection =
      preservedInAct.length > 0
        ? `
[PRESERVED BEATS - DO NOT REGENERATE]
${preservedInAct
  .map(beat =>
    `- Beat ${beat.beatIndex + 1} (${beat.beatId}): "${beat.description}" (CONCLUDED)`,
  )
  .join('\n')}

[NEW BEATS - GENERATE THESE]
`
        : '';

    instructions.push(`ACT_${actNumber}:
NAME: [Evocative name for this act]
OBJECTIVE: [Main goal for protagonists in this act]
STAKES: [What happens if they fail]
ENTRY_CONDITION: [${actNumber === context.currentActIndex + 1 ? 'Already met - currently in this act' : 'How protagonists enter this act'}]
${preservedSection}BEATS:
- DESCRIPTION: [What should happen in this beat]
  OBJECTIVE: [Specific goal for protagonist]
- DESCRIPTION: [What should happen in this beat]
  OBJECTIVE: [Specific goal for protagonist]
[Add more beats if needed, 2-4 total per act including any preserved]`);
  }

  return instructions.join('\n\n');
}

export function buildStructureRewritePrompt(
  context: StructureRewriteContext,
  options?: PromptOptions,
): ChatMessage[] {
  const completedBeatsSection =
    context.completedBeats.length > 0
      ? context.completedBeats
          .map(
            beat => `  - Act ${beat.actIndex + 1}, Beat ${beat.beatIndex + 1} (${beat.beatId}): "${beat.description}"
    Objective: ${beat.objective}
    Resolution: ${beat.resolution}`,
          )
          .join('\n')
      : '  - None (story is at the beginning)';

  const worldSection = context.worldbuilding
    ? `World: ${context.worldbuilding}
`
    : '';

  const userPrompt = `Regenerate story structure for an interactive branching narrative.

The story has deviated from its original plan. Generate replacement beats for invalidated future structure while preserving completed canon.

## STORY CONTEXT
Character: ${context.characterConcept}
${worldSection}Tone: ${context.tone}
Original Theme: ${context.originalTheme}

## WHAT HAS ALREADY HAPPENED (CANON - DO NOT CHANGE)
The following beats have been completed. Their resolutions are permanent and must be respected.

${completedBeatsSection}

## CURRENT SITUATION
Deviation occurred at: Act ${context.currentActIndex + 1}, Beat ${context.currentBeatIndex + 1}
Reason for deviation: ${context.deviationReason}

Current narrative state:
${context.narrativeSummary}

## YOUR TASK
Generate NEW beats to replace invalidated ones. You are regenerating: ${getActsToRegenerate(context.currentActIndex)}.

Requirements:
1. Preserve completed beats exactly as listed above (they are canon)
2. Maintain thematic coherence with: "${context.originalTheme}"
3. Build naturally from the current narrative state
4. Follow three-act structure principles (setup, confrontation, resolution)
5. Keep 2-4 beats per act total (including preserved beats)
6. Beats should be flexible milestones, not rigid gates
7. Account for branching narrative paths

## OUTPUT FORMAT
Provide your response in this exact format:

REGENERATED_ACTS:

${formatActInstructions(context)}

THEME_EVOLUTION: [Brief note on how the theme may evolve, or "Unchanged"]`;

  return [
    { role: 'system', content: buildStructureSystemPrompt(options) },
    { role: 'user', content: userPrompt },
  ];
}

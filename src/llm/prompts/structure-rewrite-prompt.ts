import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { StructureRewriteContext } from '../structure-rewrite-types.js';
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

function formatCompletedBeats(completedBeats: StructureRewriteContext['completedBeats']): string {
  if (completedBeats.length === 0) {
    return '  - None (story is at the beginning)';
  }

  return completedBeats
    .map(
      (
        beat
      ) => `  - Act ${beat.actIndex + 1}, Beat ${beat.beatIndex + 1} (${beat.beatId}) [${beat.role}] "${beat.name}": "${beat.description}"
    Objective: ${beat.objective}
    Resolution: ${beat.resolution}`
    )
    .join('\n');
}

const STRUCTURE_REWRITE_FEW_SHOT_USER = `Regenerate story structure for an interactive branching narrative.

The story has deviated from its original plan. Generate replacement beats for invalidated future structure while preserving completed canon.

## STORY CONTEXT
Character: A grizzled mercenary captain seeking one last job to fund retirement
World: The Shattered Kingdoms—seven petty kings wage proxy wars through mercenary companies
Tone: gritty low fantasy with noir undertones
Original Theme: Escape a blood-soaked past by completing one final contract

## WHAT HAS ALREADY HAPPENED (CANON - DO NOT CHANGE)
  - Act 1, Beat 1 (1.1) [setup]: "A desperate employer offers terms too good to refuse"
    Objective: Decide whether to take the contract despite warning signs
    Resolution: Vera accepted Lord Vane's contract after verifying Duke Ashford's seal
  - Act 1, Beat 2 (1.2) [turning_point]: "The true nature of the target is revealed"
    Objective: Determine if the job is worth the escalating risk
    Resolution: Vera learned the target is Lady Elowen and agreed to proceed

## CURRENT SITUATION
Deviation occurred at: Act 1, Beat 3
Reason for deviation: The protagonist killed Lord Aldric Vane when he attempted betrayal, eliminating the employer entirely

Current narrative state:
Vera has killed her employer Lord Vane. She possesses the contract letter, half the payment, and knowledge of Lady Elowen's location, but operates without a client.

## YOUR TASK
Generate NEW beats to replace invalidated ones. You are regenerating: remaining beats in Act 1, plus all of Acts 2 and 3.`;

const STRUCTURE_REWRITE_FEW_SHOT_ASSISTANT = `{
  "overallTheme": "Escape a blood-soaked past by completing a contract that lost its purpose, discovering whether redemption requires coin or conscience",
  "premise": "A mercenary captain kills her own employer mid-contract, leaving her to choose between finishing a purposeless extraction or abandoning the only job that could buy her freedom.",
  "pacingBudget": { "targetPagesMin": 20, "targetPagesMax": 40 },
  "acts": [
    {
      "name": "The Last Contract",
      "objective": "Deal with the aftermath of killing the employer and decide whether to continue",
      "stakes": "Failure means dying hunted or penniless",
      "entryCondition": "Already in progress",
      "beats": [
        {
          "name": "The Offer with Hooks",
          "description": "A desperate employer offers terms too good to refuse",
          "objective": "Decide whether to take the contract despite warning signs",
          "role": "setup"
        },
        {
          "name": "Target Unmasked",
          "description": "The true nature of the target is revealed",
          "objective": "Determine if the job is worth the escalating risk",
          "role": "turning_point"
        },
        {
          "name": "Blood on the Contract",
          "description": "Vera must escape before Vane's death is discovered",
          "objective": "Evade pursuit and reach safety to plan the extraction alone",
          "role": "escalation"
        },
        {
          "name": "No Patron, No Excuse",
          "description": "Without an employer, Vera decides whether to continue for her own reasons",
          "objective": "Commit to the extraction or abandon the contract entirely",
          "role": "turning_point"
        }
      ]
    },
    {
      "name": "Blood Without Coin",
      "objective": "Execute the extraction without a client, managing multiple hunters",
      "stakes": "Capture by Duke Ashford's enemies or death at the hands of those hunting Vane's killer",
      "entryCondition": "Vera commits to extracting Lady Elowen on her own terms",
      "beats": [
        {
          "name": "Hunters on the Road",
          "description": "The journey reveals others hunting Lady Elowen for their own purposes",
          "objective": "Navigate competing interests while maintaining surprise",
          "role": "escalation"
        },
        {
          "name": "The Target Bites Back",
          "description": "Lady Elowen proves to have her own agenda complicating extraction",
          "objective": "Negotiate with the target while keeping the mission viable",
          "role": "escalation"
        },
        {
          "name": "Ghosts of Border Wars",
          "description": "Vera's past catches up as someone from the border wars recognizes her",
          "objective": "Handle the threat without compromising the extraction",
          "role": "turning_point"
        }
      ]
    },
    {
      "name": "The Weight of Freedom",
      "objective": "Complete the extraction and choose what freedom is worth having",
      "stakes": "Becoming a fugitive with no future, having sacrificed everything for nothing",
      "entryCondition": "Lady Elowen is extracted but the path to safety is contested",
      "beats": [
        {
          "name": "Duke's Ultimatum",
          "description": "Duke Ashford's forces close in, demanding both Vera and his daughter",
          "objective": "Negotiate, fight, or flee—reach a resolution with the Duke",
          "role": "turning_point"
        },
        {
          "name": "What Freedom Costs",
          "description": "The true cost of the contract is revealed in who Vera has become",
          "objective": "Decide what legacy to leave and whether the fishing cottage is still possible",
          "role": "resolution"
        }
      ]
    }
  ]
}`;

export function buildStructureRewritePrompt(
  context: StructureRewriteContext,
  options?: PromptOptions
): ChatMessage[] {
  const completedBeatsSection = formatCompletedBeats(context.completedBeats);

  const worldSection = context.worldbuilding ? `World: ${context.worldbuilding}\n` : '';

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

REQUIREMENTS (follow ALL):
1. Preserve completed beats exactly—include them in the output with unchanged names, descriptions, objectives, and roles
2. Maintain thematic coherence with: "${context.originalTheme}"
3. Build naturally from the current narrative state
4. Follow three-act structure principles (setup, confrontation, resolution)
5. Keep 2-4 beats per act total (including preserved beats)
6. Beats should be flexible milestones, not rigid gates
7. Account for branching narrative paths
8. Design beats with clear dramatic roles:
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "resolution" for denouement
   - Preserve beat roles from completed beats unchanged
9. Write a premise: a 1-2 sentence hook capturing the core dramatic question (may evolve from original)
10. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's remaining scope

OUTPUT SHAPE (same as original structure):
- overallTheme: string (may evolve slightly from original, or stay the same)
- premise: string (1-2 sentence story hook)
- pacingBudget: { targetPagesMin: number, targetPagesMax: number }
- acts: exactly 3 items
- each act has:
  - name: evocative act title
  - objective: main goal for the act
  - stakes: consequence of failure
  - entryCondition: what triggers transition into this act
  - beats: 2-4 items (including any preserved beats)
    - each beat has:
      - name: short evocative beat title
      - description: what should happen in this beat
      - objective: specific protagonist goal for the beat
      - role: "setup" | "escalation" | "turning_point" | "resolution"`;

  const messages: ChatMessage[] = [{ role: 'system', content: buildStructureSystemPrompt() }];

  // Add few-shot example for structure rewrite
  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(
      { role: 'user', content: STRUCTURE_REWRITE_FEW_SHOT_USER },
      { role: 'assistant', content: STRUCTURE_REWRITE_FEW_SHOT_ASSISTANT }
    );
  }

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}

import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { StructureRewriteContext } from '../structure-rewrite-types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildToneReminder } from './sections/shared/tone-block.js';

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

function formatPlannedBeats(plannedBeats: StructureRewriteContext['plannedBeats']): string {
  return plannedBeats
    .map(
      (
        beat
      ) => `  - Act ${beat.actIndex + 1}, Beat ${beat.beatIndex + 1} (${beat.beatId}) [${beat.role}] "${beat.name}": "${beat.description}"
    Objective: ${beat.objective}`
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

## ORIGINALLY PLANNED BEATS (REFERENCE - NOT BINDING)
The following beats were planned before the deviation occurred. Review each one:
- If a beat remains narratively coherent given the deviation, preserve it (you may adjust wording slightly)
- If a beat conflicts with the new story direction, replace it with something better suited
- You are NOT required to keep any of these — use your narrative judgment

  - Act 1, Beat 4 (1.4) [escalation] "Road to the Hinterlands": "The journey to the extraction point reveals rival mercenary companies closing in"
    Objective: Evade or neutralize competitors before reaching Lady Elowen
  - Act 2, Beat 1 (2.1) [escalation] "The Gilded Cage": "Lady Elowen's estate is more fortress than home"
    Objective: Infiltrate the estate and make contact with the target
  - Act 2, Beat 2 (2.2) [turning_point] "Broken Loyalties": "A former comrade from the border wars appears among the guards"
    Objective: Decide whether to exploit or protect the old friendship
  - Act 3, Beat 1 (3.1) [turning_point] "The Duke's Gambit": "Duke Ashford makes a counter-offer that changes the calculus entirely"
    Objective: Choose between the original contract and a more lucrative betrayal
  - Act 3, Beat 2 (3.2) [resolution] "Last Coin Standing": "The final reckoning determines whether retirement is earned or lost"
    Objective: Resolve all competing obligations and secure a future

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
  const plannedBeatsSection =
    context.plannedBeats.length > 0
      ? `
## ORIGINALLY PLANNED BEATS (REFERENCE - NOT BINDING)
The following beats were planned before the deviation occurred. Review each one:
- If a beat remains narratively coherent given the deviation, preserve it (you may adjust wording slightly)
- If a beat conflicts with the new story direction, replace it with something better suited
- You are NOT required to keep any of these — use your narrative judgment

${formatPlannedBeats(context.plannedBeats)}

`
      : '';

  const worldSection = context.worldbuilding ? `World: ${context.worldbuilding}\n` : '';

  const toneKeywordsLine =
    context.toneKeywords && context.toneKeywords.length > 0
      ? `Tone target feel: ${context.toneKeywords.join(', ')}\n`
      : '';
  const toneAntiKeywordsLine =
    context.toneAntiKeywords && context.toneAntiKeywords.length > 0
      ? `Tone avoid: ${context.toneAntiKeywords.join(', ')}\n`
      : '';

  const userPrompt = `Regenerate story structure for an interactive branching narrative.

The story has deviated from its original plan. Generate replacement beats for invalidated future structure while preserving completed canon.

## STORY CONTEXT
Character: ${context.characterConcept}
${worldSection}Tone: ${context.tone}
${toneKeywordsLine}${toneAntiKeywordsLine}Original Theme: ${context.originalTheme}

## WHAT HAS ALREADY HAPPENED (CANON - DO NOT CHANGE)
The following beats have been completed. Their resolutions are permanent and must be respected.

${completedBeatsSection}
${plannedBeatsSection}## CURRENT SITUATION
Deviation occurred at: Act ${context.currentActIndex + 1}, Beat ${context.currentBeatIndex + 1}
Reason for deviation: ${context.deviationReason}

Current narrative state:
${context.narrativeSummary}

## YOUR TASK
Generate NEW beats to replace invalidated ones. You are regenerating: ${getActsToRegenerate(context.currentActIndex)}.

REQUIREMENTS (follow ALL):
1. Preserve completed beats exactly—include them in the output with unchanged names, descriptions, objectives, and roles
2. Maintain thematic AND tonal coherence with the original story. New beats must match the TONE/GENRE "${context.tone}" in naming, stakes, and emotional register. Do not drift toward generic dark fantasy.
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

${buildToneReminder(context.tone, context.toneKeywords, context.toneAntiKeywords)}

OUTPUT SHAPE (same as original structure):
- overallTheme: string (may evolve slightly from original, or stay the same)
- premise: string (1-2 sentence story hook)
- pacingBudget: { targetPagesMin: number, targetPagesMax: number }
- acts: 3-5 items
- each act has:
  - name: evocative act title
  - objective: main goal for the act
  - stakes: consequence of failure
  - entryCondition: what triggers transition into this act
  - beats: 2-4 items (including any preserved beats)
    - each beat has:
      - name: short evocative beat title
      - description: what should happen in this beat
      - objective: the protagonist's specific goal for this beat. Write objectives that satisfy ALL of these criteria:
        1. Start with a concrete action verb (decide, secure, survive, negotiate, escape, confront, choose, reveal, infiltrate, convince)
        2. Name the obstacle or constraint that makes success non-trivial
        3. Imply a verifiable outcome — something observable as achieved or failed
        Good objectives:
          "Secure evidence before the tribunal can destroy it" (action: secure, obstacle: tribunal destroying evidence, verifiable: evidence obtained or not)
          "Convince the rival houses to commit support without revealing all leverage" (action: convince, obstacle: protecting leverage, verifiable: support gained or refused)
          "Survive the rigged hearing and force hidden evidence into the open" (action: survive + force, obstacle: rigged hearing, verifiable: survived and evidence exposed or not)
        Bad objectives (DO NOT write these):
          "Deal with the situation" (no specific action, no obstacle, nothing to verify)
          "Move the story forward" (meta-commentary, not a protagonist goal)
          "Experience the consequences" (passive, no action verb, unverifiable)
      - role: "setup" | "escalation" | "turning_point" | "resolution"`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
  ];

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

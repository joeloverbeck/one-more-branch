import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { StructureRewriteContext } from '../structure-rewrite-types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildSpineSection } from './sections/shared/spine-section.js';

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

export function buildStructureRewritePrompt(
  context: StructureRewriteContext,
  _options?: PromptOptions
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

  const protagonistSection = context.decomposedCharacters.length > 0
    ? formatDecomposedCharacterForPrompt(context.decomposedCharacters[0]!, true)
    : '(no protagonist profile)';

  const worldSection = context.decomposedWorld.facts.length > 0
    ? `World:\n${formatDecomposedWorldForPrompt(context.decomposedWorld)}\n`
    : '';

  const toneFeelLine =
    context.toneFeel && context.toneFeel.length > 0
      ? `Tone target feel: ${context.toneFeel.join(', ')}\n`
      : '';
  const toneAvoidLine =
    context.toneAvoid && context.toneAvoid.length > 0
      ? `Tone avoid: ${context.toneAvoid.join(', ')}\n`
      : '';

  const spineSection = buildSpineSection(context.spine);

  const conceptStakesSection = context.conceptSpec
    ? `\nCONCEPT STAKES (use to ground your per-act stakes):
Personal stakes: ${context.conceptSpec.stakesPersonal}
Systemic stakes: ${context.conceptSpec.stakesSystemic}
Pressure source: ${context.conceptSpec.pressureSource}
Deadline mechanism: ${context.conceptSpec.deadlineMechanism}

Each act's stakes should escalate FROM these foundations, even after the deviation.\n`
    : '';

  const userPrompt = `Regenerate story structure for an interactive branching narrative.

The story has deviated from its original plan. Generate replacement beats for invalidated future structure while preserving completed canon.

## STORY CONTEXT
Character: ${protagonistSection}
${worldSection}Tone: ${context.tone}
${toneFeelLine}${toneAvoidLine}Original Theme: ${context.originalTheme}
${spineSection}${conceptStakesSection}

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

OUTPUT SHAPE (arc fields only — tone and NPC agendas are preserved from the original):
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

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}

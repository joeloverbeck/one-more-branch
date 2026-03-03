import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import { getGenreObligationTags } from '../../models/genre-obligations.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { StructureRewriteContext } from '../structure-rewrite-types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';

function getActsToRegenerate(currentActIndex: number, totalActs: number): string {
  const currentActLabel = `Act ${currentActIndex + 1}`;
  const remainingActNumbers: number[] = [];
  for (let i = currentActIndex + 1; i < totalActs; i++) {
    remainingActNumbers.push(i + 1);
  }

  if (remainingActNumbers.length === 0) {
    return `remaining beats in ${currentActLabel}`;
  }

  if (remainingActNumbers.length === 1) {
    return `remaining beats in ${currentActLabel}, plus all of Act ${remainingActNumbers[0]!}`;
  }

  const numberList = `${remainingActNumbers.slice(0, -1).join(', ')} and ${remainingActNumbers[remainingActNumbers.length - 1]!}`;
  return `remaining beats in ${currentActLabel}, plus all of Acts ${numberList}`;
}

function formatEscalationFields(
  causalLink: string,
  escalationType: string | null,
  secondaryEscalationType: string | null,
  crisisType: string | null,
  expectedGapMagnitude: string | null,
  isMidpoint: boolean,
  midpointType: string | null,
  uniqueScenarioHook: string | null,
  approachVectors?: readonly string[] | null,
  setpieceSourceIndex?: number | null,
  obligatorySceneTag?: string | null
): string {
  const parts: string[] = [`    Causal link: ${causalLink}`];
  if (escalationType) {
    parts.push(`    Escalation mechanism: ${escalationType}`);
  }
  if (secondaryEscalationType) {
    parts.push(`    Secondary escalation mechanism: ${secondaryEscalationType}`);
  }
  if (crisisType) {
    parts.push(`    Crisis type: ${crisisType}`);
  }
  if (expectedGapMagnitude) {
    parts.push(`    Expected gap magnitude: ${expectedGapMagnitude}`);
  }
  if (isMidpoint) {
    parts.push(`    Midpoint: true (${midpointType ?? 'UNSPECIFIED'})`);
  } else {
    parts.push('    Midpoint: false');
  }
  if (uniqueScenarioHook) {
    parts.push(`    Scenario hook: ${uniqueScenarioHook}`);
  }
  if (approachVectors && approachVectors.length > 0) {
    parts.push(`    Approach vectors: ${approachVectors.join(', ')}`);
  }
  if (typeof setpieceSourceIndex === 'number') {
    parts.push(`    Setpiece source index: ${setpieceSourceIndex}`);
  }
  if (obligatorySceneTag) {
    parts.push(`    Obligatory scene tag: ${obligatorySceneTag}`);
  }
  return parts.length > 0 ? '\n' + parts.join('\n') : '';
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
    Objective: ${beat.objective}${formatEscalationFields(beat.causalLink, beat.escalationType, beat.secondaryEscalationType, beat.crisisType, beat.expectedGapMagnitude, beat.isMidpoint, beat.midpointType, beat.uniqueScenarioHook, beat.approachVectors, beat.setpieceSourceIndex, beat.obligatorySceneTag)}
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
    Objective: ${beat.objective}${formatEscalationFields(beat.causalLink, beat.escalationType, beat.secondaryEscalationType, beat.crisisType, beat.expectedGapMagnitude, beat.isMidpoint, beat.midpointType, beat.uniqueScenarioHook, beat.approachVectors, beat.setpieceSourceIndex, beat.obligatorySceneTag)}`
    )
    .join('\n');
}

function buildGenreObligationSection(context: StructureRewriteContext): string {
  if (!context.conceptSpec) {
    return '';
  }

  const allObligations = getGenreObligationTags(context.conceptSpec.genreFrame);
  if (allObligations.length === 0) {
    return '';
  }

  const fulfilled = new Set(
    context.completedBeats
      .map((beat) => beat.obligatorySceneTag)
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  );
  const remaining = allObligations.filter((entry) => !fulfilled.has(entry.tag));

  const allLines = allObligations.map((entry) => `- ${entry.tag}: ${entry.gloss}`).join('\n');
  const fulfilledLines =
    fulfilled.size > 0 ? [...fulfilled].map((tag) => `- ${tag}`).join('\n') : '- (none)';
  const remainingLines = remaining.length > 0 ? remaining.map((entry) => `- ${entry.tag}: ${entry.gloss}`).join('\n') : '- (none)';

  return `\nGENRE OBLIGATION CONTRACT (for ${context.conceptSpec.genreFrame}):
All obligation tags:
${allLines}

Already fulfilled in completed canon beats (must stay fulfilled):
${fulfilledLines}

Remaining obligation tags to cover in regenerated beats:
${remainingLines}
`;
}

export function buildStructureRewritePrompt(
  context: StructureRewriteContext,
  _options?: PromptOptions
): ChatMessage[] {
  const completedBeatsSection = formatCompletedBeats(context.completedBeats);
  const plannedBeatsSection =
    context.plannedBeats.length > 0
      ? `
## ORIGINALLY PLANNED BEATS (CONTEXT ONLY — DO NOT COPY)
The following beats were the original plan before the deviation occurred. They represent where the story WAS going, not where it IS going.

Use these ONLY to understand the original narrative intent. Then generate FRESH beats that:
- Chart a meaningfully different path from the current narrative state
- Respond to what actually happened in the story (not what was planned)
- May share thematic goals with planned beats but must differ substantially in events, descriptions, and dramatic approach
- Must NOT reuse the same beat names, descriptions, or scenarios with only cosmetic rewording

If the deviation was significant enough to trigger a rewrite, the new beats must reflect that significance. A structure rewrite that reproduces the original plan with minor edits is a failed rewrite.

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
  const genreObligationSection = buildGenreObligationSection(context);

  const genreConventionsSection = buildGenreConventionsSection(context.conceptSpec?.genreFrame);

  const userPrompt = `Regenerate story structure for an interactive branching narrative.

The story has deviated from its original plan. Generate replacement beats for invalidated future structure while preserving completed canon.

## STORY CONTEXT
Character: ${protagonistSection}
${worldSection}Tone: ${context.tone}
${toneFeelLine}${toneAvoidLine}Original Theme: ${context.originalTheme}
Original Opening Image: ${context.originalOpeningImage}
Original Closing Image: ${context.originalClosingImage}
${spineSection}${conceptStakesSection}${genreConventionsSection}${genreObligationSection}
## WHAT HAS ALREADY HAPPENED (CANON - DO NOT CHANGE)
The following beats have been completed. Their resolutions are permanent and must be respected.

${completedBeatsSection}
${plannedBeatsSection}## CURRENT SITUATION
Deviation occurred at: Act ${context.currentActIndex + 1}, Beat ${context.currentBeatIndex + 1}
Reason for deviation: ${context.deviationReason}

Current narrative state:
${context.narrativeSummary}

## YOUR TASK
Generate NEW beats to replace invalidated ones. You are regenerating: ${getActsToRegenerate(context.currentActIndex, context.totalActCount)}.

REQUIREMENTS (follow ALL):
1. Preserve completed beats exactly—include them in the output with unchanged names, descriptions, objectives, and roles
2. Maintain thematic AND tonal coherence with the original story. New beats must match the TONE/GENRE "${context.tone}" in naming, stakes, and emotional register. Do not drift toward generic default-genre conventions; remain inside the given tone/genre identity.
3. Build naturally from the current narrative state
4. Follow dramatic structure principles (setup, confrontation, resolution)
5. Keep 2-4 beats per act total (including preserved beats)
6. Beats should be flexible milestones, not rigid gates
7. Account for branching narrative paths
8. Design beats with clear dramatic roles:
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "reflection" for thematic/internal deepening without forced escalation, "resolution" for denouement
   - Preserve beat roles from completed beats unchanged
9. Write a premise: a 1-2 sentence hook capturing the core dramatic question (may evolve from original)
10. Keep openingImage aligned with completed canon by preserving the original opening image exactly: "${context.originalOpeningImage}".
11. Generate closingImage for the revised structure so it still mirrors or contrasts the opening image while fitting the new direction.
12. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's remaining scope
13. For every beat, write a causalLink sentence describing what directly causes this beat's situation. Use explicit "because of" logic; avoid "and then" sequencing. For first regenerated beats in an act, reference the initiating condition from canon or current narrative state. Preserve causalLink from completed beats unchanged.
14. For each beat with role "escalation" or "turning_point", assign an escalationType describing HOW stakes rise. Choose from:
   - THREAT_ESCALATION: Opposition magnitude increases
   - REVELATION_SHIFT: Hidden truth recontextualizes everything
   - REVERSAL_OF_FORTUNE: Progress inverts into setback
   - BETRAYAL_OR_ALLIANCE_SHIFT: Social topology changes
   - RESOURCE_OR_CAPABILITY_LOSS: Protagonist loses a dependency
   - MORAL_OR_ETHICAL_PRESSURE: Every option requires value compromise
   - TEMPORAL_OR_ENVIRONMENTAL_PRESSURE: External conditions constrict
   - COMPLICATION_CASCADE: Consequences compound into crises
   - COMPETENCE_DEMAND_SPIKE: Challenge exceeds demonstrated capability
   For "setup", "reflection", and "resolution" beats, set escalationType to null. Preserve escalationType from completed beats unchanged.
15. For each beat with role "escalation" or "turning_point", assign a crisisType describing the dilemma shape. Choose from:
   - BEST_BAD_CHOICE: all available options carry meaningful cost; the protagonist chooses the least damaging path
   - IRRECONCILABLE_GOODS: the protagonist must choose between two genuinely valuable outcomes that cannot both be preserved
   For "setup", "reflection", and "resolution" beats, set crisisType to null. Preserve crisisType from completed beats unchanged.
   When choosing escalation types and crisis types together, ensure the crisis expresses a real decision pressure, not just environmental difficulty.
16. For each beat with role "escalation" or "turning_point", you MAY assign a secondaryEscalationType when the beat escalates on two axes simultaneously. Use the same enum as escalationType. If single-axis escalation is sufficient, set secondaryEscalationType to null. For "setup", "reflection", and "resolution" beats, set secondaryEscalationType to null. Preserve secondaryEscalationType from completed beats unchanged.
17. For each beat with role "escalation" or "turning_point", assign expectedGapMagnitude to indicate expected expectation-vs-result divergence. Choose from NARROW | MODERATE | WIDE | CHASM. Magnitudes should generally increase over the story's escalation path. For "setup", "reflection", and "resolution" beats, set expectedGapMagnitude to null. Preserve expectedGapMagnitude from completed beats unchanged.
18. Midpoint invariant:
   - Preserve midpoint fields from completed beats unchanged
   - Ensure exactly one beat in the full output has isMidpoint: true
   - For midpoint beat, midpointType must be FALSE_VICTORY or FALSE_DEFEAT
   - For non-midpoint beats, set isMidpoint: false and midpointType: null
19. For each beat with role "escalation" or "turning_point", write a uniqueScenarioHook: one sentence describing what makes this beat unique to THIS story. For "setup", "reflection", and "resolution" beats, set uniqueScenarioHook to null. Preserve uniqueScenarioHook from completed beats unchanged.
20. For each beat with role "escalation" or "turning_point", assign 2-3 approachVectors suggesting HOW the protagonist could tackle this beat. Choose from:
   - DIRECT_FORCE, SWIFT_ACTION, STEALTH_SUBTERFUGE, ANALYTICAL_REASONING, CAREFUL_OBSERVATION, INTUITIVE_LEAP, PERSUASION_INFLUENCE, EMPATHIC_CONNECTION, ENDURANCE_RESILIENCE, SELF_EXPRESSION
   For "setup", "reflection", and "resolution" beats, set approachVectors to null. Preserve approachVectors from completed beats unchanged.
21. If a GENRE OBLIGATION CONTRACT section is present:
   - Preserve obligatorySceneTag on completed beats unchanged.
   - For regenerated beats, assign obligatorySceneTag using one of the listed obligation tags when a beat fulfills it; otherwise set obligatorySceneTag to null.
   - Every tag listed under "Remaining obligation tags to cover in regenerated beats" must appear at least once in regenerated beats.

OUTPUT SHAPE (arc fields only — tone and NPC agendas are preserved from the original):
- overallTheme: string (may evolve slightly from original, or stay the same)
- premise: string (1-2 sentence story hook)
- openingImage: string (must preserve original opening image exactly)
- closingImage: string
- pacingBudget: { targetPagesMin: number, targetPagesMax: number }
- acts: 3-5 items (STRONGLY prefer 3 acts; use 4 only when narrative complexity genuinely demands it; 5 only in exceptional cases)
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
      - causalLink: one sentence explaining the cause of this beat's situation
      - role: "setup" | "escalation" | "turning_point" | "reflection" | "resolution"
      - escalationType: one of the 9 escalation types above, or null for setup/reflection/resolution beats
      - secondaryEscalationType: one of the 9 escalation types above when dual-axis escalation is present, else null
      - crisisType: BEST_BAD_CHOICE | IRRECONCILABLE_GOODS | null (null for setup/reflection/resolution beats)
      - expectedGapMagnitude: NARROW | MODERATE | WIDE | CHASM | null (null for setup/reflection/resolution beats)
      - isMidpoint: boolean (true for exactly one beat in the full structure)
      - midpointType: FALSE_VICTORY | FALSE_DEFEAT | null (non-null only when isMidpoint is true)
      - uniqueScenarioHook: one sentence grounded in THIS story's specifics, or null for setup/reflection/resolution beats
      - approachVectors: 2-3 approach vector enums, or null for setup/reflection/resolution beats
      - obligatorySceneTag: genre obligation tag when this beat fulfills one listed obligation, else null`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
  ];

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}

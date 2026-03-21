import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import type { ProtagonistGuidance } from '../../models/protagonist-guidance.js';
import { isProtagonistGuidanceEmpty } from '../../models/protagonist-guidance.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildToneDirective } from './sections/shared/tone-block.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import {
  buildNpcAgendasSection,
  buildNpcRelationshipsSection,
} from './sections/shared/npc-state-sections.js';
import {
  buildInventorySection,
  buildHealthSection,
} from './sections/shared/resource-state-sections.js';
import type { ThreadEntry, AgedTrackedPromise } from '../../models/state/keyed-entry.js';
import type {
  SceneIdeatorContext,
  SceneIdeatorContinuationContext,
} from '../scene-ideator-types.js';
import type { SceneIdeationSlate } from '../scene-ideation-slate.js';
import { buildSceneIdeationContextSignals } from '../scene-ideation-context-signals.js';
import { buildSceneIdeationSlate } from '../scene-ideation-slate.js';
import { SCENE_IDEA_LANES } from '../../models/scene-direction-taxonomy.js';

function buildSceneIdeatorRole(targetOptionCount: number): string {
  return `You are a scene direction architect for interactive branching fiction. Your job is to generate exactly ${targetOptionCount} distinct scene direction options that give the player meaningful creative control over what kind of scene comes next.

You do NOT write the scene. You propose dramatically distinct directions the scene could take, classified by four narrative dimensions:
- Scene Purpose: What dramatic function the scene serves (e.g., CONFRONTATION, REVELATION, PREPARATION)
- Value Polarity Shift: How values change within the scene (McKee's polarity model)
- Pacing Mode: The rhythmic energy of the scene (Swain/Weiland pacing theory)
- Dramatic Energy Source: What primary force drives this scene — the axis along which this option's dramatic energy flows (McKee/Aristotle/Truby)`;
}

const DIVERSITY_CONSTRAINT = `DIVERSITY CONSTRAINT:
Each option is assigned a different diversityLane and must fulfill that lane exactly.
No two options may share the same diversityLane.
No two options may share the same (scenePurpose, valuePolarityShift) combination.
No two options may share the same (diversityLane, scenePurpose) combination.
Do not produce mirrored opposites or tonal variants of the same core event. Different lanes must open different kinds of next scenes, not merely different moods.`;

const FIELD_INSTRUCTIONS = `FIELD INSTRUCTIONS:
- diversityLane: ${SCENE_IDEA_LANES.join(', ')}
- scenePurpose: EXPOSITION, INCITING_INCIDENT, RISING_COMPLICATION, REVERSAL, REVELATION, CONFRONTATION, NEGOTIATION, INVESTIGATION, PREPARATION, ESCAPE, PURSUIT, SACRIFICE, BETRAYAL, REUNION, TRANSFORMATION, CLIMACTIC_CHOICE, AFTERMATH
- valuePolarityShift: POSITIVE_TO_NEGATIVE, NEGATIVE_TO_POSITIVE, POSITIVE_TO_DOUBLE_NEGATIVE, NEGATIVE_TO_DOUBLE_POSITIVE, IRONIC_SHIFT
- pacingMode: ACCELERATING, DECELERATING, SUSTAINED_HIGH, OSCILLATING, BUILDING_SLOW
- sceneDirection: 2-3 sentences describing WHAT happens in this direction. Concrete and specific to the current story state. Not a vague theme — a specific dramatic scenario with materially different leverage from the other options.
- dramaticJustification: 1-2 sentences explaining WHY this direction serves the story right now. Reference structure position, character arc needs, thematic tension, or why the assigned lane is valuable now.`;

const LANE_INSTRUCTIONS: Readonly<Record<string, string>> = {
  EXTERNAL_FORCE:
    'The world acts on the protagonist — threat, obstacle, deadline, hostile action, or environmental pressure. The primary dramatic energy comes from outside forces bearing down. (McKee: progressive complication via action; Aristotle: desis)',
  EPISTEMIC_SHIFT:
    'New information enters the story that reframes understanding — a hidden truth surfaces, a deception is unveiled, or a pattern is recognized. The dramatic energy comes from what is known changing. (Aristotle: anagnorisis; McKee: revelation turning point)',
  INTERPERSONAL_TENSION:
    'Alliance, trust, loyalty, intimacy, or rivalry between characters shifts. The dramatic energy comes from the space between people. (Truby: relationship lines; Dramatica: relationship throughline)',
  MORAL_CRUCIBLE:
    'The protagonist faces a choice between competing values where there is no clean answer — the cost of choosing reveals character. The dramatic energy comes from values in collision. (McKee/Coyne: crisis as best bad choice or irreconcilable goods)',
  CAUSAL_HARVEST:
    'Prior choices, promises, or accumulated pressure bear fruit or exact costs. Seeds planted earlier bloom or rot. The dramatic energy comes from the past catching up to the present. (Laws: gratification/bringdown; Chekhov: setup/payoff)',
  INNER_THRESHOLD:
    "The protagonist's self-concept, beliefs, or identity face a test that may change who they are. The dramatic energy comes from within — corruption, growth, ritual, or becoming. (Vogler: crossing the threshold; Weiland: character arc)",
};

function buildStructurePositionSection(context: SceneIdeatorContinuationContext): string {
  if (!context.accumulatedStructureState || !context.structure) {
    return '';
  }

  const state = context.accumulatedStructureState;
  const actIndex = state.currentActIndex;
  const milestoneIndex = state.currentMilestoneIndex;
  const act = context.structure.acts[actIndex];
  const milestone = act?.milestones[milestoneIndex];

  const lines: string[] = ['CURRENT STRUCTURE POSITION:'];
  if (act) {
    lines.push(`Act ${actIndex + 1}/${context.structure.acts.length}: ${act.objective}`);
  }
  if (milestone) {
    lines.push(`Milestone: ${milestone.name} (${milestone.role}) — ${milestone.description}`);
  }
  lines.push('');

  return lines.join('\n');
}

function buildActiveStateSection(context: SceneIdeatorContinuationContext): string {
  const lines: string[] = ['CURRENT STORY STATE:'];
  lines.push(`Location: ${context.activeState.currentLocation}`);

  if (context.activeState.activeThreats.length > 0) {
    const threats = context.activeState.activeThreats
      .map((t) => `${t.text} (${t.threatType})`)
      .join('; ');
    lines.push(`Active threats: ${threats}`);
  }

  if (context.activeState.openThreads.length > 0) {
    const threads = context.activeState.openThreads
      .map((t) => `${t.text} [${t.urgency}]`)
      .join('; ');
    lines.push(`Open threads: ${threads}`);
  }

  if (context.activeState.activeConstraints.length > 0) {
    const constraints = context.activeState.activeConstraints.map((c) => c.text).join('; ');
    lines.push(`Active constraints: ${constraints}`);
  }

  lines.push('');
  return lines.join('\n');
}

const SCOPE_PRIORITY: Readonly<Record<string, number>> = {
  SCENE: 0,
  BEAT: 1,
  ACT: 2,
  STORY: 3,
};

export function formatOverdueThreadsSection(
  overdueThreads: readonly ThreadEntry[],
  threadAges: Readonly<Record<string, number>>
): string {
  if (overdueThreads.length === 0) return '';
  const sorted = [...overdueThreads]
    .sort((a, b) => (threadAges[b.id] ?? 0) - (threadAges[a.id] ?? 0))
    .slice(0, 5);
  const list = sorted
    .map((t) => `${t.text} (${t.threadType}, ${t.urgency}, ${threadAges[t.id] ?? 0} pages)`)
    .join('; ');
  return `OVERDUE THREADS (consider addressing): ${list}\n`;
}

export function formatPendingPromisesSection(
  pendingPromises: readonly AgedTrackedPromise[]
): string {
  if (pendingPromises.length === 0) return '';
  const sorted = [...pendingPromises]
    .sort((a, b) => {
      const scopeDelta = (SCOPE_PRIORITY[a.scope] ?? 4) - (SCOPE_PRIORITY[b.scope] ?? 4);
      return scopeDelta !== 0 ? scopeDelta : b.age - a.age;
    })
    .slice(0, 5);
  const list = sorted
    .map((p) => `${p.description} [${p.promiseType}, ${p.scope}, age: ${p.age}]`)
    .join('; ');
  return `PENDING PROMISES (consider fulfilling): ${list}\n`;
}

export function buildIdeatorGuidanceSection(guidance: ProtagonistGuidance | undefined): string {
  if (isProtagonistGuidanceEmpty(guidance)) {
    return '';
  }

  const lines: string[] = [
    '=== PROTAGONIST GUIDANCE (CONSTRAINT) ===',
    'The player has provided intent for the protagonist. Use this as a compatibility filter: generate directions where this guidance can be fulfilled, not directions that contradict it.\n',
  ];

  if (guidance!.suggestedEmotions) {
    lines.push(
      `Emotions: The player intends the protagonist to feel: "${guidance!.suggestedEmotions}". Generate scene directions where this emotional arc can naturally emerge. Avoid directions that would require contradictory emotions.`
    );
  }

  if (guidance!.suggestedThoughts) {
    lines.push(
      `Thoughts: The player intends the protagonist to think: "${guidance!.suggestedThoughts}". Generate scene directions that create circumstances where these reflections would naturally arise. Avoid directions that make these thoughts irrelevant.`
    );
  }

  if (guidance!.suggestedSpeech) {
    lines.push(
      `Speech: The player intends the protagonist to say something like: "${guidance!.suggestedSpeech}". At least one scene direction should create a natural moment for this kind of statement. Avoid directions where there is no plausible context for it.`
    );
  }

  lines.push('');
  return lines.join('\n');
}

function buildContinuationSections(context: SceneIdeatorContinuationContext): string {
  const sections: string[] = [];
  const signals = buildSceneIdeationContextSignals(context);

  sections.push(`PREVIOUS SCENE SUMMARY:\n${context.previousNarrative}\n`);
  sections.push(`PLAYER'S CHOSEN ACTION:\n${context.selectedChoice}\n`);

  sections.push(buildActiveStateSection(context));
  sections.push(buildStructurePositionSection(context));

  sections.push(buildNpcAgendasSection(context.accumulatedNpcAgendas));
  sections.push(buildNpcRelationshipsSection(context.accumulatedNpcRelationships));
  sections.push(buildInventorySection(context.accumulatedInventory));
  sections.push(buildHealthSection(context.accumulatedHealth));

  if (context.ancestorSummaries.length > 0) {
    const recent = context.ancestorSummaries.slice(-3);
    const summaryText = recent.map((s) => `- ${s.summary}`).join('\n');
    sections.push(`RECENT STORY CONTEXT:\n${summaryText}\n`);
  }

  sections.push(formatOverdueThreadsSection(signals.overdueThreads, context.threadAges ?? {}));

  sections.push(formatPendingPromisesSection(signals.pendingPromises));

  sections.push(buildIdeatorGuidanceSection(context.protagonistGuidance));

  return sections.filter((s) => s.length > 0).join('\n');
}

function buildIdeationSlateSection(slate: SceneIdeationSlate): string {
  const lines = [`IDEATION SLATE:`, `Generate exactly ${slate.targetOptionCount} options.`, ''];

  for (const slot of slate.slots) {
    lines.push(`Option ${slot.index + 1} lane: ${slot.lane}`);
    lines.push(`- ${LANE_INSTRUCTIONS[slot.lane]}`);
    lines.push(`- Rationale: ${slot.rationale}`);
    if (slot.requiredSignals && slot.requiredSignals.length > 0) {
      lines.push(`- Required context to honor: ${slot.requiredSignals.join(', ')}`);
    }
    if (slot.discouragedSignals && slot.discouragedSignals.length > 0) {
      lines.push(`- Avoid redundancy with: ${slot.discouragedSignals.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function buildSceneIdeatorPrompt(
  context: SceneIdeatorContext,
  slate: SceneIdeationSlate = buildSceneIdeationSlate(context)
): ChatMessage[] {
  const systemSections: string[] = [buildSceneIdeatorRole(slate.targetOptionCount)];

  if (context.tone) {
    systemSections.push(buildToneDirective(context.tone, context.toneFeel, context.toneAvoid));
  }

  systemSections.push(CONTENT_POLICY);
  systemSections.push(DIVERSITY_CONSTRAINT);
  systemSections.push(FIELD_INSTRUCTIONS);

  const userSections: string[] = [
    `Generate exactly ${slate.targetOptionCount} scene direction options for the upcoming scene.\n`,
  ];

  userSections.push(buildSpineSection(context.spine));

  if (context.decomposedCharacters.length > 0) {
    const charText = context.decomposedCharacters
      .map((c) => formatDecomposedCharacterForPrompt(c))
      .join('\n\n');
    userSections.push(`CHARACTERS:\n${charText}\n`);
  }

  const worldText = formatDecomposedWorldForPrompt(context.decomposedWorld);
  if (worldText) {
    userSections.push(`WORLD:\n${worldText}\n`);
  }

  userSections.push(buildIdeationSlateSection(slate));

  if (context.mode === 'opening') {
    if (context.startingSituation) {
      userSections.push(`STARTING SITUATION:\n${context.startingSituation}\n`);
    }
    userSections.push(
      'This is the OPENING scene of the story. Use the common starting situation, then branch outward into different dramatic engines that establish the world and protagonist while creating immediate dramatic interest.\n'
    );
  } else {
    userSections.push(buildContinuationSections(context));
    userSections.push(
      "Use the player's chosen action and current story state as a common starting point, then branch outward into different dramatic engines. Generate scene directions that follow naturally from the player's choice while advancing the story in meaningfully different ways.\n"
    );
  }

  userSections.push(
    `OUTPUT SHAPE:\n- options: array of exactly ${slate.targetOptionCount} scene direction objects, each with diversityLane, scenePurpose, valuePolarityShift, pacingMode, sceneDirection, dramaticJustification`
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.filter((s) => s.length > 0).join('\n') },
  ];
}

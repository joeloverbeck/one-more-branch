import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import type { ProtagonistGuidance } from '../../models/protagonist-guidance.js';
import { isProtagonistGuidanceEmpty } from '../../models/protagonist-guidance.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildToneDirective } from './sections/shared/tone-block.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildNpcAgendasSection, buildNpcRelationshipsSection } from './sections/shared/npc-state-sections.js';
import { buildInventorySection, buildHealthSection } from './sections/shared/resource-state-sections.js';
import type { ThreadEntry, AgedTrackedPromise } from '../../models/state/keyed-entry.js';
import { Urgency } from '../../models/state/keyed-entry.js';
import { getOverdueThreads } from './sections/planner/index.js';
import type {
  SceneIdeatorContext,
  SceneIdeatorContinuationContext,
} from '../scene-ideator-types.js';

const SCENE_IDEATOR_ROLE = `You are a scene direction architect for interactive branching fiction. Your job is to generate exactly 3 distinct scene direction options that give the player meaningful creative control over what kind of scene comes next.

You do NOT write the scene. You propose dramatically distinct directions the scene could take, classified by three narrative dimensions:
- Scene Purpose: What dramatic function the scene serves (e.g., CONFRONTATION, REVELATION, PREPARATION)
- Value Polarity Shift: How values change within the scene (McKee's polarity model)
- Pacing Mode: The rhythmic energy of the scene (Swain/Weiland pacing theory)`;

const DIVERSITY_CONSTRAINT = `DIVERSITY CONSTRAINT:
No two options may share the same (scenePurpose, valuePolarityShift) combination.
Each option must represent a genuinely different dramatic direction, not a cosmetic variant.
Across the 3 options, maximize variety in scenePurpose — ideally all three should differ.`;

const FIELD_INSTRUCTIONS = `FIELD INSTRUCTIONS:
- scenePurpose: EXPOSITION, INCITING_INCIDENT, RISING_COMPLICATION, REVERSAL, REVELATION, CONFRONTATION, NEGOTIATION, INVESTIGATION, PREPARATION, ESCAPE, PURSUIT, SACRIFICE, BETRAYAL, REUNION, TRANSFORMATION, CLIMACTIC_CHOICE, AFTERMATH
- valuePolarityShift: POSITIVE_TO_NEGATIVE, NEGATIVE_TO_POSITIVE, POSITIVE_TO_DOUBLE_NEGATIVE, NEGATIVE_TO_DOUBLE_POSITIVE, IRONIC_SHIFT
- pacingMode: ACCELERATING, DECELERATING, SUSTAINED_HIGH, OSCILLATING, BUILDING_SLOW
- sceneDirection: 2-3 sentences describing WHAT happens in this direction. Concrete and specific to the current story state. Not a vague theme — a specific dramatic scenario.
- dramaticJustification: 1-2 sentences explaining WHY this direction serves the story right now. Reference structure position, character arc needs, or thematic tension.`;

function buildStructurePositionSection(
  context: SceneIdeatorContinuationContext
): string {
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

function buildActiveStateSection(
  context: SceneIdeatorContinuationContext
): string {
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
    const constraints = context.activeState.activeConstraints
      .map((c) => c.text)
      .join('; ');
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
  openThreads: readonly ThreadEntry[],
  threadAges: Readonly<Record<string, number>>
): string {
  const overdue = getOverdueThreads(openThreads, threadAges);
  if (overdue.length === 0) return '';
  const sorted = [...overdue]
    .sort((a, b) => (threadAges[b.id] ?? 0) - (threadAges[a.id] ?? 0))
    .slice(0, 5);
  const list = sorted
    .map((t) => `${t.text} (${t.threadType}, ${t.urgency}, ${threadAges[t.id] ?? 0} pages)`)
    .join('; ');
  return `OVERDUE THREADS (consider addressing): ${list}\n`;
}

export function formatPendingPromisesSection(
  accumulatedPromises: readonly AgedTrackedPromise[]
): string {
  const filtered = accumulatedPromises.filter(
    (p) => p.suggestedUrgency === Urgency.HIGH || p.age >= 5
  );
  if (filtered.length === 0) return '';
  const sorted = [...filtered]
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

export function buildIdeatorGuidanceSection(
  guidance: ProtagonistGuidance | undefined
): string {
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

function buildContinuationSections(
  context: SceneIdeatorContinuationContext
): string {
  const sections: string[] = [];

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
    const summaryText = recent
      .map((s) => `- ${s.summary}`)
      .join('\n');
    sections.push(`RECENT STORY CONTEXT:\n${summaryText}\n`);
  }

  if (context.threadAges) {
    sections.push(
      formatOverdueThreadsSection(context.activeState.openThreads, context.threadAges)
    );
  }

  sections.push(formatPendingPromisesSection(context.accumulatedPromises));

  sections.push(buildIdeatorGuidanceSection(context.protagonistGuidance));

  return sections.filter((s) => s.length > 0).join('\n');
}

export function buildSceneIdeatorPrompt(
  context: SceneIdeatorContext
): ChatMessage[] {
  const systemSections: string[] = [SCENE_IDEATOR_ROLE];

  if (context.tone) {
    systemSections.push(
      buildToneDirective(context.tone, context.toneFeel, context.toneAvoid)
    );
  }

  systemSections.push(CONTENT_POLICY);
  systemSections.push(DIVERSITY_CONSTRAINT);
  systemSections.push(FIELD_INSTRUCTIONS);

  const userSections: string[] = [
    'Generate exactly 3 scene direction options for the upcoming scene.\n',
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

  if (context.mode === 'opening') {
    if (context.startingSituation) {
      userSections.push(`STARTING SITUATION:\n${context.startingSituation}\n`);
    }
    userSections.push(
      'This is the OPENING scene of the story. The directions should establish the world and protagonist while creating immediate dramatic interest.\n'
    );
  } else {
    userSections.push(buildContinuationSections(context));
    userSections.push(
      'Generate 3 scene directions that follow naturally from the player\'s choice while advancing the story in meaningfully different ways.\n'
    );
  }

  userSections.push(
    'OUTPUT SHAPE:\n- options: array of exactly 3 scene direction objects, each with scenePurpose, valuePolarityShift, pacingMode, sceneDirection, dramaticJustification'
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.filter((s) => s.length > 0).join('\n') },
  ];
}

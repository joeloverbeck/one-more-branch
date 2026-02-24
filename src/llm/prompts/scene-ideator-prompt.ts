import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildToneDirective } from './sections/shared/tone-block.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildNpcAgendasSection, buildNpcRelationshipsSection } from './sections/shared/npc-state-sections.js';
import { buildInventorySection, buildHealthSection } from './sections/shared/resource-state-sections.js';
import { Urgency } from '../../models/state/keyed-entry.js';
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
  const beatIndex = state.currentBeatIndex;
  const act = context.structure.acts[actIndex];
  const beat = act?.beats[beatIndex];

  const lines: string[] = ['CURRENT STRUCTURE POSITION:'];
  if (act) {
    lines.push(`Act ${actIndex + 1}/${context.structure.acts.length}: ${act.objective}`);
  }
  if (beat) {
    lines.push(`Beat: ${beat.name} (${beat.role}) — ${beat.description}`);
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

  if (context.threadAges && Object.keys(context.threadAges).length > 0) {
    const aged = Object.entries(context.threadAges)
      .filter(([, age]) => age >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    if (aged.length > 0) {
      const threadList = aged.map(([id, age]) => `${id} (${age} pages)`).join('; ');
      sections.push(`OVERDUE THREADS (consider addressing): ${threadList}\n`);
    }
  }

  if (context.accumulatedPromises.length > 0) {
    const urgent = context.accumulatedPromises
      .filter((p) => p.suggestedUrgency === Urgency.HIGH || p.age >= 5)
      .slice(0, 5);
    if (urgent.length > 0) {
      const promiseList = urgent
        .map((p) => `${p.description} [${p.promiseType}, age: ${p.age}]`)
        .join('; ');
      sections.push(`PENDING PROMISES (consider fulfilling): ${promiseList}\n`);
    }
  }

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

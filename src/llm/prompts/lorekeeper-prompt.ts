import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import { formatNpcsForPrompt } from '../../models/npc.js';
import { formatCanonForPrompt } from '../../engine/canon-manager.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { LorekeeperContext } from '../context-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { LOREKEEPER_CURATION_PRINCIPLES } from '../lorekeeper-contract.js';
import { buildWriterStructureContext } from './continuation/index.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

function formatNumberedLines(lines: readonly string[]): string {
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
}

const LOREKEEPER_SYSTEM_PROMPT = `You are the Lorekeeper for an interactive branching story. Your role is to curate a compact, scene-focused "Story Bible" containing ONLY what the writer needs for the upcoming scene.

You receive the full story context and the planner's scene intent. You must filter, synthesize, and return a focused bible that eliminates irrelevant information while preserving everything essential.

${CONTENT_POLICY}

CURATION PRINCIPLES:
${formatNumberedLines(LOREKEEPER_CURATION_PRINCIPLES)}`;

export function buildLorekeeperPrompt(context: LorekeeperContext): ChatMessage[] {
  const plan = context.pagePlan;

  const hasDecomposed =
    context.decomposedCharacters && context.decomposedCharacters.length > 0;
  const hasDecomposedWorld =
    context.decomposedWorld && context.decomposedWorld.facts.length > 0;

  const npcsSection = hasDecomposed
    ? `CHARACTERS (structured profiles with speech fingerprints):
${context.decomposedCharacters.map((c, i) => formatDecomposedCharacterForPrompt(c, i === 0)).join('\n\n')}

`
    : context.npcs && context.npcs.length > 0
      ? `NPC DEFINITIONS:
${formatNpcsForPrompt(context.npcs)}

`
      : '';

  const canonSection =
    context.globalCanon.length > 0
      ? `ESTABLISHED WORLD FACTS:
${formatCanonForPrompt(context.globalCanon)}

`
      : '';

  const characterCanonEntries = Object.entries(context.globalCharacterCanon);
  const characterCanonSection =
    characterCanonEntries.length > 0
      ? `CHARACTER CANON (permanent traits):
${characterCanonEntries
  .map(([name, facts]) => `[${name}]\n${facts.map((fact) => `- ${fact}`).join('\n')}`)
  .join('\n\n')}

`
      : '';

  const characterStateEntries = Object.entries(context.accumulatedCharacterState);
  const characterStateSection =
    characterStateEntries.length > 0
      ? `NPC ACCUMULATED STATE (branch-specific events):
${characterStateEntries
  .map(
    ([name, states]) =>
      `[${name}]\n${states.map((state) => `- [${state.id}] ${state.text}`).join('\n')}`
  )
  .join('\n\n')}

`
      : '';

  const npcAgendaEntries = context.accumulatedNpcAgendas
    ? Object.values(context.accumulatedNpcAgendas)
    : [];
  const npcAgendasSection =
    npcAgendaEntries.length > 0
      ? `NPC AGENDAS (current goals and off-screen behavior):
${npcAgendaEntries
  .map(
    (a) =>
      `[${a.npcName}]
  Goal: ${a.currentGoal}
  Leverage: ${a.leverage}
  Fear: ${a.fear}
  Off-screen: ${a.offScreenBehavior}`
  )
  .join('\n\n')}

`
      : '';

  const npcRelationshipEntries = context.accumulatedNpcRelationships
    ? Object.values(context.accumulatedNpcRelationships)
    : [];
  const npcRelationshipsSection =
    npcRelationshipEntries.length > 0
      ? `NPC-PROTAGONIST RELATIONSHIPS:
${npcRelationshipEntries
  .map(
    (r) =>
      `[${r.npcName}]
  Dynamic: ${r.dynamic} | Valence: ${r.valence}
  Tension: ${r.currentTension}`
  )
  .join('\n\n')}

`
      : '';

  const activeState = context.activeState;
  const locationLine = activeState.currentLocation
    ? `Current Location: ${activeState.currentLocation}\n`
    : '';
  const threatsLine =
    activeState.activeThreats.length > 0
      ? `Active Threats: ${activeState.activeThreats.map((t) => t.text).join(', ')}\n`
      : '';
  const constraintsLine =
    activeState.activeConstraints.length > 0
      ? `Active Constraints: ${activeState.activeConstraints.map((c) => c.text).join(', ')}\n`
      : '';
  const threadsLine =
    activeState.openThreads.length > 0
      ? `Open Threads: ${activeState.openThreads.map((t) => `${t.text} [${t.threadType}/${t.urgency}]`).join(', ')}\n`
      : '';

  const activeStateSection =
    locationLine || threatsLine || constraintsLine || threadsLine
      ? `ACTIVE STATE:
${locationLine}${threatsLine}${constraintsLine}${threadsLine}
`
      : '';

  const structureSection = buildWriterStructureContext(
    context.structure,
    context.accumulatedStructureState
  );

  const ancestorSummarySection =
    context.ancestorSummaries.length > 0
      ? `ANCESTOR PAGE SUMMARIES (oldest first):
${context.ancestorSummaries.map((s) => `- Page ${s.pageId}: ${s.summary}`).join('\n')}

`
      : '';

  const grandparentSection = context.grandparentNarrative
    ? `GRANDPARENT NARRATIVE (2 pages ago):
${context.grandparentNarrative}

`
    : '';

  const isOpening = !!context.startingSituation;

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:
This is the opening page. The starting situation below describes what the protagonist is walking into. Use it to determine which worldbuilding elements, characters, and canon facts are relevant to this first scene.

${context.startingSituation}

`
    : '';

  const parentNarrativeSection = isOpening
    ? ''
    : `PARENT NARRATIVE (previous page):
${context.previousNarrative}

`;

  const choiceIntentSection =
    plan.choiceIntents.length > 0
      ? `Choice Intents:
${plan.choiceIntents.map((intent, i) => `${i + 1}. [${intent.choiceType} / ${intent.primaryDelta}] ${intent.hook}`).join('\n')}

`
      : '';

  const userPrompt = `Curate a Story Bible for the upcoming scene based on the planner's guidance and all available context.

=== PLANNER GUIDANCE ===
Scene Intent: ${plan.sceneIntent}
Dramatic Question: ${plan.dramaticQuestion}
Continuity Anchors:
${plan.continuityAnchors.map((anchor) => `- ${anchor}`).join('\n') || '- (none)'}
${choiceIntentSection}
=== FULL STORY CONTEXT ===

${hasDecomposed ? '' : `CHARACTER CONCEPT:
${context.characterConcept}

`}
${hasDecomposedWorld ? formatDecomposedWorldForPrompt(context.decomposedWorld) : `WORLDBUILDING:\n${context.worldbuilding || '(none provided)'}`}

${buildToneDirective(context.tone, context.toneFeel, context.toneAvoid)}

${buildSpineSection(context.spine)}${npcsSection}${npcAgendasSection}${npcRelationshipsSection}${structureSection}${canonSection}${characterCanonSection}${characterStateSection}${activeStateSection}${startingSituationSection}${ancestorSummarySection}${grandparentSection}${parentNarrativeSection}

=== INSTRUCTIONS ===
Return a Story Bible containing ONLY what the writer needs for this specific scene:
1. sceneWorldContext: Filter worldbuilding to what's relevant here
2. relevantCharacters: Characters present, physically nearby (behind doors, approaching, in adjacent spaces), referenced, or whose influence matters - with synthesized speech patterns
3. relevantCanonFacts: Only canon facts needed for consistency in this scene
4. relevantHistory: A synthesized narrative chronology preserving causality chains`;

  return [
    { role: 'system', content: LOREKEEPER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}

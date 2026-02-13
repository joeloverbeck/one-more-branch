import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import { formatNpcsForPrompt } from '../../models/npc.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { LorekeeperContext } from '../context-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildWriterStructureContext } from './continuation/index.js';

const LOREKEEPER_SYSTEM_PROMPT = `You are the Lorekeeper for an interactive branching story. Your role is to curate a compact, scene-focused "Story Bible" containing ONLY what the writer needs for the upcoming scene.

You receive the full story context and the planner's scene intent. You must filter, synthesize, and return a focused bible that eliminates irrelevant information while preserving everything essential.

${CONTENT_POLICY}

CURATION PRINCIPLES:
1. SELECTIVE INCLUSION: Only include characters, facts, history, and world details relevant to the planner's scene intent, continuity anchors, and dramatic question. The whole point is curation, not regurgitation.
2. SPEECH PATTERN EXTRACTION: For each relevant character, synthesize HOW they speak. When structured character profiles with speech fingerprints are provided, use those as your primary source for voice data (catchphrases, vocabulary, verbal tics, sentence patterns, dialogue samples). Enrich with character canon facts AND actual dialogue found in recent narrative text. When only raw NPC definitions are available, extract speech patterns from personality descriptions and backstory. This must be thorough - idiosyncratic speech is critical for voice consistency.
3. NARRATIVE CHRONOLOGY: The relevantHistory field must preserve causality chains and temporal ordering from ancestor summaries. Don't extract disconnected facts - build a narrative thread that shows how events led to the current moment.
4. RELATIONSHIP DYNAMICS: Capture trust levels, power dynamics, emotional tensions, and unresolved interpersonal history between characters and the protagonist.
5. INTER-CHARACTER DYNAMICS: When multiple characters share a scene, describe how they relate to EACH OTHER, not just to the protagonist.
6. CURRENT STATE: Each character's emotional state and situation as they enter the scene, derived from accumulated character state entries and recent narrative.
7. WORLD CONTEXT: When domain-tagged world facts are provided, use them as your primary worldbuilding source - they are pre-decomposed for efficient filtering by domain (geography, magic, society, etc.). Supplement with any runtime canon facts. When only raw worldbuilding text is available, extract relevant details manually. Include only what is physically, culturally, or socially relevant to THIS scene's location and events.
8. NPC AGENDAS: For each relevant character, incorporate their current agenda (goal, leverage, fear, off-screen behavior) into the character profile. This informs how NPCs will act in the scene.
9. TWO-SOURCE SYNTHESIS: You may receive two sources of truth: (a) structured character/world profiles (initial decomposition from story creation) and (b) runtime canon facts (discovered during gameplay). Prefer structured profiles for speech patterns, traits, relationships, and world rules. Use canon facts for runtime discoveries that supplement the initial decomposition.`;

export function buildLorekeeperPrompt(context: LorekeeperContext): ChatMessage[] {
  const plan = context.pagePlan;

  const hasDecomposed =
    context.decomposedCharacters && context.decomposedCharacters.length > 0;
  const hasDecomposedWorld =
    context.decomposedWorld && context.decomposedWorld.facts.length > 0;

  const npcsSection = hasDecomposed
    ? `CHARACTERS (structured profiles with speech fingerprints):
${context.decomposedCharacters.map((c) => formatDecomposedCharacterForPrompt(c)).join('\n\n')}

`
    : context.npcs && context.npcs.length > 0
      ? `NPC DEFINITIONS:
${formatNpcsForPrompt(context.npcs)}

`
      : '';

  const canonSection =
    context.globalCanon.length > 0
      ? `ESTABLISHED WORLD FACTS:
${context.globalCanon.map((fact) => `- ${fact}`).join('\n')}

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

CHARACTER CONCEPT:
${context.characterConcept}

${hasDecomposedWorld ? formatDecomposedWorldForPrompt(context.decomposedWorld) : `WORLDBUILDING:\n${context.worldbuilding || '(none provided)'}`}

TONE/GENRE: ${context.tone}

${npcsSection}${npcAgendasSection}${structureSection}${canonSection}${characterCanonSection}${characterStateSection}${activeStateSection}${startingSituationSection}${ancestorSummarySection}${grandparentSection}${parentNarrativeSection}
=== INSTRUCTIONS ===
Return a Story Bible containing ONLY what the writer needs for this specific scene:
1. sceneWorldContext: Filter worldbuilding to what's relevant here
2. relevantCharacters: Only characters present, referenced, or whose influence matters - with synthesized speech patterns
3. relevantCanonFacts: Only canon facts needed for consistency in this scene
4. relevantHistory: A synthesized narrative chronology preserving causality chains`;

  return [
    { role: 'system', content: LOREKEEPER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}

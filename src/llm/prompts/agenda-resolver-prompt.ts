import { formatNpcsForPrompt } from '../../models/npc.js';
import type { Npc } from '../../models/npc.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../../models/state/npc-agenda.js';
import type { ActiveState } from '../../models/state/active-state.js';
import type { AccumulatedStructureState, StoryStructure } from '../../models/story-arc.js';
import type { ChatMessage } from '../llm-client-types.js';

const AGENDA_RESOLVER_SYSTEM_PROMPT = `You are the NPC Agenda Resolver for an interactive branching story. After each scene, you evaluate how events affect each NPC's agenda and update their goals, leverage, fears, and off-screen behavior accordingly.

RULES:
1. Only update agendas whose situation materially changed due to the scene's events. If nothing relevant happened to an NPC, do NOT include them in updatedAgendas.
2. Off-screen NPCs still evolve: their goals progress, leverage shifts, and off-screen behavior reflects time passing and their own pursuits.
3. Keep each field to 1-2 sentences maximum.
4. Respect story structure pacing: do NOT let NPCs resolve Act 3 conflicts during Act 1. NPCs should be setting up, maneuvering, and positioning — not achieving endgame goals prematurely.
5. Off-screen behavior must be plausible given the NPC's leverage and fear. An NPC who fears exposure won't be acting boldly in public.
6. NPC names in your output MUST exactly match the names in the NPC definitions.
7. Return an empty updatedAgendas array if no NPC's situation changed materially.`;

export interface AgendaResolverPromptContext {
  readonly narrative: string;
  readonly sceneSummary: string;
  readonly npcs: readonly Npc[];
  readonly currentAgendas: AccumulatedNpcAgendas;
  readonly structure?: StoryStructure;
  readonly accumulatedStructureState?: AccumulatedStructureState;
  readonly activeState: ActiveState;
}

function formatCurrentAgendas(agendas: AccumulatedNpcAgendas): string {
  const entries = Object.values(agendas);
  if (entries.length === 0) {
    return '(no existing agendas)';
  }

  return entries
    .map(
      (a: NpcAgenda) =>
        `[${a.npcName}]
  Goal: ${a.currentGoal}
  Leverage: ${a.leverage}
  Fear: ${a.fear}
  Off-screen: ${a.offScreenBehavior}`
    )
    .join('\n\n');
}

export function buildAgendaResolverPrompt(context: AgendaResolverPromptContext): ChatMessage[] {
  const structureSection =
    context.structure && context.accumulatedStructureState
      ? `STORY STRUCTURE CONTEXT:
Current Act Index: ${context.accumulatedStructureState.currentActIndex}
Current Beat Index: ${context.accumulatedStructureState.currentBeatIndex}
Overall Theme: ${context.structure.overallTheme}

`
      : '';

  const locationLine = context.activeState.currentLocation
    ? `Current Location: ${context.activeState.currentLocation}\n`
    : '';
  const threatsLine =
    context.activeState.activeThreats.length > 0
      ? `Active Threats: ${context.activeState.activeThreats.map((t) => t.text).join(', ')}\n`
      : '';

  const userPrompt = `Evaluate NPC agenda changes after the following scene.

NPC DEFINITIONS:
${formatNpcsForPrompt(context.npcs)}

CURRENT NPC AGENDAS:
${formatCurrentAgendas(context.currentAgendas)}

${structureSection}ACTIVE STATE:
${locationLine}${threatsLine}
SCENE SUMMARY:
${context.sceneSummary}

NARRATIVE:
${context.narrative}

Return only agendas that changed. If nothing material changed for any NPC, return an empty updatedAgendas array.`;

  return [
    { role: 'system', content: AGENDA_RESOLVER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}

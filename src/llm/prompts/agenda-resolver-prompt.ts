import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatNpcsForPrompt } from '../../models/npc.js';
import type { DecomposedCharacter } from '../../models/decomposed-character.js';
import type { Npc } from '../../models/npc.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../../models/state/npc-agenda.js';
import type { ActiveState } from '../../models/state/active-state.js';
import type { StoryStructure } from '../../models/story-arc.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildToneBlock, buildToneReminder } from './sections/shared/tone-block.js';

const AGENDA_RESOLVER_SYSTEM_PROMPT = `You are the NPC Agenda Resolver for an interactive branching story. After each scene, you evaluate how events affect each NPC's agenda and update their goals, leverage, fears, and off-screen behavior accordingly.

RULES:
1. Only update agendas whose situation materially changed due to the scene's events. If nothing relevant happened to an NPC, do NOT include them in updatedAgendas.
2. Off-screen NPCs still evolve: their goals progress, leverage shifts, and off-screen behavior reflects time passing and their own pursuits.
3. Keep each field to 1-2 sentences maximum.
4. Respect story structure pacing: do NOT let NPCs resolve Act 3 conflicts during Act 1. NPCs should be setting up, maneuvering, and positioning - not achieving endgame goals prematurely.
5. Off-screen behavior must be plausible given the NPC's leverage and fear. An NPC who fears exposure won't be acting boldly in public.
6. When structured character profiles are provided, treat them as the primary source for motivations, relationships, and voice-influenced behavior.
7. NPC names in your output MUST exactly match the names in the character definitions section.
8. Return an empty updatedAgendas array if no NPC's situation changed materially.`;

export interface AgendaResolverPromptContext {
  readonly narrative: string;
  readonly sceneSummary: string;
  readonly npcs: readonly Npc[];
  readonly decomposedCharacters?: readonly DecomposedCharacter[];
  readonly currentAgendas: AccumulatedNpcAgendas;
  readonly structure?: StoryStructure;
  readonly activeState: ActiveState;
  readonly analystNpcCoherenceIssues?: string;
  readonly tone?: string;
  readonly toneKeywords?: readonly string[];
  readonly toneAntiKeywords?: readonly string[];
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

function buildAgendaResolverSystemPrompt(context: AgendaResolverPromptContext): string {
  const sections: string[] = [AGENDA_RESOLVER_SYSTEM_PROMPT];
  if (context.tone) {
    sections.push(buildToneBlock(context.tone, context.toneKeywords, context.toneAntiKeywords));
  }
  return sections.join('\n\n');
}

export function buildAgendaResolverPrompt(context: AgendaResolverPromptContext): ChatMessage[] {
  const hasDecomposed =
    context.decomposedCharacters && context.decomposedCharacters.length > 0;
  const characterDefinitionsSection = hasDecomposed
    ? `CHARACTERS (structured profiles with speech fingerprints):
${context.decomposedCharacters.map((c) => formatDecomposedCharacterForPrompt(c)).join('\n\n')}

`
    : `NPC DEFINITIONS:
${formatNpcsForPrompt(context.npcs)}

`;

  const structureSection = context.structure
    ? `STORY STRUCTURE CONTEXT:
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

${characterDefinitionsSection}CURRENT NPC AGENDAS:
${formatCurrentAgendas(context.currentAgendas)}

${structureSection}ACTIVE STATE:
${locationLine}${threatsLine}
SCENE SUMMARY:
${context.sceneSummary}

NARRATIVE:
${context.narrative}

${context.analystNpcCoherenceIssues ? `ANALYST COHERENCE NOTE:\nThe scene analyst flagged the following NPC behavior inconsistency: ${context.analystNpcCoherenceIssues}\nConsider whether this represents intentional NPC evolution (update the agenda accordingly) or a writer error (maintain the original agenda direction).\n\n` : ''}${context.tone ? buildToneReminder(context.tone, context.toneKeywords, context.toneAntiKeywords) + '\n\n' : ''}Return only agendas that changed. If nothing material changed for any NPC, return an empty updatedAgendas array.`;

  return [
    { role: 'system', content: buildAgendaResolverSystemPrompt(context) },
    { role: 'user', content: userPrompt },
  ];
}

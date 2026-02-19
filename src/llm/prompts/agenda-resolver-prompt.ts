import type { DecomposedCharacter } from '../../models/decomposed-character.js';
import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../../models/state/npc-agenda.js';
import type {
  NpcRelationship,
  AccumulatedNpcRelationships,
} from '../../models/state/npc-relationship.js';
import type { ActiveState } from '../../models/state/active-state.js';
import type { StoryStructure } from '../../models/story-arc.js';
import type { DetectedRelationshipShift } from '../analyst-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const AGENDA_RESOLVER_SYSTEM_PROMPT = `You are the NPC Agenda Resolver for an interactive branching story. After each scene, you evaluate how events affect each NPC's agenda and update their goals, leverage, fears, and off-screen behavior accordingly.

RULES:
1. Only update agendas whose situation materially changed due to the scene's events. If nothing relevant happened to an NPC, do NOT include them in updatedAgendas.
2. Off-screen NPCs still evolve: their goals progress, leverage shifts, and off-screen behavior reflects time passing and their own pursuits.
3. Keep each field to 1-2 sentences maximum.
4. Respect story structure pacing: do NOT let NPCs resolve Act 3 conflicts during Act 1. NPCs should be setting up, maneuvering, and positioning - not achieving endgame goals prematurely.
5. Off-screen behavior must be plausible given the NPC's leverage and fear. An NPC who fears exposure won't be acting boldly in public.
6. When structured character profiles are provided, treat them as the primary source for motivations, relationships, and voice-influenced behavior.
7. NPC names in your output MUST exactly match the names in the character definitions section.
8. Return an empty updatedAgendas array if no NPC's situation changed materially.

RELATIONSHIP UPDATES:
9. When NPC-protagonist relationships are provided, evaluate whether the scene caused meaningful relationship changes.
10. Use analyst relationship shift signals as guidance, but make your own judgment on final values.
11. Only include an NPC in updatedRelationships when their relationship with the protagonist materially changed.
12. Valence must stay within -5 to +5 (negative = hostile/cold, positive = warm/allied).
13. Return an empty updatedRelationships array if no relationships changed.`;

export interface AgendaResolverPromptContext {
  readonly narrative: string;
  readonly sceneSummary: string;
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly currentAgendas: AccumulatedNpcAgendas;
  readonly structure?: StoryStructure;
  readonly activeState: ActiveState;
  readonly analystNpcCoherenceIssues?: string;
  readonly currentRelationships?: AccumulatedNpcRelationships;
  readonly analystRelationshipShifts?: readonly DetectedRelationshipShift[];
  readonly deviationContext?: {
    readonly reason: string;
    readonly newBeats: readonly {
      readonly name: string;
      readonly objective: string;
      readonly role: string;
    }[];
  };
  readonly tone?: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
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

function formatCurrentRelationships(relationships: AccumulatedNpcRelationships): string {
  const entries = Object.values(relationships);
  if (entries.length === 0) {
    return '(no existing relationships)';
  }

  return entries
    .map(
      (r: NpcRelationship) =>
        `[${r.npcName}]
  Dynamic: ${r.dynamic} | Valence: ${r.valence}
  History: ${r.history}
  Current Tension: ${r.currentTension}
  Leverage: ${r.leverage}`
    )
    .join('\n\n');
}

function buildRelationshipsSection(context: AgendaResolverPromptContext): string {
  if (!context.currentRelationships) {
    return '';
  }
  const entries = Object.values(context.currentRelationships);
  if (entries.length === 0) {
    return '';
  }

  return `CURRENT NPC-PROTAGONIST RELATIONSHIPS:
${formatCurrentRelationships(context.currentRelationships)}

`;
}

function buildAnalystRelationshipShiftsSection(context: AgendaResolverPromptContext): string {
  if (!context.analystRelationshipShifts || context.analystRelationshipShifts.length === 0) {
    return '';
  }

  const lines = context.analystRelationshipShifts.map(
    (s) =>
      `- ${s.npcName}: ${s.shiftDescription} (suggested valence change: ${s.suggestedValenceChange > 0 ? '+' : ''}${s.suggestedValenceChange}${s.suggestedNewDynamic ? `, suggested new dynamic: ${s.suggestedNewDynamic}` : ''})`
  );

  return `ANALYST RELATIONSHIP SHIFT SIGNALS:
${lines.join('\n')}
Use these as guidance but make your own judgment on final relationship values.

`;
}

function buildDeviationSection(context: AgendaResolverPromptContext): string {
  if (!context.deviationContext) {
    return '';
  }

  const beatLines = context.deviationContext.newBeats
    .map((b) => `- ${b.name} (${b.role}): ${b.objective}`)
    .join('\n');

  return `STRUCTURAL DEVIATION ALERT:
The story has just deviated from its planned structure. NPC agendas aligned with now-invalidated beats must be proactively realigned.
Deviation reason: ${context.deviationContext.reason}
New story beats going forward:
${beatLines}
Realign NPC goals and off-screen behavior to reflect this structural shift.

`;
}

function buildAgendaResolverSystemPrompt(context: AgendaResolverPromptContext): string {
  const sections: string[] = [AGENDA_RESOLVER_SYSTEM_PROMPT];
  if (context.tone) {
    sections.push(buildToneDirective(context.tone, context.toneFeel, context.toneAvoid));
  }
  return sections.join('\n\n');
}

export function buildAgendaResolverPrompt(context: AgendaResolverPromptContext): ChatMessage[] {
  const characterDefinitionsSection = context.decomposedCharacters.length > 0
    ? `CHARACTERS (structured profiles with speech fingerprints):
${context.decomposedCharacters.map((c) => formatDecomposedCharacterForPrompt(c)).join('\n\n')}

`
    : '';

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

  const relationshipsSection = buildRelationshipsSection(context);
  const analystShiftsSection = buildAnalystRelationshipShiftsSection(context);

  const userPrompt = `Evaluate NPC agenda and relationship changes after the following scene.

${characterDefinitionsSection}CURRENT NPC AGENDAS:
${formatCurrentAgendas(context.currentAgendas)}

${relationshipsSection}${structureSection}${buildDeviationSection(context)}ACTIVE STATE:
${locationLine}${threatsLine}
SCENE SUMMARY:
${context.sceneSummary}

NARRATIVE:
${context.narrative}

${analystShiftsSection}${context.analystNpcCoherenceIssues ? `ANALYST COHERENCE NOTE:\nThe scene analyst flagged the following NPC behavior inconsistency: ${context.analystNpcCoherenceIssues}\nConsider whether this represents intentional NPC evolution (update the agenda accordingly) or a writer error (maintain the original agenda direction).\n\n` : ''}Return only agendas and relationships that changed. If nothing material changed, return empty arrays for both updatedAgendas and updatedRelationships.`;

  return [
    { role: 'system', content: buildAgendaResolverSystemPrompt(context) },
    { role: 'user', content: userPrompt },
  ];
}

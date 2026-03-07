import type { DecomposedCharacter } from '../../models/decomposed-character.js';
import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../../models/state/npc-agenda.js';
import type {
  NpcRelationship,
  AccumulatedNpcRelationships,
} from '../../models/state/npc-relationship.js';
import type { ActiveState } from '../../models/state/active-state.js';
import type { StoryStructure } from '../../models/story-arc.js';
import type { StorySpine } from '../../models/story-spine.js';
import type { AgendaResolverAnalystSignals } from '../npc-intelligence-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const AGENDA_RESOLVER_SYSTEM_PROMPT = `You are the NPC Agenda Resolver for an interactive branching story. After each scene, you evaluate how events affect each NPC's agenda and update their goals, leverage, fears, and off-screen behavior accordingly.

RULES:
1. Only update agendas whose situation materially changed due to the scene's events. If nothing relevant happened to an NPC, do NOT include them in updatedAgendas.
2. Off-screen NPCs are not exempt from updates: if a scene's events materially affect an absent NPC's situation (e.g., their ally was killed, their plan was exposed, a resource they depend on was destroyed), include them. When you do, reflect that their goals, leverage, and off-screen behavior have continued to evolve in response.
3. Keep each field to 1-2 sentences maximum.
4. Respect story structure pacing: do NOT let NPCs resolve Act 3 conflicts during Act 1. NPCs should be setting up, maneuvering, and positioning - not achieving endgame goals prematurely.
5. Off-screen behavior must be plausible given the NPC's leverage and fear. An NPC who fears exposure won't be acting boldly in public.
6. When structured character profiles are provided, treat them as the primary source for motivations, relationships, and voice-influenced behavior.
7. NPC names in your output MUST exactly match the names in the character definitions section.
8. Return an empty updatedAgendas array if no NPC's situation changed materially.
9. NPC goal evolution should serve the story's central need/want conflict — NPCs should either challenge the protagonist's Want, illuminate their true Need, or create situations that widen the gap between the two.

RELATIONSHIP UPDATES:
10. When NPC-protagonist relationships are provided, evaluate whether the scene caused meaningful relationship changes.
11. Use analyst relationship shift signals as guidance, but make your own judgment on final values.
12. Only include an NPC in updatedRelationships when their relationship with the protagonist materially changed.
13. Valence must stay within -5 to +5 (negative = hostile/cold, positive = warm/allied).
14. Return an empty updatedRelationships array if no relationships changed.`;

export interface AgendaResolverPromptContext {
  readonly narrative: string;
  readonly sceneSummary: string;
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly currentAgendas: AccumulatedNpcAgendas;
  readonly structure?: StoryStructure;
  readonly spine?: StorySpine;
  readonly activeState: ActiveState;
  readonly analystSignals?: AgendaResolverAnalystSignals;
  readonly currentRelationships?: AccumulatedNpcRelationships;
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
  const shifts = context.analystSignals?.relationshipShiftsDetected;
  if (!shifts || shifts.length === 0) {
    return '';
  }

  const lines = shifts.map(
    (s) =>
      `- ${s.npcName}: ${s.shiftDescription} (suggested valence change: ${s.suggestedValenceChange > 0 ? '+' : ''}${s.suggestedValenceChange}${s.suggestedNewDynamic ? `, suggested new dynamic: ${s.suggestedNewDynamic}` : ''})`
  );

  return `ANALYST RELATIONSHIP SHIFT SIGNALS:
${lines.join('\n')}
Use these as guidance but make your own judgment on final relationship values.

`;
}

function buildAnalystKnowledgeAsymmetrySection(context: AgendaResolverPromptContext): string {
  const asymmetry = context.analystSignals?.knowledgeAsymmetryDetected;
  if (!asymmetry || asymmetry.length === 0) {
    return '';
  }

  const lines = asymmetry.map((entry) => {
    const knownFacts = entry.knownFacts.length > 0 ? entry.knownFacts.join('; ') : '(none)';
    const falseBeliefs = entry.falseBeliefs.length > 0 ? entry.falseBeliefs.join('; ') : '(none)';
    const secrets = entry.secrets.length > 0 ? entry.secrets.join('; ') : '(none)';
    return `- ${entry.characterName}: known facts=${knownFacts}; false beliefs=${falseBeliefs}; secrets=${secrets}`;
  });

  return `ANALYST KNOWLEDGE ASYMMETRY SIGNALS:
${lines.join('\n')}
Use these signals to update NPC agendas and relationship tension/leverage when information access changed.

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
  const analystKnowledgeAsymmetrySection = buildAnalystKnowledgeAsymmetrySection(context);

  const spineSection = buildSpineSection(context.spine);

  const userPrompt = `Evaluate NPC agenda and relationship changes after the following scene.

${characterDefinitionsSection}CURRENT NPC AGENDAS:
${formatCurrentAgendas(context.currentAgendas)}

${relationshipsSection}${spineSection}${structureSection}${buildDeviationSection(context)}ACTIVE STATE:
${locationLine}${threatsLine}
SCENE SUMMARY:
${context.sceneSummary}

NARRATIVE:
${context.narrative}

${analystShiftsSection}${analystKnowledgeAsymmetrySection}${context.analystSignals?.npcCoherenceIssues ? `ANALYST COHERENCE NOTE:\nThe scene analyst flagged the following NPC behavior inconsistency: ${context.analystSignals.npcCoherenceIssues}\nConsider whether this represents intentional NPC evolution (update the agenda accordingly) or a writer error (maintain the original agenda direction).\n\n` : ''}Return only agendas and relationships that changed. If nothing material changed, return empty arrays for both updatedAgendas and updatedRelationships.`;

  return [
    { role: 'system', content: buildAgendaResolverSystemPrompt(context) },
    { role: 'user', content: userPrompt },
  ];
}

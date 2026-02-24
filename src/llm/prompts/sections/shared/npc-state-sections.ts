import type { AccumulatedNpcAgendas } from '../../../../models/state/npc-agenda.js';
import type { AccumulatedNpcRelationships } from '../../../../models/state/npc-relationship.js';

export function buildNpcAgendasSection(agendas?: AccumulatedNpcAgendas): string {
  if (!agendas) {
    return '';
  }

  const entries = Object.values(agendas);
  if (entries.length === 0) {
    return '';
  }

  const lines = entries.map(
    (a) =>
      `[${a.npcName}]
  Goal: ${a.currentGoal}
  Leverage: ${a.leverage}
  Fear: ${a.fear}
  Off-screen: ${a.offScreenBehavior}`
  );

  return `NPC AGENDAS (what each NPC wants and will do):
${lines.join('\n\n')}

`;
}

export function buildNpcRelationshipsSection(
  relationships?: AccumulatedNpcRelationships
): string {
  if (!relationships) {
    return '';
  }

  const entries = Object.values(relationships);
  if (entries.length === 0) {
    return '';
  }

  const lines = entries.map(
    (r) =>
      `[${r.npcName}]
  Dynamic: ${r.dynamic} | Valence: ${r.valence}
  Tension: ${r.currentTension}`
  );

  return `NPC-PROTAGONIST RELATIONSHIPS (current dynamics):
${lines.join('\n\n')}

`;
}

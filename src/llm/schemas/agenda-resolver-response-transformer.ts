import type { Npc } from '../../models/npc.js';
import { normalizeForComparison } from '../../models/normalize.js';
import type { NpcAgenda } from '../../models/state/npc-agenda.js';
import { LLMError } from '../llm-client-types.js';

export interface AgendaResolverRawResponse {
  readonly updatedAgendas: readonly NpcAgenda[];
  readonly rawResponse: string;
}

/**
 * Validates and transforms the raw LLM response for the agenda resolver.
 * Filters out agendas for NPCs not in the story's NPC list.
 */
export function validateAgendaResolverResponse(
  rawJson: unknown,
  rawResponse: string,
  storyNpcs: readonly Npc[]
): AgendaResolverRawResponse {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Agenda resolver response must be an object',
      'AGENDA_RESOLVER_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;
  const rawAgendas = data['updatedAgendas'];

  if (!Array.isArray(rawAgendas)) {
    throw new LLMError(
      'Agenda resolver response must contain updatedAgendas array',
      'AGENDA_RESOLVER_PARSE_ERROR',
      true
    );
  }

  // Build a set of valid NPC names (normalized) for filtering
  const validNpcNames = new Set(storyNpcs.map((npc) => normalizeForComparison(npc.name)));

  const updatedAgendas: NpcAgenda[] = [];

  for (const item of rawAgendas) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      continue;
    }

    const a = item as Record<string, unknown>;
    if (
      typeof a['npcName'] !== 'string' ||
      typeof a['currentGoal'] !== 'string' ||
      typeof a['leverage'] !== 'string' ||
      typeof a['fear'] !== 'string' ||
      typeof a['offScreenBehavior'] !== 'string'
    ) {
      continue;
    }

    const npcName = a['npcName'].trim();
    const normalizedName = normalizeForComparison(npcName);

    // Reject agendas for NPCs not in the story's NPC list
    if (!validNpcNames.has(normalizedName)) {
      continue;
    }

    updatedAgendas.push({
      npcName,
      currentGoal: a['currentGoal'].trim(),
      leverage: a['leverage'].trim(),
      fear: a['fear'].trim(),
      offScreenBehavior: a['offScreenBehavior'].trim(),
    });
  }

  return { updatedAgendas, rawResponse };
}

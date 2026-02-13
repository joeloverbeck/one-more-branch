import type { DecomposedCharacter, DecomposedWorld, NpcAgenda, WorldFactDomain } from '../../models';

export interface ProtagonistBriefing {
  readonly name: string;
  readonly appearance: string;
  readonly coreTraits: readonly string[];
  readonly motivations: string;
  readonly relationships: readonly string[];
}

export interface NpcBriefing {
  readonly name: string;
  readonly appearance: string;
  readonly coreTraits: readonly string[];
  readonly motivations: string;
  readonly relationships: readonly string[];
  readonly currentGoal: string | null;
  readonly fear: string | null;
}

export interface GroupedWorldFacts {
  readonly [domain: string]: Array<{ fact: string; scope: string }>;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function extractProtagonistBriefing(
  characters: readonly DecomposedCharacter[]
): ProtagonistBriefing {
  const protagonist = characters[0];
  if (!protagonist) {
    return {
      name: 'Unknown Protagonist',
      appearance: '',
      coreTraits: [],
      motivations: '',
      relationships: [],
    };
  }

  return {
    name: protagonist.name,
    appearance: protagonist.appearance,
    coreTraits: protagonist.coreTraits,
    motivations: protagonist.motivations,
    relationships: protagonist.relationships,
  };
}

export function extractNpcBriefings(
  characters: readonly DecomposedCharacter[],
  agendas: readonly NpcAgenda[] = []
): readonly NpcBriefing[] {
  const agendaByName = new Map<string, NpcAgenda>();
  for (const agenda of agendas) {
    agendaByName.set(normalizeName(agenda.npcName), agenda);
  }

  return characters.slice(1).map((character) => {
    const matchingAgenda = agendaByName.get(normalizeName(character.name));
    return {
      name: character.name,
      appearance: character.appearance,
      coreTraits: character.coreTraits,
      motivations: character.motivations,
      relationships: character.relationships,
      currentGoal: matchingAgenda?.currentGoal ?? null,
      fear: matchingAgenda?.fear ?? null,
    };
  });
}

export function groupWorldFacts(world?: DecomposedWorld): GroupedWorldFacts {
  if (!world || world.facts.length === 0) {
    return {};
  }

  const grouped: Partial<Record<WorldFactDomain, Array<{ fact: string; scope: string }>>> = {};
  for (const worldFact of world.facts) {
    const existing = grouped[worldFact.domain] ?? [];
    existing.push({
      fact: worldFact.fact,
      scope: worldFact.scope,
    });
    grouped[worldFact.domain] = existing;
  }

  return grouped;
}

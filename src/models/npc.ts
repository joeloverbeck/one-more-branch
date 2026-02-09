export interface Npc {
  readonly name: string;
  readonly description: string;
}

export function formatNpcsForPrompt(npcs: readonly Npc[]): string {
  return npcs.map(npc => `NPC: ${npc.name}\n${npc.description}`).join('\n\n');
}

export function isNpcArray(value: unknown): value is Npc[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    item =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>)['name'] === 'string' &&
      typeof (item as Record<string, unknown>)['description'] === 'string',
  );
}

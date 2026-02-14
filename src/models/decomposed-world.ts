export type WorldFactDomain =
  | 'geography'
  | 'ecology'
  | 'history'
  | 'society'
  | 'culture'
  | 'religion'
  | 'governance'
  | 'economy'
  | 'faction'
  | 'technology'
  | 'magic'
  | 'language'
  | 'custom'; // Retained for backward compatibility with existing stories

export type WorldFactType =
  | 'LAW'
  | 'NORM'
  | 'BELIEF'
  | 'DISPUTED'
  | 'RUMOR'
  | 'MYSTERY';

export interface WorldFact {
  readonly domain: WorldFactDomain;
  readonly fact: string;
  readonly scope: string;
  readonly factType?: WorldFactType;
}

export interface DecomposedWorld {
  readonly facts: readonly WorldFact[];
  readonly rawWorldbuilding: string;
}

export function formatDecomposedWorldForPrompt(world: DecomposedWorld): string {
  if (world.facts.length === 0) {
    return '';
  }

  const byDomain = new Map<WorldFactDomain, WorldFact[]>();
  for (const fact of world.facts) {
    const existing = byDomain.get(fact.domain) ?? [];
    existing.push(fact);
    byDomain.set(fact.domain, existing);
  }

  const sections: string[] = ['WORLDBUILDING (structured):'];
  for (const [domain, facts] of byDomain) {
    sections.push(`[${domain.toUpperCase()}]`);
    for (const fact of facts) {
      const typeTag = fact.factType ? `[${fact.factType}] ` : '';
      sections.push(`- ${typeTag}${fact.fact} (scope: ${fact.scope})`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

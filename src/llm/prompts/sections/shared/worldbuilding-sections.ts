import type { DecomposedWorld, WorldFact } from '../../../../models/decomposed-world.js';

export type WorldPromptSectionConsumer =
  | 'GENERIC'
  | 'SPINE'
  | 'CHARACTER_WEB'
  | 'CHARACTER_DEV'
  | 'CHAT';

function sortByWeight(facts: readonly WorldFact[]): WorldFact[] {
  const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...facts].sort((a, b) => {
    const aw = a.narrativeWeight ? (order[a.narrativeWeight] ?? 1) : 1;
    const bw = b.narrativeWeight ? (order[b.narrativeWeight] ?? 1) : 1;
    return aw - bw;
  });
}

function renderFactLine(fact: WorldFact): string {
  const tags: string[] = [];
  if (fact.factType) tags.push(fact.factType);
  if (fact.narrativeWeight === 'HIGH') tags.push('HIGH');
  const prefix = tags.length > 0 ? `[${tags.join('/')}] ` : '';
  return `- ${prefix}${fact.fact} (scope: ${fact.scope})`;
}

function renderFactWithSensory(fact: WorldFact): string {
  const lines = [renderFactLine(fact)];
  if (fact.sensoryHook) lines.push(`  Sensory: ${fact.sensoryHook}`);
  return lines.join('\n');
}

function renderGenericFact(fact: WorldFact): string {
  const tags: string[] = [];
  if (fact.factType) tags.push(fact.factType);
  if (fact.narrativeWeight && fact.narrativeWeight !== 'MEDIUM') tags.push(fact.narrativeWeight);

  const prefix = tags.length > 0 ? `[${tags.join('/')}] ` : '';
  const lines = [`- ${prefix}${fact.fact} (scope: ${fact.scope})`];

  if (fact.sensoryHook) lines.push(`  Sensory: ${fact.sensoryHook}`);
  if (fact.exampleEvidence) lines.push(`  Evidence: ${fact.exampleEvidence}`);
  if (fact.tensionWithIds && fact.tensionWithIds.length > 0) {
    lines.push(`  Tension with: ${fact.tensionWithIds.join(', ')}`);
  }
  if (fact.implicationOfIds && fact.implicationOfIds.length > 0) {
    lines.push(`  Implication of: ${fact.implicationOfIds.join(', ')}`);
  }
  if (fact.sceneAffordances && fact.sceneAffordances.length > 0) {
    lines.push(`  Affordances: ${fact.sceneAffordances.join('; ')}`);
  }

  return lines.join('\n');
}

function hasDomain(fact: WorldFact, ...domains: string[]): boolean {
  return domains.includes(fact.domain);
}

function hasFactType(fact: WorldFact, ...types: string[]): boolean {
  return fact.factType !== undefined && types.includes(fact.factType);
}

function hasStoryFunction(fact: WorldFact, ...fns: string[]): boolean {
  return fact.storyFunctions?.some((sf) => fns.includes(sf)) ?? false;
}

function buildGenericWorldSection(world: DecomposedWorld): string {
  if (world.facts.length === 0) return '';

  const sorted = sortByWeight(world.facts);
  const byDomain = new Map<string, WorldFact[]>();
  for (const fact of sorted) {
    const existing = byDomain.get(fact.domain) ?? [];
    existing.push(fact);
    byDomain.set(fact.domain, existing);
  }

  const sections: string[] = ['WORLDBUILDING (structured):'];

  if (world.worldLogline) {
    sections.push(`World logline: ${world.worldLogline}`);
    sections.push('');
  }

  for (const [domain, facts] of byDomain) {
    sections.push(`[${domain.toUpperCase()}]`);
    facts.forEach((fact) => sections.push(renderGenericFact(fact)));
    sections.push('');
  }

  if (world.openQuestions && world.openQuestions.length > 0) {
    sections.push('[OPEN QUESTIONS]');
    world.openQuestions.forEach((question) => sections.push(`- ${question}`));
    sections.push('');
  }

  return sections.join('\n');
}

function buildWorldSectionForSpine(world: DecomposedWorld): string {
  if (world.facts.length === 0) return '';

  const sections: string[] = ['WORLDBUILDING (structured for spine generation):'];

  if (world.worldLogline) {
    sections.push(`World logline: ${world.worldLogline}`);
    sections.push('');
  }

  const highWeight = sortByWeight(
    world.facts.filter(
      (f) =>
        f.narrativeWeight === 'HIGH' ||
        hasStoryFunction(f, 'EPIC', 'DRAMATIC') ||
        hasFactType(f, 'LAW', 'MYSTERY')
    )
  );

  if (highWeight.length > 0) {
    sections.push('[WORLD INVARIANTS & PRESSURES]');
    highWeight.forEach((f) => sections.push(renderFactWithSensory(f)));
    sections.push('');
  }

  const faultLines = world.facts.filter(
    (f) => hasFactType(f, 'DISPUTED', 'TABOO') || hasStoryFunction(f, 'DRAMATIC', 'EPISTEMIC')
  );
  if (faultLines.length > 0) {
    sections.push('[FAULT LINES & TENSIONS]');
    faultLines
      .filter((f) => !highWeight.includes(f))
      .forEach((f) => sections.push(renderFactLine(f)));
    sections.push('');
  }

  if (world.openQuestions && world.openQuestions.length > 0) {
    sections.push('[OPEN QUESTIONS]');
    world.openQuestions.forEach((q) => sections.push(`- ${q}`));
    sections.push('');
  }

  return sections.join('\n');
}

function buildWorldSectionForCharacterWeb(world: DecomposedWorld): string {
  if (world.facts.length === 0) return '';

  const sections: string[] = ['WORLDBUILDING (structured for character web):'];

  if (world.worldLogline) {
    sections.push(`World logline: ${world.worldLogline}`);
    sections.push('');
  }

  const socialFacts = sortByWeight(
    world.facts.filter(
      (f) =>
        hasDomain(f, 'society', 'governance', 'faction', 'economy', 'culture') ||
        hasFactType(f, 'NORM', 'LAW', 'PRACTICE', 'TABOO')
    )
  );

  if (socialFacts.length > 0) {
    sections.push('[SOCIAL STRUCTURE & INSTITUTIONS]');
    socialFacts.forEach((f) => sections.push(renderFactLine(f)));
    sections.push('');
  }

  const namingFacts = world.facts.filter((f) => hasDomain(f, 'language'));
  if (namingFacts.length > 0) {
    sections.push('[NAMING & LANGUAGE]');
    namingFacts.forEach((f) => sections.push(renderFactLine(f)));
    sections.push('');
  }

  return sections.join('\n');
}

function buildWorldSectionForCharacterDev(world: DecomposedWorld): string {
  if (world.facts.length === 0) return '';

  const sections: string[] = ['WORLDBUILDING (structured for character development):'];

  if (world.worldLogline) {
    sections.push(`World logline: ${world.worldLogline}`);
    sections.push('');
  }

  const relevantFacts = sortByWeight(
    world.facts.filter(
      (f) =>
        hasDomain(f, 'society', 'culture', 'religion', 'language', 'governance') ||
        hasFactType(f, 'NORM', 'PRACTICE', 'TABOO', 'BELIEF')
    )
  );

  if (relevantFacts.length > 0) {
    sections.push('[SOCIAL NORMS, PRACTICES & TABOOS]');
    relevantFacts.forEach((f) => sections.push(renderFactWithSensory(f)));
    sections.push('');
  }

  return sections.join('\n');
}

function buildWorldSectionForChat(world: DecomposedWorld): string {
  if (world.facts.length === 0) return '';

  const sections: string[] = ['WORLDBUILDING (structured for chat):'];

  if (world.worldLogline) {
    sections.push(`World logline: ${world.worldLogline}`);
    sections.push('');
  }

  const socialFacts = sortByWeight(
    world.facts.filter(
      (f) =>
        hasDomain(f, 'society', 'culture', 'religion', 'governance') ||
        hasFactType(f, 'NORM', 'PRACTICE', 'TABOO', 'BELIEF', 'LAW')
    )
  );

  const renderedFactIds = new Set(socialFacts.map((fact) => fact.id));

  if (socialFacts.length > 0) {
    sections.push('[SOCIAL & CULTURAL CONTEXT]');
    socialFacts.forEach((f) => sections.push(renderFactWithSensory(f)));
    sections.push('');
  }

  const geographyFacts = sortByWeight(
    world.facts.filter((f) => hasDomain(f, 'geography') && !renderedFactIds.has(f.id))
  );

  if (geographyFacts.length > 0) {
    geographyFacts.forEach((fact) => renderedFactIds.add(fact.id));
    sections.push('[GEOGRAPHY & SETTING]');
    geographyFacts.forEach((f) => sections.push(renderFactLine(f)));
    sections.push('');
  }

  const namingFacts = sortByWeight(
    world.facts.filter((f) => hasDomain(f, 'language') && !renderedFactIds.has(f.id))
  );

  if (namingFacts.length > 0) {
    sections.push('[NAMING & LANGUAGE]');
    namingFacts.forEach((f) => sections.push(renderFactLine(f)));
    sections.push('');
  }

  return sections.join('\n');
}

export function buildWorldSection(
  world: DecomposedWorld,
  consumer: WorldPromptSectionConsumer = 'GENERIC'
): string {
  switch (consumer) {
    case 'GENERIC':
      return buildGenericWorldSection(world);
    case 'SPINE':
      return buildWorldSectionForSpine(world);
    case 'CHARACTER_WEB':
      return buildWorldSectionForCharacterWeb(world);
    case 'CHARACTER_DEV':
      return buildWorldSectionForCharacterDev(world);
    case 'CHAT':
      return buildWorldSectionForChat(world);
  }
}

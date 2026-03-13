import type { DecomposedWorld, WorldFact } from '../../../../models/decomposed-world.js';

function sortByWeight(facts: readonly WorldFact[]): WorldFact[] {
  const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...facts].sort((a, b) => {
    const aw = a.narrativeWeight ? order[a.narrativeWeight] ?? 1 : 1;
    const bw = b.narrativeWeight ? order[b.narrativeWeight] ?? 1 : 1;
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

function renderFactWithAffordances(fact: WorldFact): string {
  const lines = [renderFactLine(fact)];
  if (fact.sensoryHook) lines.push(`  Sensory: ${fact.sensoryHook}`);
  if (fact.exampleEvidence) lines.push(`  Evidence: ${fact.exampleEvidence}`);
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

/**
 * SPINE consumer: invariants, pressures, story vectors, open questions.
 * Purpose: help build the story's conflict architecture.
 */
export function buildWorldSectionForSpine(world: DecomposedWorld): string {
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
        hasFactType(f, 'LAW', 'MYSTERY'),
    ),
  );

  if (highWeight.length > 0) {
    sections.push('[WORLD INVARIANTS & PRESSURES]');
    highWeight.forEach((f) => sections.push(renderFactWithSensory(f)));
    sections.push('');
  }

  const faultLines = world.facts.filter(
    (f) => hasFactType(f, 'DISPUTED', 'TABOO') || hasStoryFunction(f, 'DRAMATIC', 'EPISTEMIC'),
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

/**
 * CHARACTER_WEB consumer: institutions, naming, factions, status markers.
 * Purpose: make the cast plausible inside the world.
 */
export function buildWorldSectionForCharacterWeb(world: DecomposedWorld): string {
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
        hasFactType(f, 'NORM', 'LAW', 'PRACTICE', 'TABOO'),
    ),
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

/**
 * CHARACTER_DEV consumer: sociology, dialect, taboo, relationships.
 * Purpose: make character psychology, presentation, and relationships world-specific.
 */
export function buildWorldSectionForCharacterDev(world: DecomposedWorld): string {
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
        hasFactType(f, 'NORM', 'PRACTICE', 'TABOO', 'BELIEF'),
    ),
  );

  if (relevantFacts.length > 0) {
    sections.push('[SOCIAL NORMS, PRACTICES & TABOOS]');
    relevantFacts.forEach((f) => sections.push(renderFactWithSensory(f)));
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * PAGE consumer: all facts (no reveal filtering for now).
 * Purpose: keep page generation grounded in world context.
 */
export function buildWorldSectionForPage(world: DecomposedWorld): string {
  if (world.facts.length === 0) return '';

  const sections: string[] = ['WORLDBUILDING (structured for page generation):'];

  if (world.worldLogline) {
    sections.push(`World logline: ${world.worldLogline}`);
    sections.push('');
  }

  const sorted = sortByWeight(world.facts);
  const byDomain = new Map<string, WorldFact[]>();
  for (const fact of sorted) {
    const existing = byDomain.get(fact.domain) ?? [];
    existing.push(fact);
    byDomain.set(fact.domain, existing);
  }

  for (const [domain, facts] of byDomain) {
    sections.push(`[${domain.toUpperCase()}]`);
    facts.forEach((f) => sections.push(renderFactWithAffordances(f)));
    sections.push('');
  }

  return sections.join('\n');
}

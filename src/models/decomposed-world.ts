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
  | 'language';

export type WorldFactType =
  | 'LAW'
  | 'NORM'
  | 'BELIEF'
  | 'DISPUTED'
  | 'RUMOR'
  | 'MYSTERY'
  | 'PRACTICE'
  | 'TABOO';

export type NarrativeWeight = 'LOW' | 'MEDIUM' | 'HIGH';

export type WorldStoryFunction =
  | 'EPIC'
  | 'EPISTEMIC'
  | 'DRAMATIC'
  | 'ATMOSPHERIC'
  | 'THEMATIC';

export interface WorldFact {
  readonly id: string;
  readonly domain: WorldFactDomain;
  readonly fact: string;
  readonly scope: string;
  readonly factType?: WorldFactType;
  readonly narrativeWeight?: NarrativeWeight;
  readonly thematicTag?: string;
  readonly sensoryHook?: string;
  readonly exampleEvidence?: string;
  readonly tensionWithIds?: readonly string[];
  readonly implicationOfIds?: readonly string[];
  readonly storyFunctions?: readonly WorldStoryFunction[];
  readonly sceneAffordances?: readonly string[];
}

export interface DecomposedWorld {
  readonly worldLogline?: string;
  readonly facts: readonly WorldFact[];
  readonly openQuestions?: readonly string[];
  readonly rawWorldbuilding?: string;
}

export type WorldPromptConsumer = 'SPINE' | 'CHARACTER_WEB' | 'CHARACTER_DEV' | 'PAGE';

const NARRATIVE_WEIGHT_ORDER: Record<NarrativeWeight, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function sortByNarrativeWeight(facts: readonly WorldFact[]): WorldFact[] {
  return [...facts].sort((a, b) => {
    const aWeight = a.narrativeWeight ? NARRATIVE_WEIGHT_ORDER[a.narrativeWeight] : 1;
    const bWeight = b.narrativeWeight ? NARRATIVE_WEIGHT_ORDER[b.narrativeWeight] : 1;
    return aWeight - bWeight;
  });
}

function renderFact(fact: WorldFact): string {
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

export function formatDecomposedWorldForPrompt(
  world: DecomposedWorld,
  consumer?: WorldPromptConsumer,
): string {
  if (world.facts.length === 0) {
    return '';
  }

  const sorted = sortByNarrativeWeight(world.facts);

  const byDomain = new Map<WorldFactDomain, WorldFact[]>();
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
    for (const fact of facts) {
      sections.push(renderFact(fact));
    }
    sections.push('');
  }

  const includeOpenQuestions = !consumer || consumer !== 'PAGE';
  if (
    includeOpenQuestions &&
    world.openQuestions &&
    world.openQuestions.length > 0
  ) {
    sections.push('[OPEN QUESTIONS]');
    for (const q of world.openQuestions) {
      sections.push(`- ${q}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

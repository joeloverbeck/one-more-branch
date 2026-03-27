import { buildWorldSectionForChat } from '../../../../../../src/llm/prompts/sections/shared/worldbuilding-sections';
import type { DecomposedWorld, WorldFact } from '../../../../../../src/models/decomposed-world';

function createFact(overrides: Partial<WorldFact> & Pick<WorldFact, 'id' | 'domain' | 'fact' | 'scope'>): WorldFact {
  return {
    id: overrides.id,
    domain: overrides.domain,
    fact: overrides.fact,
    scope: overrides.scope,
    ...overrides,
  };
}

describe('buildWorldSectionForChat', () => {
  it('returns empty string when there are no facts', () => {
    const world: DecomposedWorld = {
      facts: [],
    };

    expect(buildWorldSectionForChat(world)).toBe('');
  });

  it('includes the world logline and grouped chat-relevant sections', () => {
    const world: DecomposedWorld = {
      worldLogline: 'A river empire where etiquette is enforced like law.',
      facts: [
        createFact({
          id: 'social-high',
          domain: 'society',
          fact: 'Guests must refuse tea twice before accepting.',
          scope: 'River courts',
          factType: 'NORM',
          narrativeWeight: 'HIGH',
          sensoryHook: 'Porcelain cups stay untouched through the first offers.',
        }),
        createFact({
          id: 'social-medium',
          domain: 'culture',
          fact: 'Mourners wear mirrored veils during public rites.',
          scope: 'Capital',
          factType: 'PRACTICE',
          narrativeWeight: 'MEDIUM',
          sensoryHook: 'Lanternlight fractures across silver-threaded mesh.',
        }),
        createFact({
          id: 'geography',
          domain: 'geography',
          fact: 'Canal districts flood knee-high every dusk tide.',
          scope: 'Delta wards',
          narrativeWeight: 'HIGH',
        }),
        createFact({
          id: 'language',
          domain: 'language',
          fact: 'Formal apologies begin with lineage before intent.',
          scope: 'Noble households',
          narrativeWeight: 'MEDIUM',
        }),
      ],
    };

    const result = buildWorldSectionForChat(world);

    expect(result).toContain('WORLDBUILDING (structured for chat):');
    expect(result).toContain('World logline: A river empire where etiquette is enforced like law.');
    expect(result).toContain('[SOCIAL & CULTURAL CONTEXT]');
    expect(result).toContain('[GEOGRAPHY & SETTING]');
    expect(result).toContain('[NAMING & LANGUAGE]');
    expect(result).toContain('Sensory: Porcelain cups stay untouched through the first offers.');
  });

  it('orders facts by narrative weight within each section', () => {
    const world: DecomposedWorld = {
      facts: [
        createFact({
          id: 'medium-social',
          domain: 'culture',
          fact: 'Clerks tap ledgers three times before sealing them.',
          scope: 'Harbor offices',
          factType: 'PRACTICE',
          narrativeWeight: 'MEDIUM',
        }),
        createFact({
          id: 'high-social',
          domain: 'society',
          fact: 'Breaking hospitality marks a household for public disgrace.',
          scope: 'Nationwide',
          factType: 'LAW',
          narrativeWeight: 'HIGH',
        }),
      ],
    };

    const result = buildWorldSectionForChat(world);

    expect(result.indexOf('Breaking hospitality marks a household for public disgrace.')).toBeLessThan(
      result.indexOf('Clerks tap ledgers three times before sealing them.')
    );
  });

  it('includes social fact types from otherwise irrelevant domains and excludes unrelated facts', () => {
    const world: DecomposedWorld = {
      facts: [
        createFact({
          id: 'magic-taboo',
          domain: 'magic',
          fact: 'Speaking a dead mage’s true name in public is forbidden.',
          scope: 'Nationwide',
          factType: 'TABOO',
          narrativeWeight: 'HIGH',
          sensoryHook: 'Conversations drop to a whisper when the topic nears the dead.',
        }),
        createFact({
          id: 'ecology-ignored',
          domain: 'ecology',
          fact: 'Moss-whales migrate through the marsh canopy every spring.',
          scope: 'Outer marsh',
          narrativeWeight: 'MEDIUM',
        }),
      ],
    };

    const result = buildWorldSectionForChat(world);

    expect(result).toContain('Speaking a dead mage’s true name in public is forbidden.');
    expect(result).not.toContain('Moss-whales migrate through the marsh canopy every spring.');
  });

  it('does not duplicate a fact across sections when one fact matches multiple buckets', () => {
    const world: DecomposedWorld = {
      facts: [
        createFact({
          id: 'language-law',
          domain: 'language',
          fact: 'Court testimony must be delivered in ancestor cant.',
          scope: 'High courts',
          factType: 'LAW',
          narrativeWeight: 'HIGH',
          sensoryHook: 'Witnesses rehearse old syllables under their breath.',
        }),
      ],
    };

    const result = buildWorldSectionForChat(world);
    const occurrences = result.match(/Court testimony must be delivered in ancestor cant\./g) ?? [];

    expect(result).toContain('[SOCIAL & CULTURAL CONTEXT]');
    expect(result).not.toContain('[NAMING & LANGUAGE]');
    expect(occurrences).toHaveLength(1);
  });
});

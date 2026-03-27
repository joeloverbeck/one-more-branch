import {
  buildWorldSection,
  type WorldPromptSectionConsumer,
} from '../../../../../../src/llm/prompts/sections/shared/worldbuilding-sections';
import type { DecomposedWorld, WorldFact } from '../../../../../../src/models/decomposed-world';

function createFact(
  overrides: Partial<WorldFact> & Pick<WorldFact, 'id' | 'domain' | 'fact' | 'scope'>
): WorldFact {
  return {
    id: overrides.id,
    domain: overrides.domain,
    fact: overrides.fact,
    scope: overrides.scope,
    ...overrides,
  };
}

describe('buildWorldSection', () => {
  describe('GENERIC consumer', () => {
    it('returns empty string when there are no facts', () => {
      const world: DecomposedWorld = { facts: [] };

      expect(buildWorldSection(world)).toBe('');
    });

    it('groups facts by domain and includes world logline', () => {
      const world: DecomposedWorld = {
        worldLogline: 'A ritual state where magic is notarized.',
        facts: [
          createFact({
            id: 'magic-1',
            domain: 'magic',
            fact: 'Blood runes bind legal oaths.',
            scope: 'Worldwide',
          }),
          createFact({
            id: 'magic-2',
            domain: 'magic',
            fact: 'Only magistrates may sanction rune-breakers.',
            scope: 'Capitals',
          }),
          createFact({
            id: 'society-1',
            domain: 'society',
            fact: 'The tribunal controls appeals.',
            scope: 'Imperial core',
          }),
        ],
      };

      const result = buildWorldSection(world);

      expect(result).toContain('WORLDBUILDING (structured):');
      expect(result).toContain('World logline: A ritual state where magic is notarized.');
      expect(result).toContain('[MAGIC]');
      expect(result).toContain('[SOCIETY]');
      expect(result).toContain('Blood runes bind legal oaths. (scope: Worldwide)');
    });

    it('renders fact tags, evidence, tensions, implications, affordances, and open questions', () => {
      const world: DecomposedWorld = {
        facts: [
          createFact({
            id: 'magic-law',
            domain: 'magic',
            fact: 'Iron disrupts magical fields.',
            scope: 'Worldwide',
            factType: 'LAW',
            narrativeWeight: 'HIGH',
            sensoryHook: 'Runes hiss when iron comes near.',
            exampleEvidence: 'City gates are lined with iron nails.',
            tensionWithIds: ['magic-rumor'],
            implicationOfIds: ['history-1'],
            sceneAffordances: ['Force a mage into close quarters'],
          }),
          createFact({
            id: 'magic-rumor',
            domain: 'magic',
            fact: 'People whisper that iron failures mean the wards are dying.',
            scope: 'Border towns',
            factType: 'RUMOR',
          }),
        ],
        openQuestions: ['Who first taught the tribunals rune law?'],
      };

      const result = buildWorldSection(world);

      expect(result).toContain('[LAW/HIGH] Iron disrupts magical fields. (scope: Worldwide)');
      expect(result).toContain('Sensory: Runes hiss when iron comes near.');
      expect(result).toContain('Evidence: City gates are lined with iron nails.');
      expect(result).toContain('Tension with: magic-rumor');
      expect(result).toContain('Implication of: history-1');
      expect(result).toContain('Affordances: Force a mage into close quarters');
      expect(result).toContain('[OPEN QUESTIONS]');
      expect(result).toContain('- Who first taught the tribunals rune law?');
    });
  });

  describe('specialized consumers', () => {
    it('dispatches each supported consumer through the prompt layer', () => {
      const world: DecomposedWorld = {
        worldLogline: 'Etiquette governs a flooded empire.',
        facts: [
          createFact({
            id: 'social-high',
            domain: 'society',
            fact: 'Guests must refuse tea twice before accepting.',
            scope: 'River courts',
            factType: 'NORM',
            narrativeWeight: 'HIGH',
            sensoryHook: 'Porcelain cups remain untouched through the first offers.',
            storyFunctions: ['DRAMATIC'],
          }),
          createFact({
            id: 'language-law',
            domain: 'language',
            fact: 'Court testimony must be delivered in ancestor cant.',
            scope: 'High courts',
            factType: 'LAW',
            narrativeWeight: 'HIGH',
            sensoryHook: 'Witnesses rehearse old syllables under their breath.',
          }),
          createFact({
            id: 'geography',
            domain: 'geography',
            fact: 'Canal districts flood knee-high every dusk tide.',
            scope: 'Delta wards',
            narrativeWeight: 'HIGH',
          }),
          createFact({
            id: 'taboo',
            domain: 'magic',
            fact: 'Speaking a dead mage’s true name in public is forbidden.',
            scope: 'Nationwide',
            factType: 'TABOO',
            narrativeWeight: 'HIGH',
            sensoryHook: 'Conversations drop to a whisper near the dead.',
          }),
        ],
        openQuestions: ['Why did ancestor cant become binding law?'],
      };

      const expectations: Record<WorldPromptSectionConsumer, readonly string[]> = {
        GENERIC: ['WORLDBUILDING (structured):', '[OPEN QUESTIONS]'],
        SPINE: ['WORLDBUILDING (structured for spine generation):', '[WORLD INVARIANTS & PRESSURES]'],
        CHARACTER_WEB: [
          'WORLDBUILDING (structured for character web):',
          '[SOCIAL STRUCTURE & INSTITUTIONS]',
        ],
        CHARACTER_DEV: [
          'WORLDBUILDING (structured for character development):',
          '[SOCIAL NORMS, PRACTICES & TABOOS]',
        ],
        CHAT: ['WORLDBUILDING (structured for chat):', '[SOCIAL & CULTURAL CONTEXT]'],
      };

      (Object.keys(expectations) as WorldPromptSectionConsumer[]).forEach((consumer) => {
        const result = buildWorldSection(world, consumer);
        expectations[consumer].forEach((expectedSnippet) => {
          expect(result).toContain(expectedSnippet);
        });
      });
    });

    it('keeps chat facts ordered by narrative weight and avoids duplication across buckets', () => {
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

      const result = buildWorldSection(world, 'CHAT');
      const occurrences = result.match(/Court testimony must be delivered in ancestor cant\./g) ?? [];

      expect(
        result.indexOf('Breaking hospitality marks a household for public disgrace.')
      ).toBeLessThan(result.indexOf('Clerks tap ledgers three times before sealing them.'));
      expect(result).toContain('[SOCIAL & CULTURAL CONTEXT]');
      expect(result).not.toContain('[NAMING & LANGUAGE]');
      expect(occurrences).toHaveLength(1);
    });
  });
});

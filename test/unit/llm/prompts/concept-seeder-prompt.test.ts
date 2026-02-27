import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildConceptSeederPrompt } from '../../../../src/llm/prompts/concept-seeder-prompt';

describe('concept-seeder-prompt', () => {
  describe('buildConceptSeederPrompt', () => {
    it('returns system and user messages', () => {
      const messages = buildConceptSeederPrompt({ genreVibes: 'noir' });
      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });

    it('includes content policy in system message', () => {
      const messages = buildConceptSeederPrompt({});
      expect(messages[0]?.content).toContain(CONTENT_POLICY);
    });

    it('includes taxonomy guidance in system message', () => {
      const messages = buildConceptSeederPrompt({});
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('TAXONOMY GUIDANCE');
    });

    it('includes seeder quality anchors in system message', () => {
      const messages = buildConceptSeederPrompt({});
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('whatIfQuestion must be');
      expect(systemMessage).toContain('playerFantasy must be');
    });

    it('includes diversity constraints in system message', () => {
      const messages = buildConceptSeederPrompt({});
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('DIVERSITY CONSTRAINTS');
      expect(systemMessage).toContain('6-8 concept seeds');
    });

    it('includes all seed fields when provided', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'sci-fi noir',
        moodKeywords: 'tense, paranoid',
        contentPreferences: 'No explicit violence',
      });
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('GENRE VIBES');
      expect(userMessage).toContain('sci-fi noir');
      expect(userMessage).toContain('MOOD KEYWORDS');
      expect(userMessage).toContain('tense, paranoid');
      expect(userMessage).toContain('CONTENT PREFERENCES');
      expect(userMessage).toContain('No explicit violence');
    });

    it('omits empty seed fields', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: '   ',
        moodKeywords: undefined,
        contentPreferences: '',
      });
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).not.toContain('GENRE VIBES');
      expect(userMessage).not.toContain('MOOD KEYWORDS');
      expect(userMessage).not.toContain('CONTENT PREFERENCES');
    });

    it('includes kernel constraints when kernel is provided', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
        kernel: {
          dramaticThesis: 'Control destroys trust',
          valueAtStake: 'Trust',
          opposingForce: 'Fear of uncertainty',
          directionOfChange: 'IRONIC',
          thematicQuestion: 'Can safety exist without control?',
          antithesis: 'Counter-argument challenges the thesis.',
        },
      });
      const systemMessage = messages[0]?.content ?? '';
      const userMessage = messages[1]?.content ?? '';

      expect(systemMessage).toContain('KERNEL CONSTRAINTS');
      expect(userMessage).toContain('SELECTED STORY KERNEL');
      expect(userMessage).toContain('dramaticThesis: Control destroys trust');
    });

    it('omits kernel constraints when kernel is absent', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
      });
      const systemMessage = messages[0]?.content ?? '';
      const userMessage = messages[1]?.content ?? '';

      expect(systemMessage).not.toContain('KERNEL CONSTRAINTS');
      expect(userMessage).not.toContain('SELECTED STORY KERNEL');
    });

    it('includes output requirements in user message', () => {
      const messages = buildConceptSeederPrompt({});
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('ConceptSeed');
    });
  });
});

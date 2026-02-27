import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildConceptArchitectPrompt } from '../../../../src/llm/prompts/concept-architect-prompt';
import type { ConceptArchitectContext } from '../../../../src/models';
import { createConceptSeedFixture } from '../../../fixtures/concept-generator';

function createContext(seedCount = 6): ConceptArchitectContext {
  return {
    seeds: Array.from({ length: seedCount }, (_, i) => createConceptSeedFixture(i + 1)),
    kernel: {
      dramaticThesis: 'Control destroys trust',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of uncertainty',
      directionOfChange: 'IRONIC',
      thematicQuestion: 'Can safety exist without control?',
      antithesis: 'Counter-argument challenges the thesis.',
    },
  };
}

describe('concept-architect-prompt', () => {
  describe('buildConceptArchitectPrompt', () => {
    it('returns system and user messages', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });

    it('includes content policy in system message', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      expect(messages[0]?.content).toContain(CONTENT_POLICY);
    });

    it('includes architect taxonomy guidance in system message', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('TAXONOMY GUIDANCE');
      expect(systemMessage).toContain('settingScale');
    });

    it('includes architect quality anchors in system message', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('coreConflictLoop');
      expect(systemMessage).toContain('actionVerbs');
    });

    it('includes serialized seeds in user message', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('CONCEPT SEEDS');
      expect(userMessage).toContain('"oneLineHook"');
      expect(userMessage).toContain('"genreFrame"');
    });

    it('includes seed count in user message', () => {
      const messages = buildConceptArchitectPrompt(createContext(7));
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('7 concept seeds');
    });

    it('includes kernel in user message when provided', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('STORY KERNEL');
      expect(userMessage).toContain('dramaticThesis: Control destroys trust');
    });

    it('omits kernel when absent', () => {
      const context: ConceptArchitectContext = {
        seeds: [createConceptSeedFixture(1)],
        kernel: undefined,
      };
      const messages = buildConceptArchitectPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('STORY KERNEL');
    });

    it('includes output requirements in user message', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('ConceptCharacterWorld');
      expect(userMessage).toContain('actionVerbs');
      expect(userMessage).toContain('settingAxioms');
    });
  });
});

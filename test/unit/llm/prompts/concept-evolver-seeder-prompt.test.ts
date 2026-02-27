import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildConceptEvolverSeederPrompt } from '../../../../src/llm/prompts/concept-evolver-seeder-prompt';
import type { ConceptEvolverSeederContext } from '../../../../src/models';
import { createEvaluatedConceptFixture } from '../../../fixtures/concept-generator';

function createContext(): ConceptEvolverSeederContext {
  return {
    kernel: {
      dramaticThesis: 'Control corrodes trust',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of uncertainty',
      directionOfChange: 'IRONIC',
      thematicQuestion: 'Can safety exist without control?',
      antithesis: 'Counter-argument challenges the thesis.',
    },
    parentConcepts: [createEvaluatedConceptFixture(1), createEvaluatedConceptFixture(2)],
  };
}

describe('concept-evolver-seeder-prompt', () => {
  describe('buildConceptEvolverSeederPrompt', () => {
    it('returns system and user messages', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });

    it('includes content policy in system message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      expect(messages[0]?.content).toContain(CONTENT_POLICY);
    });

    it('includes mutation strategies in system message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('MUTATION STRATEGIES');
      expect(systemMessage).toContain('recombine');
      expect(systemMessage).toContain('escalate');
    });

    it('includes taxonomy guidance in system message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('TAXONOMY GUIDANCE');
    });

    it('includes diversity constraints in system message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('DIVERSITY CONSTRAINTS');
      expect(systemMessage).toContain('exactly 6 concept seeds');
    });

    it('includes kernel constraints in system message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('KERNEL CONSTRAINTS');
    });

    it('includes story kernel in user message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('STORY KERNEL');
      expect(userMessage).toContain('dramaticThesis: Control corrodes trust');
    });

    it('includes parent concepts payload in user message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('PARENT CONCEPTS INPUT');
      expect(userMessage).toContain('"parentId": "parent_1"');
      expect(userMessage).toContain('"parentId": "parent_2"');
      expect(userMessage).toContain('"strengths"');
      expect(userMessage).toContain('"weaknesses"');
      expect(userMessage).toContain('"tradeoffSummary"');
    });

    it('includes all parents when context has 3 parent concepts', () => {
      const context: ConceptEvolverSeederContext = {
        ...createContext(),
        parentConcepts: [
          createEvaluatedConceptFixture(1),
          createEvaluatedConceptFixture(2),
          createEvaluatedConceptFixture(3),
        ],
      };
      const messages = buildConceptEvolverSeederPrompt(context);
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('"parentId": "parent_1"');
      expect(userMessage).toContain('"parentId": "parent_2"');
      expect(userMessage).toContain('"parentId": "parent_3"');
    });

    it('includes output requirements in user message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('exactly 6 items');
    });
  });
});

import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildConceptEngineerPrompt } from '../../../../src/llm/prompts/concept-engineer-prompt';
import type { ConceptEngineerContext } from '../../../../src/models';
import {
  createConceptSeedFixture,
  createConceptCharacterWorldFixture,
} from '../../../fixtures/concept-generator';

function createContext(seedCount = 6): ConceptEngineerContext {
  return {
    seeds: Array.from({ length: seedCount }, (_, i) => createConceptSeedFixture(i + 1)),
    characterWorlds: Array.from({ length: seedCount }, (_, i) =>
      createConceptCharacterWorldFixture(i + 1),
    ),
    kernel: {
      dramaticThesis: 'Control destroys trust',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of uncertainty',
      directionOfChange: 'IRONIC',
      conflictAxis: 'LOYALTY_VS_SURVIVAL',
      dramaticStance: 'ROMANTIC',
      thematicQuestion: 'Can safety exist without control?',
      antithesis: 'Counter-argument challenges the thesis.',
    },
  };
}

describe('concept-engineer-prompt', () => {
  describe('buildConceptEngineerPrompt', () => {
    it('returns system and user messages', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      expect(messages).toHaveLength(2);
      expect(messages[0]?.role).toBe('system');
      expect(messages[1]?.role).toBe('user');
    });

    it('includes content policy in system message', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      expect(messages[0]?.content).toContain(CONTENT_POLICY);
    });

    it('includes engineer quality anchors in system message', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('ironicTwist');
      expect(systemMessage).toContain('incitingDisruption');
      expect(systemMessage).toContain('escapeValve');
    });

    it('includes combined seed + characterWorld context in user message', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('CONCEPT IDENTITY + CHARACTER + WORLD');
      expect(userMessage).toContain('"oneLineHook"');
      expect(userMessage).toContain('"protagonistRole"');
      expect(userMessage).toContain('"actionVerbs"');
    });

    it('includes seed count in user message', () => {
      const messages = buildConceptEngineerPrompt(createContext(7));
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('7 concepts');
    });

    it('includes kernel in user message when provided', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('STORY KERNEL');
      expect(userMessage).toContain('dramaticThesis: Control destroys trust');
    });

    it('omits kernel when absent', () => {
      const context: ConceptEngineerContext = {
        seeds: [createConceptSeedFixture(1)],
        characterWorlds: [createConceptCharacterWorldFixture(1)],
        kernel: undefined,
      };
      const messages = buildConceptEngineerPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('STORY KERNEL');
    });

    it('includes output requirements in user message', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('ConceptEngine');
      expect(userMessage).toContain('elevatorParagraph');
    });
  });
});

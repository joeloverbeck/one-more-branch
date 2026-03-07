import type { ContentPacket } from '../../../../src/models/content-packet';
import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildConceptEngineerPrompt } from '../../../../src/llm/prompts/concept-engineer-prompt';
import type { ConceptEngineerContext } from '../../../../src/models';
import {
  createConceptSeedFixture,
  createConceptCharacterWorldFixture,
} from '../../../fixtures/concept-generator';

function createContentPacketFixture(id = 'content_1'): ContentPacket {
  return {
    contentId: id,
    sourceSparkIds: ['spark_1'],
    contentKind: 'TRANSFORMATION',
    coreAnomaly: 'People who cry shed liquid glass',
    humanAnchor: 'A glassblower whose tears became her art and her prison',
    socialEngine: 'The Tear Harvest Cooperative',
    choicePressure: 'Suppress grief to survive or weep to create beauty',
    signatureImage: 'A chandelier made entirely from a mothers grief',
    escalationPath: 'Emotional suppression drugs become mandatory',
    wildnessInvariant: 'Tears are literally glass — fragile, sharp, and beautiful',
    dullCollapse: 'Generic magic system with emotional cost',
    interactionVerbs: ['weep', 'sculpt', 'suppress', 'shatter'],
  };
}

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
      moralArgument: 'Test moral argument',
      valueSpectrum: {
        positive: 'Love',
        contrary: 'Indifference',
        contradictory: 'Hate',
        negationOfNegation: 'Self-destruction through love',
      },
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

    it('includes mandatory protagonist block in user message when protagonistDetails is provided', () => {
      const context: ConceptEngineerContext = {
        ...createContext(),
        protagonistDetails: 'A disgraced former surgeon',
      };
      const messages = buildConceptEngineerPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('MANDATORY PROTAGONIST');
      expect(userMessage).toContain('A disgraced former surgeon');
    });

    it('includes protagonist details in mandate parts when provided', () => {
      const context: ConceptEngineerContext = {
        ...createContext(),
        protagonistDetails: 'A disgraced former surgeon',
      };
      const messages = buildConceptEngineerPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('Protagonist Details: A disgraced former surgeon');
    });

    it('omits protagonist block when protagonistDetails is absent', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('MANDATORY PROTAGONIST');
    });

    it('includes output requirements in user message', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('ConceptEngine');
      expect(userMessage).toContain('elevatorParagraph');
    });

    it('includes content packet engineering constraints when packets provided', () => {
      const packet = createContentPacketFixture();
      const context: ConceptEngineerContext = {
        ...createContext(),
        contentPackets: [packet],
      };
      const messages = buildConceptEngineerPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('CONTENT PACKETS');
      expect(userMessage).toContain(packet.coreAnomaly);
      expect(userMessage).toContain(packet.socialEngine);
    });

    it('omits content packet section when packets undefined', () => {
      const messages = buildConceptEngineerPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('CONTENT PACKETS');
    });

    it('instructs elevatorParagraph to preserve packet signature image', () => {
      const packet = createContentPacketFixture();
      const context: ConceptEngineerContext = {
        ...createContext(),
        contentPackets: [packet],
      };
      const messages = buildConceptEngineerPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('elevatorParagraph');
      expect(userMessage).toContain('signature image');
    });
  });
});

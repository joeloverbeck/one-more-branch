import type { ContentPacket } from '../../../../src/models/content-packet';
import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildConceptArchitectPrompt } from '../../../../src/llm/prompts/concept-architect-prompt';
import type { ConceptArchitectContext } from '../../../../src/models';
import { createConceptSeedFixture } from '../../../fixtures/concept-generator';

function createContentPacketFixture(id = 'content_1'): ContentPacket {
  return {
    contentId: id,
    sourceSparkIds: ['spark_1'],
    contentKind: 'INSTITUTION',
    coreAnomaly: 'A hospital that heals by redistributing pain',
    humanAnchor: 'A nurse addicted to absorbing others suffering',
    socialEngine: 'The Bureau of Equitable Suffering',
    choicePressure: 'Accept your pain or redistribute it to the vulnerable',
    signatureImage: 'Patients screaming in a ward where no one is injured',
    escalationPath: 'The bureau begins drafting civilians for mandatory pain duty',
    wildnessInvariant: 'Pain is a transferable public resource',
    dullCollapse: 'Generic dystopian healthcare',
    interactionVerbs: ['absorb', 'transfer', 'refuse', 'petition'],
  };
}

function createContext(seedCount = 6): ConceptArchitectContext {
  return {
    seeds: Array.from({ length: seedCount }, (_, i) => createConceptSeedFixture(i + 1)),
    kernel: {
      dramaticThesis: 'Control destroys trust',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of uncertainty',
      directionOfChange: 'IRONIC',
      conflictAxis: 'POWER_VS_MORALITY',
      dramaticStance: 'COMIC',
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

    it('includes mandatory protagonist block in user message when protagonistDetails is provided', () => {
      const context: ConceptArchitectContext = {
        ...createContext(),
        protagonistDetails: 'A disgraced former surgeon',
      };
      const messages = buildConceptArchitectPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('MANDATORY PROTAGONIST');
      expect(userMessage).toContain('A disgraced former surgeon');
    });

    it('includes protagonist details in mandate parts when provided', () => {
      const context: ConceptArchitectContext = {
        ...createContext(),
        protagonistDetails: 'A disgraced former surgeon',
      };
      const messages = buildConceptArchitectPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('Protagonist Details: A disgraced former surgeon');
    });

    it('omits protagonist block when protagonistDetails is absent', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('MANDATORY PROTAGONIST');
    });

    it('includes output requirements in user message', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('ConceptCharacterWorld');
      expect(userMessage).toContain('actionVerbs');
      expect(userMessage).toContain('settingAxioms');
    });

    it('includes content packet grounding instructions when packets provided', () => {
      const packet = createContentPacketFixture();
      const context: ConceptArchitectContext = {
        ...createContext(),
        contentPackets: [packet],
      };
      const messages = buildConceptArchitectPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('CONTENT PACKETS');
      expect(userMessage).toContain(packet.coreAnomaly);
      expect(userMessage).toContain(packet.socialEngine);
    });

    it('omits content packet section when packets undefined', () => {
      const messages = buildConceptArchitectPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('CONTENT PACKETS');
    });

    it('instructs at least one keyInstitution from packet socialEngine', () => {
      const packet = createContentPacketFixture();
      const context: ConceptArchitectContext = {
        ...createContext(),
        contentPackets: [packet],
      };
      const messages = buildConceptArchitectPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('keyInstitution');
      expect(userMessage).toContain('socialEngine');
    });
  });
});

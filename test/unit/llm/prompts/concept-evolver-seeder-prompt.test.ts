import type { ContentPacket } from '../../../../src/models/content-packet';
import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildConceptEvolverSeederPrompt } from '../../../../src/llm/prompts/concept-evolver-seeder-prompt';
import type { ConceptEvolverSeederContext } from '../../../../src/models';
import { createEvaluatedConceptFixture } from '../../../fixtures/concept-generator';

function createContentPacketFixture(id = 'content_1'): ContentPacket {
  return {
    contentId: id,
    sourceSparkIds: ['spark_1'],
    contentKind: 'ENTITY',
    coreAnomaly: 'A sentient fog that digests memory',
    humanAnchor: 'A grief counselor who lost her own memories',
    socialEngine: 'Memory insurance industry',
    choicePressure: 'Protect others or recover your own past',
    signatureImage: 'A woman breathing fog that glows with stolen dreams',
    escalationPath: 'The fog begins targeting entire neighborhoods',
    wildnessInvariant: 'The fog is alive and feeds on remembering',
    dullCollapse: 'Generic amnesia thriller',
    interactionVerbs: ['inhale', 'shelter', 'bargain', 'forget'],
  };
}

function createContext(): ConceptEvolverSeederContext {
  return {
    kernel: {
      dramaticThesis: 'Control corrodes trust',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of uncertainty',
      directionOfChange: 'IRONIC',
      conflictAxis: 'INDIVIDUAL_VS_SYSTEM',
      dramaticStance: 'TRAGIC',
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

    it('includes mandatory protagonist block in user message when protagonistDetails is provided', () => {
      const context: ConceptEvolverSeederContext = {
        ...createContext(),
        protagonistDetails: 'A disgraced former surgeon',
      };
      const messages = buildConceptEvolverSeederPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('MANDATORY PROTAGONIST');
      expect(userMessage).toContain('A disgraced former surgeon');
    });

    it('includes protagonist details in mandate parts when provided', () => {
      const context: ConceptEvolverSeederContext = {
        ...createContext(),
        protagonistDetails: 'A disgraced former surgeon',
      };
      const messages = buildConceptEvolverSeederPrompt(context);
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('Protagonist Details: A disgraced former surgeon');
    });

    it('omits protagonist block when protagonistDetails is absent', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('MANDATORY PROTAGONIST');
    });

    it('includes output requirements in user message', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('exactly 6 items');
    });

    it('includes CONTENT PACKETS section when packets provided', () => {
      const packet = createContentPacketFixture();
      const context: ConceptEvolverSeederContext = {
        ...createContext(),
        contentPackets: [packet],
      };
      const messages = buildConceptEvolverSeederPrompt(context);
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('CONTENT PACKETS');
      expect(userMessage).toContain(packet.coreAnomaly);
      expect(userMessage).toContain(packet.wildnessInvariant);
      expect(userMessage).toContain(packet.socialEngine);
      expect(userMessage).toContain(packet.signatureImage);
    });

    it('includes WILDNESS INVARIANTS section listing invariants from packets', () => {
      const packet = createContentPacketFixture();
      const context: ConceptEvolverSeederContext = {
        ...createContext(),
        contentPackets: [packet],
      };
      const messages = buildConceptEvolverSeederPrompt(context);
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('WILDNESS INVARIANTS');
      expect(userMessage).toContain(`[${packet.contentId}]: ${packet.wildnessInvariant}`);
    });

    it('instructs "preserve or intensify" wildness invariants', () => {
      const packet = createContentPacketFixture();
      const context: ConceptEvolverSeederContext = {
        ...createContext(),
        contentPackets: [packet],
      };
      const messages = buildConceptEvolverSeederPrompt(context);
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('preserved or intensified');
    });

    it('omits CONTENT PACKETS and WILDNESS INVARIANTS sections when packets undefined', () => {
      const messages = buildConceptEvolverSeederPrompt(createContext());
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).not.toContain('CONTENT PACKETS');
      expect(userMessage).not.toContain('WILDNESS INVARIANTS');
    });

    it('omits CONTENT PACKETS and WILDNESS INVARIANTS sections when packets empty', () => {
      const context: ConceptEvolverSeederContext = {
        ...createContext(),
        contentPackets: [],
      };
      const messages = buildConceptEvolverSeederPrompt(context);
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).not.toContain('CONTENT PACKETS');
      expect(userMessage).not.toContain('WILDNESS INVARIANTS');
    });
  });
});

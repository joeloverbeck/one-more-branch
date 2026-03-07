import type { ContentPacket } from '../../../../src/models/content-packet';
import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildConceptSeederPrompt } from '../../../../src/llm/prompts/concept-seeder-prompt';

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

      expect(userMessage).toContain('USER CREATIVE MANDATE');
      expect(userMessage).toContain('Genre Vibes: sci-fi noir');
      expect(userMessage).toContain('Mood Keywords: tense, paranoid');
      expect(userMessage).toContain('Content Preferences: No explicit violence');
      expect(userMessage).toContain('non-negotiable');
    });

    it('omits empty seed fields', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: '   ',
        moodKeywords: undefined,
        contentPreferences: '',
      });
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).not.toContain('USER CREATIVE MANDATE');
      expect(userMessage).not.toContain('Genre Vibes');
      expect(userMessage).not.toContain('Mood Keywords');
      expect(userMessage).not.toContain('Content Preferences');
    });

    it('includes kernel constraints when kernel is provided', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
        kernel: {
          dramaticThesis: 'Control destroys trust',
          valueAtStake: 'Trust',
          opposingForce: 'Fear of uncertainty',
          directionOfChange: 'IRONIC',
          conflictAxis: 'FREEDOM_VS_SAFETY',
          dramaticStance: 'IRONIC',
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

    it('includes protagonist identity constraint in system message when protagonistDetails is provided', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
        protagonistDetails: 'A disgraced former surgeon',
      });
      const systemMessage = messages[0]?.content ?? '';
      expect(systemMessage).toContain('PROTAGONIST IDENTITY CONSTRAINT');
    });

    it('includes mandatory protagonist block in user message when protagonistDetails is provided', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
        protagonistDetails: 'A disgraced former surgeon',
      });
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('MANDATORY PROTAGONIST');
      expect(userMessage).toContain('A disgraced former surgeon');
    });

    it('includes protagonist details in mandate parts when provided', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
        protagonistDetails: 'A disgraced former surgeon',
      });
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('Protagonist Details: A disgraced former surgeon');
    });

    it('omits protagonist blocks when protagonistDetails is absent', () => {
      const messages = buildConceptSeederPrompt({ genreVibes: 'noir' });
      const systemMessage = messages[0]?.content ?? '';
      const userMessage = messages[1]?.content ?? '';
      expect(systemMessage).not.toContain('PROTAGONIST IDENTITY CONSTRAINT');
      expect(userMessage).not.toContain('MANDATORY PROTAGONIST');
    });

    it('omits protagonist blocks when protagonistDetails is whitespace', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
        protagonistDetails: '   ',
      });
      const systemMessage = messages[0]?.content ?? '';
      const userMessage = messages[1]?.content ?? '';
      expect(systemMessage).not.toContain('PROTAGONIST IDENTITY CONSTRAINT');
      expect(userMessage).not.toContain('MANDATORY PROTAGONIST');
    });

    it('includes output requirements in user message', () => {
      const messages = buildConceptSeederPrompt({});
      const userMessage = messages[1]?.content ?? '';

      expect(userMessage).toContain('OUTPUT REQUIREMENTS');
      expect(userMessage).toContain('ConceptSeed');
    });

    it('includes CONTENT PACKETS section when packets provided', () => {
      const packet = createContentPacketFixture();
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
        contentPackets: [packet],
      });
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain('CONTENT PACKETS');
    });

    it('omits CONTENT PACKETS section when packets undefined', () => {
      const messages = buildConceptSeederPrompt({ genreVibes: 'noir' });
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('CONTENT PACKETS');
    });

    it('omits CONTENT PACKETS section when packets array is empty', () => {
      const messages = buildConceptSeederPrompt({
        genreVibes: 'noir',
        contentPackets: [],
      });
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).not.toContain('CONTENT PACKETS');
    });

    it('includes each packet coreAnomaly, wildnessInvariant, socialEngine, signatureImage', () => {
      const packet = createContentPacketFixture();
      const messages = buildConceptSeederPrompt({
        contentPackets: [packet],
      });
      const userMessage = messages[1]?.content ?? '';
      expect(userMessage).toContain(packet.coreAnomaly);
      expect(userMessage).toContain(packet.wildnessInvariant);
      expect(userMessage).toContain(packet.socialEngine);
      expect(userMessage).toContain(packet.signatureImage);
    });
  });
});

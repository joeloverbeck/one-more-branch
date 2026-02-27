import { buildConceptVerifierPrompt } from '../../../../src/llm/prompts/concept-verifier-prompt';
import type { ConceptVerifierContext } from '../../../../src/models';
import type { StoryKernel } from '../../../../src/models/story-kernel';
import { createEvaluatedConceptFixture } from '../../../fixtures/concept-generator';

function createStoryKernel(): StoryKernel {
  return {
    dramaticThesis: 'Control destroys trust',
    valueAtStake: 'Trust',
    opposingForce: 'Fear of uncertainty',
    directionOfChange: 'IRONIC',
    thematicQuestion: 'Can safety exist without control?',
  antithesis: 'Counter-argument challenges the thesis.',
  };
}

function createContext(count = 2): ConceptVerifierContext {
  return {
    evaluatedConcepts: Array.from({ length: count }, (_, i) =>
      createEvaluatedConceptFixture(i + 1),
    ),
    kernel: createStoryKernel(),
  };
}

describe('buildConceptVerifierPrompt', () => {
  it('returns system and user messages', () => {
    const messages = buildConceptVerifierPrompt(createContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message contains role intro and verification directives', () => {
    const messages = buildConceptVerifierPrompt(createContext());
    const system = messages[0].content;

    expect(system).toContain('concept integrity analyst');
    expect(system).toContain('VERIFICATION DIRECTIVES');
    expect(system).toContain('Do not praise concepts');
    expect(system).toContain('irreducibly unique');
    expect(system).toContain('load-bearing check');
    expect(system).toContain('escalating setpieces');
    expect(system).toContain('logline compression test');
    expect(system).toContain('setpiece causal chain test');
    expect(system).toContain('premise promises');
    expect(system).toContain('inevitability statement');
  });

  it('system message contains kernel fidelity directive', () => {
    const messages = buildConceptVerifierPrompt(createContext());
    const system = messages[0].content;

    expect(system).toContain('KERNEL FIDELITY DIRECTIVE');
    expect(system).toContain('valueAtStake');
    expect(system).toContain('opposingForce');
    expect(system).toContain('kernelFidelityCheck.passes');
    expect(system).toContain('kernelFidelityCheck.kernelDrift');
  });

  it('user message contains evaluated concept data', () => {
    const messages = buildConceptVerifierPrompt(createContext());
    const user = messages[1].content;

    expect(user).toContain('EVALUATED CONCEPTS INPUT');
    expect(user).toContain('concept_1');
    expect(user).toContain('concept_2');
    expect(user).toContain('Hook 1');
    expect(user).toContain('Hook 2');
    expect(user).toContain('NOIR');
  });

  it('user message includes story kernel fields', () => {
    const messages = buildConceptVerifierPrompt(createContext());
    const user = messages[1].content;

    expect(user).toContain('STORY KERNEL');
    expect(user).toContain('dramaticThesis: Control destroys trust');
    expect(user).toContain('valueAtStake: Trust');
    expect(user).toContain('opposingForce: Fear of uncertainty');
    expect(user).toContain('directionOfChange: IRONIC');
    expect(user).toContain('thematicQuestion: Can safety exist without control?');
  });

  it('user message includes output requirements with correct count', () => {
    const messages = buildConceptVerifierPrompt(createContext(3));
    const user = messages[1].content;

    expect(user).toContain('OUTPUT REQUIREMENTS');
    expect(user).toContain('exactly 3 items');
    expect(user).toContain('signatureScenario');
    expect(user).toContain('loglineCompressible');
    expect(user).toContain('setpieceCausalLinks');
    expect(user).toContain('premisePromises');
    expect(user).toContain('exactly 3-5');
    expect(user).toContain('escalatingSetpieces');
    expect(user).toContain('inevitabilityStatement');
    expect(user).toContain('loadBearingCheck');
    expect(user).toContain('kernelFidelityCheck');
    expect(user).toContain('conceptIntegrityScore');
    expect(user).toContain('exactly 6 strings');
  });

  it('serializes concept fields including strengths and weaknesses', () => {
    const messages = buildConceptVerifierPrompt(createContext(1));
    const user = messages[1].content;

    expect(user).toContain('genreSubversion');
    expect(user).toContain('coreFlaw');
    expect(user).toContain('coreConflictLoop');
    expect(user).toContain('conflictAxis');
    expect(user).toContain('pressureSource');
    expect(user).toContain('settingAxioms');
    expect(user).toContain('constraintSet');
    expect(user).toContain('playerFantasy');
    expect(user).toContain('strengths');
    expect(user).toContain('weaknesses');
    expect(user).toContain('deadlineMechanism');
    expect(user).toContain('keyInstitutions');
    expect(user).toContain('escapeValve');
    expect(user).toContain('incitingDisruption');
  });
});

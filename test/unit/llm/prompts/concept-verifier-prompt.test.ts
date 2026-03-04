import { buildConceptSpecificityPrompt } from '../../../../src/llm/prompts/concept-specificity-prompt';
import { buildConceptScenarioPrompt } from '../../../../src/llm/prompts/concept-scenario-prompt';
import type { ConceptVerifierContext } from '../../../../src/models';
import type { StoryKernel } from '../../../../src/models/story-kernel';
import type { ConceptSpecificityAnalysis } from '../../../../src/llm/concept-specificity-types';
import { createEvaluatedConceptFixture } from '../../../fixtures/concept-generator';

function createStoryKernel(): StoryKernel {
  return {
    dramaticThesis: 'Control destroys trust',
    valueAtStake: 'Trust',
    opposingForce: 'Fear of uncertainty',
    directionOfChange: 'IRONIC',
    conflictAxis: 'IDENTITY_VS_BELONGING',
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

function createSpecificityAnalyses(count = 2): ConceptSpecificityAnalysis[] {
  return Array.from({ length: count }, (_, i) => ({
    conceptId: `concept_${i + 1}`,
    signatureScenario: `Signature scenario ${i + 1}`,
    loglineCompressible: true,
    logline: `Logline for concept ${i + 1}`,
    premisePromises: ['Promise 1', 'Promise 2', 'Promise 3'],
    inevitabilityStatement: `Inevitability ${i + 1}`,
    loadBearingCheck: { passes: true, reasoning: 'Reason', genericCollapse: 'Collapse' },
    kernelFidelityCheck: { passes: true, reasoning: 'Reason', kernelDrift: 'Drift' },
  }));
}

describe('buildConceptSpecificityPrompt', () => {
  it('returns system and user messages', () => {
    const messages = buildConceptSpecificityPrompt(createContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message contains role intro and specificity directives', () => {
    const messages = buildConceptSpecificityPrompt(createContext());
    const system = messages[0].content;

    expect(system).toContain('concept specificity analyst');
    expect(system).toContain('SPECIFICITY DIRECTIVES');
    expect(system).toContain('Do not praise concepts');
    expect(system).toContain('irreducibly unique');
    expect(system).toContain('load-bearing check');
    expect(system).toContain('logline compression test');
    expect(system).toContain('premise promises');
    expect(system).toContain('inevitability statement');
  });

  it('system message contains kernel fidelity directive', () => {
    const messages = buildConceptSpecificityPrompt(createContext());
    const system = messages[0].content;

    expect(system).toContain('KERNEL FIDELITY DIRECTIVE');
    expect(system).toContain('valueAtStake');
    expect(system).toContain('opposingForce');
    expect(system).toContain('kernelFidelityCheck.passes');
    expect(system).toContain('kernelFidelityCheck.kernelDrift');
  });

  it('system message does NOT contain scenario generation directives', () => {
    const messages = buildConceptSpecificityPrompt(createContext());
    const system = messages[0].content;

    expect(system).not.toContain('escalating setpieces');
    expect(system).not.toContain('setpiece causal chain test');
    expect(system).not.toContain('conceptIntegrityScore');
  });

  it('user message contains evaluated concept data', () => {
    const messages = buildConceptSpecificityPrompt(createContext());
    const user = messages[1].content;

    expect(user).toContain('EVALUATED CONCEPTS INPUT');
    expect(user).toContain('concept_1');
    expect(user).toContain('concept_2');
    expect(user).toContain('Hook 1');
    expect(user).toContain('Hook 2');
    expect(user).toContain('NOIR');
  });

  it('user message includes story kernel fields', () => {
    const messages = buildConceptSpecificityPrompt(createContext());
    const user = messages[1].content;

    expect(user).toContain('STORY KERNEL');
    expect(user).toContain('dramaticThesis: Control destroys trust');
    expect(user).toContain('valueAtStake: Trust');
    expect(user).toContain('opposingForce: Fear of uncertainty');
  });

  it('user message includes output requirements with correct count', () => {
    const messages = buildConceptSpecificityPrompt(createContext(3));
    const user = messages[1].content;

    expect(user).toContain('OUTPUT REQUIREMENTS');
    expect(user).toContain('exactly 3 items');
    expect(user).toContain('signatureScenario');
    expect(user).toContain('loglineCompressible');
    expect(user).toContain('premisePromises');
    expect(user).toContain('inevitabilityStatement');
    expect(user).toContain('loadBearingCheck');
    expect(user).toContain('kernelFidelityCheck');
  });

  it('serializes concept fields including strengths and weaknesses', () => {
    const messages = buildConceptSpecificityPrompt(createContext(1));
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

describe('buildConceptScenarioPrompt', () => {
  it('returns system and user messages', () => {
    const context = createContext();
    const messages = buildConceptScenarioPrompt(context, createSpecificityAnalyses());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message contains scenario directives', () => {
    const context = createContext();
    const messages = buildConceptScenarioPrompt(context, createSpecificityAnalyses());
    const system = messages[0].content;

    expect(system).toContain('creative scenario architect');
    expect(system).toContain('SCENARIO DIRECTIVES');
    expect(system).toContain('6 escalating setpieces');
    expect(system).toContain('setpiece causal chain test');
    expect(system).toContain('conceptIntegrityScore');
  });

  it('system message does NOT contain specificity analysis directives', () => {
    const context = createContext();
    const messages = buildConceptScenarioPrompt(context, createSpecificityAnalyses());
    const system = messages[0].content;

    expect(system).not.toContain('SPECIFICITY DIRECTIVES');
    expect(system).not.toContain('logline compression test');
    expect(system).not.toContain('KERNEL FIDELITY DIRECTIVE');
  });

  it('user message includes signature scenarios from specificity analysis', () => {
    const context = createContext();
    const messages = buildConceptScenarioPrompt(context, createSpecificityAnalyses());
    const user = messages[1].content;

    expect(user).toContain('signatureScenario');
    expect(user).toContain('Signature scenario 1');
    expect(user).toContain('Signature scenario 2');
  });

  it('user message includes output requirements with correct count', () => {
    const context = createContext(3);
    const messages = buildConceptScenarioPrompt(context, createSpecificityAnalyses(3));
    const user = messages[1].content;

    expect(user).toContain('OUTPUT REQUIREMENTS');
    expect(user).toContain('exactly 3 items');
    expect(user).toContain('escalatingSetpieces');
    expect(user).toContain('setpieceCausalChainBroken');
    expect(user).toContain('setpieceCausalLinks');
    expect(user).toContain('conceptIntegrityScore');
  });

  it('user message includes story kernel fields', () => {
    const context = createContext();
    const messages = buildConceptScenarioPrompt(context, createSpecificityAnalyses());
    const user = messages[1].content;

    expect(user).toContain('STORY KERNEL');
    expect(user).toContain('dramaticThesis: Control destroys trust');
  });
});

import { buildConceptVerifierPrompt } from '../../../../src/llm/prompts/concept-verifier-prompt';
import type { ConceptVerifierContext } from '../../../../src/models';
import { createEvaluatedConceptFixture } from '../../../fixtures/concept-generator';

function createContext(count = 2): ConceptVerifierContext {
  return {
    evaluatedConcepts: Array.from({ length: count }, (_, i) =>
      createEvaluatedConceptFixture(i + 1),
    ),
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
    expect(system).toContain('inevitability statement');
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

  it('user message includes output requirements with correct count', () => {
    const messages = buildConceptVerifierPrompt(createContext(3));
    const user = messages[1].content;

    expect(user).toContain('OUTPUT REQUIREMENTS');
    expect(user).toContain('exactly 3 items');
    expect(user).toContain('signatureScenario');
    expect(user).toContain('escalatingSetpieces');
    expect(user).toContain('inevitabilityStatement');
    expect(user).toContain('loadBearingCheck');
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
  });
});

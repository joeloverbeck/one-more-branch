import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildMilestoneGenerationPrompt } from '../../../../src/llm/prompts/milestone-generation-prompt';
import type { MacroArchitectureResult } from '../../../../src/models/structure-generation';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'user')?.content ?? '';
}

function createMacroArchitecture(): MacroArchitectureResult {
  return {
    overallTheme: 'Truth survives only when someone risks public shame.',
    premise: 'A disgraced inspector must weaponize civic ritual against a tribunal cover-up.',
    openingImage: 'A wet tribunal dais before dawn.',
    closingImage: 'The same dais occupied by witnesses instead of judges.',
    pacingBudget: { targetPagesMin: 18, targetPagesMax: 36 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'An inspector is framed in public.' },
      midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
      climax: { actIndex: 2, description: 'The harbor court collapses under testimony.' },
      signatureScenarioPlacement: { actIndex: 1, description: 'A ritual hearing turns into a trap.' },
    },
    initialNpcAgendas: [],
    acts: [
      {
        name: 'Act I',
        objective: 'Find the first leak.',
        stakes: 'Failure means imprisonment.',
        entryCondition: 'The tribunal pins the murder on the inspector.',
        actQuestion: 'Who set the inspector up?',
        exitReversal: 'The evidence points to the inspector’s mentor.',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['crime_or_puzzle_presented'],
      },
      {
        name: 'Act II',
        objective: 'Turn institutional procedure into leverage.',
        stakes: 'Failure locks the city under tribunal rule.',
        entryCondition: 'The mentor’s name appears in sealed ledgers.',
        actQuestion: 'Can procedure be used against power?',
        exitReversal: 'The inspector wins the crowd but loses legal protection.',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['key_clue_recontextualized'],
      },
      {
        name: 'Act III',
        objective: 'Define what justice replaces the tribunal.',
        stakes: 'Failure makes the purge permanent.',
        entryCondition: 'The tribunal splinters in public.',
        actQuestion: 'What does justice cost when everyone is compromised?',
        exitReversal: '',
        promiseTargets: ['Public ritual becomes a weapon'],
        obligationTargets: ['culprit_unmasked'],
      },
    ],
    rawResponse: '{}',
  };
}

describe('buildMilestoneGenerationPrompt', () => {
  const baseContext = {
    tone: 'stormy maritime thriller',
    decomposedCharacters: [],
    decomposedWorld: {
      facts: [
        {
          domain: 'geography' as const,
          fact: 'A harbor city where tribunal law is announced by tide bells.',
          scope: 'global' as const,
        },
      ],
      rawWorldbuilding: 'A harbor city where tribunal law is announced by tide bells.',
    },
    conceptVerification: {
      conceptId: 'concept_1',
      signatureScenario: 'A ritual hearing turns into a trap.',
      loglineCompressible: true,
      logline: 'A disgraced inspector must weaponize civic ritual against a tribunal cover-up.',
      premisePromises: ['Public ritual becomes a weapon'],
      escalatingSetpieces: ['setpiece 0', 'setpiece 1', 'setpiece 2', 'setpiece 3'],
      setpieceCausalChainBroken: false,
      setpieceCausalLinks: ['0->1', '1->2', '2->3'],
      inevitabilityStatement: 'The ritual machinery will eventually turn on itself.',
      loadBearingCheck: {
        passes: true,
        reasoning: 'Specific to the harbor tribunal.',
        genericCollapse: 'Would collapse without ritualized law.',
      },
      kernelFidelityCheck: {
        passes: true,
        reasoning: 'Aligned with public shame versus truth.',
        kernelDrift: 'None.',
      },
      conceptIntegrityScore: 92,
    },
  };

  it('builds a system prompt plus a single user prompt', () => {
    const messages = buildMilestoneGenerationPrompt(baseContext, createMacroArchitecture());

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('injects the locked macro architecture and midpoint constraints', () => {
    const user = getUserMessage(buildMilestoneGenerationPrompt(baseContext, createMacroArchitecture()));

    expect(user).toContain('LOCKED MACRO ARCHITECTURE (immutable; do not rewrite)');
    expect(user).toContain('"actQuestion": "Who set the inspector up?"');
    expect(user).toContain('anchorMoments.midpoint.actIndex');
    expect(user).toContain('anchorMoments.midpoint.milestoneSlot');
    expect(user).toContain('actIndex: integer (zero-based index matching the macro act)');
  });

  it('includes setpiece and specificity guidance for escalation milestones', () => {
    const user = getUserMessage(buildMilestoneGenerationPrompt(baseContext, createMacroArchitecture()));

    expect(user).toContain('VERIFIED SETPIECE BANK (zero-based indices)');
    expect(user).toContain('setpieceSourceIndex');
    expect(user).toContain('uniqueScenarioHook must still prove concept-specificity');
    expect(user).toContain('approachVectors must contain 2-3 distinct values');
  });

  it('includes the content policy in the system prompt', () => {
    const system = getSystemMessage(buildMilestoneGenerationPrompt(baseContext, createMacroArchitecture()));

    expect(system).toContain('NC-21');
    expect(system).toContain(CONTENT_POLICY);
  });
});

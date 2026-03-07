import { isGeneratedConceptBatch, isSavedConcept } from '../../../src/models/saved-concept';
import type { EvaluatedConcept, ScoredConcept } from '../../../src/models/concept-generator';
import { createConceptSpecFixture } from '../../fixtures/concept-generator';

function createValidConceptSpec(): EvaluatedConcept['concept'] {
  return createConceptSpecFixture(1);
}

function createEvaluatedConcept(): EvaluatedConcept {
  return {
    concept: createValidConceptSpec(),
    scores: {
      hookStrength: 4,
      conflictEngine: 5,
      agencyBreadth: 4,
      noveltyLeverage: 3,
      llmFeasibility: 4,
      ironicPremise: 3,
      sceneGenerativePower: 3,
      contentCharge: 3,
    },
    overallScore: 82,
    passes: true,
    strengths: ['Clear dramatic loop', 'High replay potential'],
    weaknesses: ['Could sharpen novelty hooks'],
    tradeoffSummary: 'Strong system-level stakes with moderate accessibility risk.',
  };
}

function createScoredConcept(): ScoredConcept {
  return {
    concept: createValidConceptSpec(),
    scores: {
      hookStrength: 4,
      conflictEngine: 5,
      agencyBreadth: 4,
      noveltyLeverage: 3,
      llmFeasibility: 4,
      ironicPremise: 3,
      sceneGenerativePower: 3,
      contentCharge: 3,
    },
    scoreEvidence: {
      hookStrength: ['Immediate premise clarity'],
      conflictEngine: ['Sustained pressure source'],
      agencyBreadth: ['Multiple strategic options'],
      noveltyLeverage: ['Memory economy angle'],
      llmFeasibility: ['Clear constraints and institutions'],
      ironicPremise: ['Irony evidence'],
      sceneGenerativePower: ['Scene evidence'],
      contentCharge: ['Concrete impossibility present'],
    },
    overallScore: 82,
    passes: true,
  };
}

describe('saved-concept model guards', () => {
  it('accepts valid SavedConcept payloads with optional stress test fields', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {
        genreVibes: 'noir, urban decay',
      },
      evaluatedConcept: createEvaluatedConcept(),
      preHardenedConcept: createEvaluatedConcept(),
      hardenedAt: '2026-02-19T01:00:00.000Z',
      stressTestResult: {
        driftRisks: [
          {
            risk: 'Scene drift into exposition',
            mitigation: 'Pin threat updates to actions',
            mitigationType: 'SCENE_RULE',
          },
        ],
        playerBreaks: [
          {
            scenario: 'Player leaks all memories immediately',
            handling: 'Faction sanctions trigger direct costs',
            constraintUsed: 'Public ledger updates once daily.',
          },
        ],
      },
    };

    expect(isSavedConcept(value)).toBe(true);
  });

  it('rejects SavedConcept payloads with invalid preHardenedConcept', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: createEvaluatedConcept(),
      preHardenedConcept: { concept: { oneLineHook: 'Incomplete' } },
    };

    expect(isSavedConcept(value)).toBe(false);
  });

  it('rejects SavedConcept payloads with invalid nested evaluated concept data', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: {
        ...createEvaluatedConcept(),
        concept: {
          oneLineHook: 'Only one field',
        },
      },
    };

    expect(isSavedConcept(value)).toBe(false);
  });

  it('accepts SavedConcept with verificationResult that has kernelFidelityCheck', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: createEvaluatedConcept(),
      verificationResult: {
        conceptId: 'concept_1',
        signatureScenario: 'Iconic moment',
        loglineCompressible: true,
        logline: 'A courier must expose the archive before her own edits erase the truth.',
        premisePromises: ['p1', 'p2', 'p3'],
        escalatingSetpieces: ['s1', 's2', 's3', 's4', 's5', 's6'],
        setpieceCausalChainBroken: false,
        setpieceCausalLinks: ['1->2', '2->3', '3->4', '4->5', '5->6'],
        inevitabilityStatement: 'Must happen',
        loadBearingCheck: {
          passes: true,
          reasoning: 'Load-bearing',
          genericCollapse: 'Collapses',
        },
        kernelFidelityCheck: {
          passes: true,
          reasoning: 'Kernel grounded',
          kernelDrift: 'No drift',
        },
        conceptIntegrityScore: 85,
      },
    };

    expect(isSavedConcept(value)).toBe(true);
  });

  it('rejects SavedConcept with verificationResult missing required kernelFidelityCheck', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: createEvaluatedConcept(),
      verificationResult: {
        conceptId: 'concept_1',
        signatureScenario: 'Iconic moment',
        loglineCompressible: true,
        logline: 'A courier must expose the archive before her own edits erase the truth.',
        premisePromises: ['p1', 'p2', 'p3'],
        escalatingSetpieces: ['s1', 's2', 's3', 's4', 's5', 's6'],
        setpieceCausalChainBroken: false,
        setpieceCausalLinks: ['1->2', '2->3', '3->4', '4->5', '5->6'],
        inevitabilityStatement: 'Must happen',
        loadBearingCheck: {
          passes: true,
          reasoning: 'Load-bearing',
          genericCollapse: 'Collapses',
        },
        conceptIntegrityScore: 85,
      },
    };

    expect(isSavedConcept(value)).toBe(false);
  });

  it('rejects SavedConcept with malformed kernelFidelityCheck in verificationResult', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: createEvaluatedConcept(),
      verificationResult: {
        conceptId: 'concept_1',
        signatureScenario: 'Iconic moment',
        loglineCompressible: true,
        logline: 'A courier must expose the archive before her own edits erase the truth.',
        premisePromises: ['p1', 'p2', 'p3'],
        escalatingSetpieces: ['s1', 's2', 's3', 's4', 's5', 's6'],
        setpieceCausalChainBroken: false,
        setpieceCausalLinks: ['1->2', '2->3', '3->4', '4->5', '5->6'],
        inevitabilityStatement: 'Must happen',
        loadBearingCheck: {
          passes: true,
          reasoning: 'Load-bearing',
          genericCollapse: 'Collapses',
        },
        kernelFidelityCheck: {
          passes: 'yes',
          reasoning: 'Kernel grounded',
          kernelDrift: 'No drift',
        },
        conceptIntegrityScore: 85,
      },
    };

    expect(isSavedConcept(value)).toBe(false);
  });

  it('rejects SavedConcept with verificationResult missing setpieceCausalLinks', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: createEvaluatedConcept(),
      verificationResult: {
        conceptId: 'concept_1',
        signatureScenario: 'Iconic moment',
        loglineCompressible: true,
        logline: 'A courier must expose the archive before her own edits erase the truth.',
        premisePromises: ['p1', 'p2', 'p3'],
        escalatingSetpieces: ['s1', 's2', 's3', 's4', 's5', 's6'],
        setpieceCausalChainBroken: false,
        inevitabilityStatement: 'Must happen',
        loadBearingCheck: {
          passes: true,
          reasoning: 'Load-bearing',
          genericCollapse: 'Collapses',
        },
        kernelFidelityCheck: {
          passes: true,
          reasoning: 'Kernel grounded',
          kernelDrift: 'No drift',
        },
        conceptIntegrityScore: 85,
      },
    };

    expect(isSavedConcept(value)).toBe(false);
  });

  it('rejects SavedConcept with verificationResult logline over 35 words', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: createEvaluatedConcept(),
      verificationResult: {
        conceptId: 'concept_1',
        signatureScenario: 'Iconic moment',
        loglineCompressible: true,
        logline:
          'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree twentyfour twentyfive twentysix twentyseven twentyeight twentynine thirty thirtyone thirtytwo thirtythree thirtyfour thirtyfive thirtysix',
        premisePromises: ['p1', 'p2', 'p3'],
        escalatingSetpieces: ['s1', 's2', 's3', 's4', 's5', 's6'],
        setpieceCausalChainBroken: false,
        setpieceCausalLinks: ['1->2', '2->3', '3->4', '4->5', '5->6'],
        inevitabilityStatement: 'Must happen',
        loadBearingCheck: {
          passes: true,
          reasoning: 'Load-bearing',
          genericCollapse: 'Collapses',
        },
        kernelFidelityCheck: {
          passes: true,
          reasoning: 'Kernel grounded',
          kernelDrift: 'No drift',
        },
        conceptIntegrityScore: 85,
      },
    };

    expect(isSavedConcept(value)).toBe(false);
  });

  it('rejects SavedConcept when scores missing contentCharge', () => {
    const ec = createEvaluatedConcept();
    const scoresWithout: Record<string, unknown> = { ...ec.scores };
    delete scoresWithout['contentCharge'];
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: { ...ec, scores: scoresWithout },
    };

    expect(isSavedConcept(value)).toBe(false);
  });

  it('rejects SavedConcept payloads with invalid stress test shapes', () => {
    const value = {
      id: 'concept-1',
      name: 'Memory Courier',
      createdAt: '2026-02-19T00:00:00.000Z',
      updatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      evaluatedConcept: createEvaluatedConcept(),
      stressTestResult: {
        driftRisks: [{ risk: 'x', mitigation: 'y', mitigationType: 'UNKNOWN' }],
        playerBreaks: [],
      },
    };

    expect(isSavedConcept(value)).toBe(false);
  });

  it('accepts valid GeneratedConceptBatch payloads', () => {
    const value = {
      id: 'batch-1',
      generatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {
        genreVibes: 'noir, urban decay',
      },
      ideatedConcepts: [createValidConceptSpec()],
      scoredConcepts: [createScoredConcept()],
      selectedConcepts: [createEvaluatedConcept()],
    };

    expect(isGeneratedConceptBatch(value)).toBe(true);
  });

  it('rejects GeneratedConceptBatch payloads with malformed scored concepts', () => {
    const value = {
      id: 'batch-1',
      generatedAt: '2026-02-19T00:00:00.000Z',
      seeds: {},
      ideatedConcepts: [createValidConceptSpec()],
      scoredConcepts: [
        {
          ...createScoredConcept(),
          scoreEvidence: {
            hookStrength: ['ok'],
          },
        },
      ],
      selectedConcepts: [createEvaluatedConcept()],
    };

    expect(isGeneratedConceptBatch(value)).toBe(false);
  });
});

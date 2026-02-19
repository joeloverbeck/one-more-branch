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
      branchingFitness: 4,
      llmFeasibility: 4,
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
      branchingFitness: 4,
      llmFeasibility: 4,
    },
    scoreEvidence: {
      hookStrength: ['Immediate premise clarity'],
      conflictEngine: ['Sustained pressure source'],
      agencyBreadth: ['Multiple strategic options'],
      noveltyLeverage: ['Memory economy angle'],
      branchingFitness: ['Decision loops can reconverge'],
      llmFeasibility: ['Clear constraints and institutions'],
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
        thematicInterests: 'truth and control',
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
        sparkLine: 'A city remembers selectively.',
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

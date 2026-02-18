import type {
  ConceptDimensionScores,
  ConceptSeedInput,
  ConceptSpec,
  ConceptStressTestResult,
  EvaluatedConcept,
} from '@/models';

export function createConceptSpecFixture(index = 1): ConceptSpec {
  return {
    oneLineHook: `Hook ${index}`,
    elevatorParagraph: `Elevator paragraph ${index}`,
    genreFrame: 'NOIR',
    genreSubversion: `Subversion ${index}`,
    protagonistRole: `Role ${index}`,
    coreCompetence: `Competence ${index}`,
    coreFlaw: `Flaw ${index}`,
    actionVerbs: ['negotiate', 'investigate', 'sabotage', 'deceive', 'protect', 'infiltrate'],
    coreConflictLoop: `Conflict loop ${index}`,
    conflictAxis: 'TRUTH_VS_STABILITY',
    pressureSource: `Pressure ${index}`,
    stakesPersonal: `Personal stakes ${index}`,
    stakesSystemic: `Systemic stakes ${index}`,
    deadlineMechanism: `Deadline ${index}`,
    settingAxioms: ['Axiom 1', 'Axiom 2'],
    constraintSet: ['Constraint 1', 'Constraint 2', 'Constraint 3'],
    keyInstitutions: ['Institution 1', 'Institution 2'],
    settingScale: 'LOCAL',
    branchingPosture: 'RECONVERGE',
    stateComplexity: 'MEDIUM',
  };
}

export function createConceptScoresFixture(): ConceptDimensionScores {
  return {
    hookStrength: 4,
    conflictEngine: 4,
    agencyBreadth: 3,
    noveltyLeverage: 3,
    branchingFitness: 4,
    llmFeasibility: 4,
  };
}

export function createEvaluatedConceptFixture(index = 1): EvaluatedConcept {
  return {
    concept: createConceptSpecFixture(index),
    scores: createConceptScoresFixture(),
    overallScore: 80,
    strengths: [`Strength ${index}`],
    weaknesses: [`Weakness ${index}`],
    tradeoffSummary: `Tradeoff ${index}`,
  };
}

export function createConceptStressTestFixture(): ConceptStressTestResult {
  return {
    hardenedConcept: createConceptSpecFixture(99),
    driftRisks: [
      {
        risk: 'Memory economy drifts into omnipotence',
        mitigation: 'Cap memory transfer per chapter',
        mitigationType: 'STATE_CONSTRAINT',
      },
    ],
    playerBreaks: [
      {
        scenario: 'Player hoards black-market memories',
        handling: 'Institution freezes transactions above quota',
        constraintUsed: 'Constraint 1',
      },
    ],
    rawResponse: 'raw-stress',
  };
}

export function createConceptSeedInputFixture(): ConceptSeedInput {
  return {
    genreVibes: 'dark fantasy',
    moodKeywords: 'tense, melancholic',
    contentPreferences: 'no romance subplot',
    thematicInterests: 'identity and power',
    sparkLine: 'What if memory could be taxed?',
    apiKey: 'valid-key-12345',
  };
}

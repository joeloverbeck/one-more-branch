import type {
  ConceptDimensionScores,
  ConceptSeedInput,
  ConceptSpec,
  ConceptVerification,
  ScoredConcept,
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
    conflictType: 'PERSON_VS_SOCIETY',
    pressureSource: `Pressure ${index}`,
    stakesPersonal: `Personal stakes ${index}`,
    stakesSystemic: `Systemic stakes ${index}`,
    deadlineMechanism: `Deadline ${index}`,
    settingAxioms: ['Axiom 1', 'Axiom 2'],
    constraintSet: ['Constraint 1', 'Constraint 2', 'Constraint 3'],
    keyInstitutions: ['Institution 1', 'Institution 2'],
    settingScale: 'LOCAL',
    branchingPosture: 'RECONVERGE',
    whatIfQuestion: `What if question ${index}?`,
    ironicTwist: `Ironic twist ${index}.`,
    playerFantasy: `Player fantasy ${index}.`,
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
    passes: true,
    strengths: [`Strength ${index}`],
    weaknesses: [`Weakness ${index}`],
    tradeoffSummary: `Tradeoff ${index}`,
  };
}

export function createScoredConceptFixture(index = 1): ScoredConcept {
  return {
    concept: createConceptSpecFixture(index),
    scores: createConceptScoresFixture(),
    scoreEvidence: {
      hookStrength: [`Hook evidence ${index}`],
      conflictEngine: [`Conflict evidence ${index}`],
      agencyBreadth: [`Agency evidence ${index}`],
      noveltyLeverage: [`Novelty evidence ${index}`],
      branchingFitness: [`Branching evidence ${index}`],
      llmFeasibility: [`Feasibility evidence ${index}`],
    },
    overallScore: 80,
    passes: true,
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

export function createConceptVerificationFixture(index = 1): ConceptVerification {
  return {
    signatureScenario: `Signature scenario for concept ${index}`,
    escalatingSetpieces: [
      `Setpiece 1 for concept ${index}`,
      `Setpiece 2 for concept ${index}`,
      `Setpiece 3 for concept ${index}`,
      `Setpiece 4 for concept ${index}`,
      `Setpiece 5 for concept ${index}`,
      `Setpiece 6 for concept ${index}`,
    ],
    inevitabilityStatement: `Given this premise, X must happen for concept ${index}`,
    loadBearingCheck: {
      passes: true,
      reasoning: `Concept ${index} is load-bearing because its differentiator is unique`,
      genericCollapse: `Without the differentiator, concept ${index} becomes a generic genre story`,
    },
    conceptIntegrityScore: 85,
  };
}

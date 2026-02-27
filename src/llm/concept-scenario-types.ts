export interface ConceptScenarioAnalysis {
  readonly conceptId: string;
  readonly escalatingSetpieces: readonly string[];
  readonly setpieceCausalChainBroken: boolean;
  readonly setpieceCausalLinks: readonly string[];
  readonly conceptIntegrityScore: number;
}

export interface ConceptScenarioResult {
  readonly scenarioAnalyses: readonly ConceptScenarioAnalysis[];
  readonly rawResponse: string;
}

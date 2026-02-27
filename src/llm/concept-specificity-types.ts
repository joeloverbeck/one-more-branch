import type { KernelFidelityCheck, LoadBearingCheck } from '../models/concept-generator.js';

export interface ConceptSpecificityAnalysis {
  readonly conceptId: string;
  readonly signatureScenario: string;
  readonly loglineCompressible: boolean;
  readonly logline: string;
  readonly premisePromises: readonly string[];
  readonly inevitabilityStatement: string;
  readonly loadBearingCheck: LoadBearingCheck;
  readonly kernelFidelityCheck: KernelFidelityCheck;
}

export interface ConceptSpecificityResult {
  readonly specificityAnalyses: readonly ConceptSpecificityAnalysis[];
  readonly rawResponse: string;
}

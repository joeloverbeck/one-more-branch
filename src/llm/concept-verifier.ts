import type {
  ConceptVerification,
  ConceptVerificationResult,
  ConceptVerifierContext,
  KernelFidelityCheck,
  LoadBearingCheck,
} from '../models/index.js';
import { CONCEPT_VERIFICATION_CONSTRAINTS as VERIFICATION_CONSTRAINTS } from '../models/index.js';
import { runTwoPhaseLlmStage } from './llm-stage-runner.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { buildConceptSpecificityPrompt } from './prompts/concept-specificity-prompt.js';
import { buildConceptScenarioPrompt } from './prompts/concept-scenario-prompt.js';
import { CONCEPT_SPECIFICITY_SCHEMA } from './schemas/concept-specificity-schema.js';
import { CONCEPT_SCENARIO_SCHEMA } from './schemas/concept-scenario-schema.js';
import type { ConceptSpecificityAnalysis } from './concept-specificity-types.js';
import type { ConceptScenarioAnalysis } from './concept-scenario-types.js';

function requireNonEmptyString(value: unknown, fieldName: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.trim();
}

function requireBoolean(value: unknown, fieldName: string, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function requireConceptId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid conceptId`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.trim();
}

function getConceptId(index: number): string {
  return `concept_${index + 1}`;
}

function ensureExactIdCoverage(
  parsedConceptIds: readonly string[],
  expectedConceptIds: readonly string[],
  label: string,
): void {
  if (parsedConceptIds.length !== expectedConceptIds.length) {
    throw new LLMError(
      `${label} must include exactly ${expectedConceptIds.length} items (received: ${parsedConceptIds.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const expected = new Set(expectedConceptIds);
  const received = new Set(parsedConceptIds);

  if (received.size !== parsedConceptIds.length) {
    throw new LLMError(
      `${label} contains duplicate conceptIds`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (expected.size !== received.size || [...expected].some((key) => !received.has(key))) {
    throw new LLMError(
      `${label} concept set does not match requested candidates`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
}

function parseLoadBearingCheck(value: unknown, label: string): LoadBearingCheck {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} loadBearingCheck must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  if (typeof data['passes'] !== 'boolean') {
    throw new LLMError(`${label} loadBearingCheck has invalid passes`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return {
    passes: data['passes'],
    reasoning: requireNonEmptyString(data['reasoning'], 'reasoning', `${label} loadBearingCheck`),
    genericCollapse: requireNonEmptyString(
      data['genericCollapse'],
      'genericCollapse',
      `${label} loadBearingCheck`,
    ),
  };
}

function parseKernelFidelityCheck(value: unknown, label: string): KernelFidelityCheck {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(
      `${label} kernelFidelityCheck must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = value as Record<string, unknown>;
  if (typeof data['passes'] !== 'boolean') {
    throw new LLMError(
      `${label} kernelFidelityCheck has invalid passes`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    passes: data['passes'],
    reasoning: requireNonEmptyString(
      data['reasoning'],
      'reasoning',
      `${label} kernelFidelityCheck`,
    ),
    kernelDrift: requireNonEmptyString(
      data['kernelDrift'],
      'kernelDrift',
      `${label} kernelFidelityCheck`,
    ),
  };
}

function parseSetpieces(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(
      `${label} escalatingSetpieces must be an array`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (value.length !== VERIFICATION_CONSTRAINTS.escalatingSetpiecesCount) {
    throw new LLMError(
      `${label} escalatingSetpieces must have exactly ${VERIFICATION_CONSTRAINTS.escalatingSetpiecesCount} items (received: ${value.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return value.map((item, i) =>
    requireNonEmptyString(item, `escalatingSetpieces[${i}]`, label),
  );
}

function parsePremisePromises(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(
      `${label} premisePromises must be an array`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (
    value.length < VERIFICATION_CONSTRAINTS.premisePromisesMin ||
    value.length > VERIFICATION_CONSTRAINTS.premisePromisesMax
  ) {
    throw new LLMError(
      `${label} premisePromises must have ${VERIFICATION_CONSTRAINTS.premisePromisesMin}-${VERIFICATION_CONSTRAINTS.premisePromisesMax} items (received: ${value.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return value.map((item, index) =>
    requireNonEmptyString(item, `premisePromises[${index}]`, label),
  );
}

function parseSetpieceCausalLinks(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(
      `${label} setpieceCausalLinks must be an array`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (value.length !== VERIFICATION_CONSTRAINTS.setpieceCausalLinksCount) {
    throw new LLMError(
      `${label} setpieceCausalLinks must have exactly ${VERIFICATION_CONSTRAINTS.setpieceCausalLinksCount} items (received: ${value.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return value.map((item, index) =>
    requireNonEmptyString(item, `setpieceCausalLinks[${index}]`, label),
  );
}

function parseSpecificityAnalysis(value: unknown, index: number): ConceptSpecificityAnalysis {
  const label = `Specificity ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const conceptId = requireConceptId(data['conceptId'], label);
  const logline = requireNonEmptyString(data['logline'], 'logline', label);

  if (countWords(logline) > VERIFICATION_CONSTRAINTS.loglineMaxWords) {
    throw new LLMError(
      `${label} logline must be ${VERIFICATION_CONSTRAINTS.loglineMaxWords} words or fewer`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    conceptId,
    signatureScenario: requireNonEmptyString(
      data['signatureScenario'],
      'signatureScenario',
      label,
    ),
    loglineCompressible: requireBoolean(data['loglineCompressible'], 'loglineCompressible', label),
    logline,
    premisePromises: parsePremisePromises(data['premisePromises'], label),
    inevitabilityStatement: requireNonEmptyString(
      data['inevitabilityStatement'],
      'inevitabilityStatement',
      label,
    ),
    loadBearingCheck: parseLoadBearingCheck(data['loadBearingCheck'], label),
    kernelFidelityCheck: parseKernelFidelityCheck(data['kernelFidelityCheck'], label),
  };
}

function parseScenarioAnalysis(value: unknown, index: number): ConceptScenarioAnalysis {
  const label = `Scenario ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
  const conceptId = requireConceptId(data['conceptId'], label);
  const score = data['conceptIntegrityScore'];
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw new LLMError(
      `${label} has invalid conceptIntegrityScore`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    conceptId,
    escalatingSetpieces: parseSetpieces(data['escalatingSetpieces'], label),
    setpieceCausalChainBroken: requireBoolean(
      data['setpieceCausalChainBroken'],
      'setpieceCausalChainBroken',
      label,
    ),
    setpieceCausalLinks: parseSetpieceCausalLinks(data['setpieceCausalLinks'], label),
    conceptIntegrityScore: clampedScore,
  };
}

export function parseConceptSpecificityResponse(
  parsed: unknown,
  expectedConceptIds: readonly string[],
): readonly ConceptSpecificityAnalysis[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Concept specificity response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['specificityAnalyses'])) {
    throw new LLMError(
      'Concept specificity response missing specificityAnalyses array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const analyses = data['specificityAnalyses'].map((item, index) =>
    parseSpecificityAnalysis(item, index),
  );

  ensureExactIdCoverage(
    analyses.map((a) => a.conceptId),
    expectedConceptIds,
    'Concept specificity response',
  );

  return analyses;
}

export function parseConceptScenarioResponse(
  parsed: unknown,
  expectedConceptIds: readonly string[],
): readonly ConceptScenarioAnalysis[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Concept scenario response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['scenarioAnalyses'])) {
    throw new LLMError(
      'Concept scenario response missing scenarioAnalyses array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const analyses = data['scenarioAnalyses'].map((item, index) =>
    parseScenarioAnalysis(item, index),
  );

  ensureExactIdCoverage(
    analyses.map((a) => a.conceptId),
    expectedConceptIds,
    'Concept scenario response',
  );

  return analyses;
}

function combineVerifications(
  specificityAnalyses: readonly ConceptSpecificityAnalysis[],
  scenarioAnalyses: readonly ConceptScenarioAnalysis[],
): readonly ConceptVerification[] {
  const scenarioByConceptId = new Map(scenarioAnalyses.map((s) => [s.conceptId, s]));

  return specificityAnalyses.map((specificity) => {
    const scenario = scenarioByConceptId.get(specificity.conceptId);
    if (!scenario) {
      throw new LLMError(
        `Scenario analysis missing for ${specificity.conceptId}`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    return {
      conceptId: specificity.conceptId,
      signatureScenario: specificity.signatureScenario,
      loglineCompressible: specificity.loglineCompressible,
      logline: specificity.logline,
      premisePromises: specificity.premisePromises,
      escalatingSetpieces: scenario.escalatingSetpieces,
      setpieceCausalChainBroken: scenario.setpieceCausalChainBroken,
      setpieceCausalLinks: scenario.setpieceCausalLinks,
      inevitabilityStatement: specificity.inevitabilityStatement,
      loadBearingCheck: specificity.loadBearingCheck,
      kernelFidelityCheck: specificity.kernelFidelityCheck,
      conceptIntegrityScore: scenario.conceptIntegrityScore,
    };
  });
}

export async function verifyConcepts(
  context: ConceptVerifierContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptVerificationResult> {
  const expectedConceptIds = context.evaluatedConcepts.map((_, index) => getConceptId(index));

  const result = await runTwoPhaseLlmStage<
    readonly ConceptSpecificityAnalysis[],
    readonly ConceptScenarioAnalysis[],
    ConceptVerificationResult
  >({
    firstStage: {
      stageModel: 'conceptSpecificity',
      promptType: 'conceptSpecificity',
      apiKey,
      options,
      schema: CONCEPT_SPECIFICITY_SCHEMA,
      messages: buildConceptSpecificityPrompt(context),
      parseResponse: (parsed) => parseConceptSpecificityResponse(parsed, expectedConceptIds),
    },
    secondStage: (specificityAnalyses) => ({
      stageModel: 'conceptScenario',
      promptType: 'conceptScenario',
      apiKey,
      options,
      schema: CONCEPT_SCENARIO_SCHEMA,
      messages: buildConceptScenarioPrompt(context, specificityAnalyses),
      parseResponse: (
        parsed,
      ): readonly ConceptScenarioAnalysis[] => parseConceptScenarioResponse(parsed, expectedConceptIds),
    }),
    combineResult: ({
      firstStageParsed,
      firstStageRawResponse,
      secondStageParsed,
      secondStageRawResponse,
    }) => ({
      verifications: combineVerifications(firstStageParsed, secondStageParsed),
      rawResponse: `${firstStageRawResponse}\n---\n${secondStageRawResponse}`,
    }),
  });

  return result;
}

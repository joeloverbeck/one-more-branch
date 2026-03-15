import type {
  ConceptVerification,
  EvaluatedConcept,
  KernelFidelityCheck,
  LoadBearingCheck,
} from '../models/index.js';
import { CONCEPT_VERIFICATION_CONSTRAINTS as VERIFICATION_CONSTRAINTS } from '../models/index.js';
import type { StoryKernel } from '../models/story-kernel.js';
import { runTwoPhaseLlmStage } from './llm-stage-runner.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { buildSingleConceptSpecificityPrompt } from './prompts/concept-single-specificity-prompt.js';
import { buildSingleConceptScenarioPrompt } from './prompts/concept-single-scenario-prompt.js';
import { CONCEPT_SINGLE_SPECIFICITY_SCHEMA } from './schemas/concept-single-specificity-schema.js';
import { CONCEPT_SINGLE_SCENARIO_SCHEMA } from './schemas/concept-single-scenario-schema.js';

interface SingleSpecificityAnalysis {
  readonly signatureScenario: string;
  readonly loglineCompressible: boolean;
  readonly logline: string;
  readonly premisePromises: readonly string[];
  readonly inevitabilityStatement: string;
  readonly loadBearingCheck: LoadBearingCheck;
  readonly kernelFidelityCheck: KernelFidelityCheck;
}

interface SingleScenarioAnalysis {
  readonly escalatingSetpieces: readonly string[];
  readonly setpieceCausalChainBroken: boolean;
  readonly setpieceCausalLinks: readonly string[];
  readonly conceptIntegrityScore: number;
}

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

function parseLoadBearingCheck(value: unknown, label: string): LoadBearingCheck {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} loadBearingCheck must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const data = value as Record<string, unknown>;
  return {
    passes: requireBoolean(data['passes'], 'passes', `${label} loadBearingCheck`),
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
  return {
    passes: requireBoolean(data['passes'], 'passes', `${label} kernelFidelityCheck`),
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

function parseStringArray(
  value: unknown,
  fieldName: string,
  label: string,
  min: number,
  max: number,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(`${label} ${fieldName} must be an array`, 'STRUCTURE_PARSE_ERROR', true);
  }
  if (value.length < min || value.length > max) {
    throw new LLMError(
      `${label} ${fieldName} must have ${min}-${max} items (received: ${value.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  return value.map((item, i) => requireNonEmptyString(item, `${fieldName}[${i}]`, label));
}

export function parseSingleSpecificityResponse(parsed: unknown): SingleSpecificityAnalysis {
  const label = 'Single specificity';
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(`${label} response must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const data = parsed as Record<string, unknown>;
  if (!data['specificityAnalysis'] || typeof data['specificityAnalysis'] !== 'object') {
    throw new LLMError(
      `${label} response missing specificityAnalysis`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  const sa = data['specificityAnalysis'] as Record<string, unknown>;
  const logline = requireNonEmptyString(sa['logline'], 'logline', label);
  if (countWords(logline) > VERIFICATION_CONSTRAINTS.loglineMaxWords) {
    throw new LLMError(
      `${label} logline must be ${VERIFICATION_CONSTRAINTS.loglineMaxWords} words or fewer`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    signatureScenario: requireNonEmptyString(sa['signatureScenario'], 'signatureScenario', label),
    loglineCompressible: requireBoolean(sa['loglineCompressible'], 'loglineCompressible', label),
    logline,
    premisePromises: parseStringArray(
      sa['premisePromises'],
      'premisePromises',
      label,
      VERIFICATION_CONSTRAINTS.premisePromisesMin,
      VERIFICATION_CONSTRAINTS.premisePromisesMax,
    ),
    inevitabilityStatement: requireNonEmptyString(
      sa['inevitabilityStatement'],
      'inevitabilityStatement',
      label,
    ),
    loadBearingCheck: parseLoadBearingCheck(sa['loadBearingCheck'], label),
    kernelFidelityCheck: parseKernelFidelityCheck(sa['kernelFidelityCheck'], label),
  };
}

export function parseSingleScenarioResponse(parsed: unknown): SingleScenarioAnalysis {
  const label = 'Single scenario';
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(`${label} response must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const data = parsed as Record<string, unknown>;
  if (!data['scenarioAnalysis'] || typeof data['scenarioAnalysis'] !== 'object') {
    throw new LLMError(
      `${label} response missing scenarioAnalysis`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  const sa = data['scenarioAnalysis'] as Record<string, unknown>;
  const score = sa['conceptIntegrityScore'];
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw new LLMError(
      `${label} has invalid conceptIntegrityScore`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    escalatingSetpieces: parseStringArray(
      sa['escalatingSetpieces'],
      'escalatingSetpieces',
      label,
      VERIFICATION_CONSTRAINTS.escalatingSetpiecesMin,
      VERIFICATION_CONSTRAINTS.escalatingSetpiecesMax,
    ),
    setpieceCausalChainBroken: requireBoolean(
      sa['setpieceCausalChainBroken'],
      'setpieceCausalChainBroken',
      label,
    ),
    setpieceCausalLinks: parseStringArray(
      sa['setpieceCausalLinks'],
      'setpieceCausalLinks',
      label,
      VERIFICATION_CONSTRAINTS.setpieceCausalLinksMin,
      VERIFICATION_CONSTRAINTS.setpieceCausalLinksMax,
    ),
    conceptIntegrityScore: Math.max(0, Math.min(100, Math.round(score))),
  };
}

export async function verifySingleConcept(
  evaluated: EvaluatedConcept,
  kernel: StoryKernel,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptVerification> {
  return runTwoPhaseLlmStage<
    SingleSpecificityAnalysis,
    SingleScenarioAnalysis,
    ConceptVerification
  >({
    firstStage: {
      stageModel: 'conceptSpecificity',
      promptType: 'conceptSpecificity',
      apiKey,
      options,
      schema: CONCEPT_SINGLE_SPECIFICITY_SCHEMA,
      messages: buildSingleConceptSpecificityPrompt(evaluated, kernel),
      parseResponse: (parsed) => parseSingleSpecificityResponse(parsed),
      allowJsonRepair: false,
    },
    secondStage: (specificityAnalysis) => ({
      stageModel: 'conceptScenario',
      promptType: 'conceptScenario',
      apiKey,
      options,
      schema: CONCEPT_SINGLE_SCENARIO_SCHEMA,
      messages: buildSingleConceptScenarioPrompt(evaluated, kernel, specificityAnalysis),
      parseResponse: (parsed) => parseSingleScenarioResponse(parsed),
      allowJsonRepair: false,
    }),
    combineResult: ({ firstStageParsed, secondStageParsed }) => ({
      conceptId: 'single',
      signatureScenario: firstStageParsed.signatureScenario,
      loglineCompressible: firstStageParsed.loglineCompressible,
      logline: firstStageParsed.logline,
      premisePromises: firstStageParsed.premisePromises,
      setpieceCausalChainBroken: secondStageParsed.setpieceCausalChainBroken,
      inevitabilityStatement: firstStageParsed.inevitabilityStatement,
      loadBearingCheck: firstStageParsed.loadBearingCheck,
      kernelFidelityCheck: firstStageParsed.kernelFidelityCheck,
      conceptIntegrityScore: secondStageParsed.conceptIntegrityScore,
    }),
  });
}

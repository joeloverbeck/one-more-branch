import type {
  ConceptVerification,
  ConceptVerificationResult,
  ConceptVerifierContext,
  KernelFidelityCheck,
  LoadBearingCheck,
} from '../models/index.js';
import { runLlmStage } from './llm-stage-runner.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { buildConceptVerifierPrompt } from './prompts/concept-verifier-prompt.js';
import { CONCEPT_VERIFIER_SCHEMA } from './schemas/concept-verifier-schema.js';

function requireNonEmptyString(value: unknown, fieldName: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.trim();
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
      `${label} must include exactly ${expectedConceptIds.length} verifications (received: ${parsedConceptIds.length})`,
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

  if (value.length !== 6) {
    throw new LLMError(
      `${label} escalatingSetpieces must have exactly 6 items (received: ${value.length})`,
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

  if (value.length < 3 || value.length > 5) {
    throw new LLMError(
      `${label} premisePromises must have 3-5 items (received: ${value.length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return value.map((item, index) =>
    requireNonEmptyString(item, `premisePromises[${index}]`, label),
  );
}

function parseConceptVerification(value: unknown, index: number): ConceptVerification {
  const label = `Verification ${index + 1}`;

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
    signatureScenario: requireNonEmptyString(
      data['signatureScenario'],
      'signatureScenario',
      label,
    ),
    premisePromises: parsePremisePromises(data['premisePromises'], label),
    escalatingSetpieces: parseSetpieces(data['escalatingSetpieces'], label),
    inevitabilityStatement: requireNonEmptyString(
      data['inevitabilityStatement'],
      'inevitabilityStatement',
      label,
    ),
    loadBearingCheck: parseLoadBearingCheck(data['loadBearingCheck'], label),
    kernelFidelityCheck: parseKernelFidelityCheck(data['kernelFidelityCheck'], label),
    conceptIntegrityScore: clampedScore,
  };
}

export function parseConceptVerificationResponse(
  parsed: unknown,
  expectedConceptIds: readonly string[],
): readonly ConceptVerification[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Concept verification response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['verifications'])) {
    throw new LLMError(
      'Concept verification response missing verifications array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const verifications = data['verifications'].map((item, index) =>
    parseConceptVerification(item, index),
  );

  ensureExactIdCoverage(
    verifications.map((v) => v.conceptId),
    expectedConceptIds,
    'Concept verification response',
  );

  return verifications;
}

export async function verifyConcepts(
  context: ConceptVerifierContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptVerificationResult> {
  const expectedConceptIds = context.evaluatedConcepts.map((_, index) => getConceptId(index));
  const messages = buildConceptVerifierPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptVerifier',
    promptType: 'conceptVerifier',
    apiKey,
    options,
    schema: CONCEPT_VERIFIER_SCHEMA,
    messages,
    parseResponse: (parsed) => parseConceptVerificationResponse(parsed, expectedConceptIds),
  });

  return {
    verifications: result.parsed,
    rawResponse: result.rawResponse,
  };
}

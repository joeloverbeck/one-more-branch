import type {
  ConceptVerification,
  ConceptVerificationResult,
  ConceptVerifierContext,
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

function parseConceptVerification(value: unknown, index: number): ConceptVerification {
  const label = `Verification ${index + 1}`;

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = value as Record<string, unknown>;
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
    signatureScenario: requireNonEmptyString(
      data['signatureScenario'],
      'signatureScenario',
      label,
    ),
    escalatingSetpieces: parseSetpieces(data['escalatingSetpieces'], label),
    inevitabilityStatement: requireNonEmptyString(
      data['inevitabilityStatement'],
      'inevitabilityStatement',
      label,
    ),
    loadBearingCheck: parseLoadBearingCheck(data['loadBearingCheck'], label),
    conceptIntegrityScore: clampedScore,
  };
}

export function parseConceptVerificationResponse(
  parsed: unknown,
  expectedCount: number,
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

  if (data['verifications'].length !== expectedCount) {
    throw new LLMError(
      `Concept verification response must have exactly ${expectedCount} verifications (received: ${data['verifications'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['verifications'].map((item, index) => parseConceptVerification(item, index));
}

export async function verifyConcepts(
  context: ConceptVerifierContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptVerificationResult> {
  const expectedCount = context.evaluatedConcepts.length;
  const messages = buildConceptVerifierPrompt(context);
  const result = await runLlmStage({
    stageModel: 'conceptVerifier',
    promptType: 'conceptVerifier',
    apiKey,
    options,
    schema: CONCEPT_VERIFIER_SCHEMA,
    messages,
    parseResponse: (parsed) => parseConceptVerificationResponse(parsed, expectedCount),
  });

  return {
    verifications: result.parsed,
    rawResponse: result.rawResponse,
  };
}

import { isDriftRiskMitigationType, type ConceptStressTestResult, type ConceptStressTesterContext } from '../models/index.js';
import { runConceptStage } from './concept-stage-runner.js';
import { parseConceptSpec } from './concept-spec-parser.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { buildConceptStressTesterPrompt } from './prompts/concept-stress-tester-prompt.js';
import { CONCEPT_STRESS_TEST_SCHEMA } from './schemas/concept-stress-tester-schema.js';

function requireNonEmptyString(value: unknown, fieldName: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} has invalid ${fieldName}`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.trim();
}

function parseDriftRisks(value: unknown): ConceptStressTestResult['driftRisks'] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new LLMError('Concept stress-test response must include non-empty driftRisks', 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.map((item, index) => {
    const label = `Drift risk ${index + 1}`;
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
    }

    const data = item as Record<string, unknown>;
    const mitigationType = data['mitigationType'];
    if (!isDriftRiskMitigationType(mitigationType)) {
      throw new LLMError(`${label} has invalid mitigationType`, 'STRUCTURE_PARSE_ERROR', true);
    }

    return {
      risk: requireNonEmptyString(data['risk'], 'risk', label),
      mitigation: requireNonEmptyString(data['mitigation'], 'mitigation', label),
      mitigationType,
    };
  });
}

function parsePlayerBreaks(value: unknown): ConceptStressTestResult['playerBreaks'] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new LLMError(
      'Concept stress-test response must include non-empty playerBreaks',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return value.map((item, index) => {
    const label = `Player break ${index + 1}`;
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
    }

    const data = item as Record<string, unknown>;
    return {
      scenario: requireNonEmptyString(data['scenario'], 'scenario', label),
      handling: requireNonEmptyString(data['handling'], 'handling', label),
      constraintUsed: requireNonEmptyString(data['constraintUsed'], 'constraintUsed', label),
    };
  });
}

export function parseConceptStressTestResponse(parsed: unknown): Omit<ConceptStressTestResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Concept stress-test response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;

  return {
    hardenedConcept: parseConceptSpec(data['hardenedConcept'], 0, 'Hardened concept'),
    driftRisks: parseDriftRisks(data['driftRisks']),
    playerBreaks: parsePlayerBreaks(data['playerBreaks']),
  };
}

export async function stressTestConcept(
  context: ConceptStressTesterContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<ConceptStressTestResult> {
  const messages = buildConceptStressTesterPrompt(context);
  const result = await runConceptStage({
    stageModel: 'conceptStressTester',
    promptType: 'conceptStressTester',
    apiKey,
    options,
    schema: CONCEPT_STRESS_TEST_SCHEMA,
    messages,
    parseResponse: parseConceptStressTestResponse,
  });

  return {
    ...result.parsed,
    rawResponse: result.rawResponse,
  };
}

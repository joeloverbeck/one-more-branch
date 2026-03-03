import { z } from 'zod';
import type { StateAccountantGenerationResult } from '../accountant-types.js';
import { LLMError } from '../llm-client-types.js';
import { repairAccountantIdFieldMismatches } from '../validation/accountant-id-repair.js';
import { repairAccountantLegacyShapeMismatches } from '../validation/accountant-shape-repair.js';
import { normalizeStateIntents } from './shared-state-intent-normalizer.js';
import { StateAccountantResultSchema } from './state-accountant-validation-schema.js';

const THREAD_TAXONOMY_RULE_KEY = 'planner.thread_taxonomy.invalid_enum';

function hasThreadTaxonomyPath(path: readonly PropertyKey[]): boolean {
  if (path[0] !== 'stateIntents' || path[1] !== 'threads') {
    return false;
  }

  const last = path[path.length - 1];
  if (last !== 'threadType' && last !== 'urgency') {
    return false;
  }

  return path[2] === 'add';
}

function resolveRuleKey(issue: z.ZodIssue): unknown {
  const explicitRuleKey =
    typeof issue === 'object' && issue !== null && 'params' in issue
      ? (issue as { params?: Record<string, unknown> }).params?.['ruleKey']
      : undefined;
  if (explicitRuleKey !== undefined) {
    return explicitRuleKey;
  }

  if (issue.code === 'invalid_value' && hasThreadTaxonomyPath(issue.path)) {
    return THREAD_TAXONOMY_RULE_KEY;
  }

  return undefined;
}

function toValidationIssues(error: unknown): Array<{
  path: string;
  code: string;
  message: string;
  ruleKey?: unknown;
}> {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => ({
      path: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
      ruleKey: resolveRuleKey(issue),
    }));
  }

  if (error instanceof Error) {
    return [
      {
        path: '',
        code: 'custom',
        message: error.message,
      },
    ];
  }

  return [
    {
      path: '',
      code: 'custom',
      message: 'Unknown validation error',
    },
  ];
}

function toAccountantValidationError(error: unknown, rawResponse: string): LLMError {
  const validationIssues = toValidationIssues(error);
  const message =
    error instanceof Error
      ? error.message
      : 'Failed to validate state accountant structured response';

  return new LLMError(message, 'VALIDATION_ERROR', false, {
    rawResponse,
    validationIssues,
    ruleKeys: [...new Set(validationIssues.map((issue) => issue.ruleKey).filter(Boolean))],
  });
}

interface AccountantRepairSummary {
  readonly idRepairsApplied: number;
  readonly shapeRepairsApplied: number;
  readonly idFiltered: readonly { field: string; value: string; expectedPrefix: string }[];
  readonly shapeRepairedEntries: readonly { index: number; fromFields: readonly string[] }[];
}

export function validateStateAccountantResponse(
  rawJson: unknown,
  rawResponse: string
): StateAccountantGenerationResult {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true, {
        rawResponse,
      });
    }
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    !('stateIntents' in (parsed as Record<string, unknown>)) &&
    'currentLocation' in (parsed as Record<string, unknown>)
  ) {
    console.warn(
      '[accountant-wrapper-repair] LLM returned flat response without stateIntents wrapper, auto-wrapping'
    );
    parsed = { stateIntents: parsed };
  }

  const { repairedJson: idRepairedJson, filteredIds } = repairAccountantIdFieldMismatches(parsed);
  if (filteredIds.length > 0) {
    console.warn(
      '[accountant-id-repair] Filtered mismatched IDs:',
      filteredIds.map((f) => `${f.field}: ${f.value} (expected ${f.expectedPrefix}*)`).join(', ')
    );
  }

  const { repairedJson, repairedEntries } = repairAccountantLegacyShapeMismatches(idRepairedJson);
  if (repairedEntries.length > 0) {
    console.warn(
      '[accountant-shape-repair] Repaired legacy characterState.add entries:',
      repairedEntries.map((entry) => `index ${entry.index}: ${entry.fromFields.join('+')}`).join(', ')
    );
  }

  const repairSummary: AccountantRepairSummary = {
    idRepairsApplied: filteredIds.length,
    shapeRepairsApplied: repairedEntries.length,
    idFiltered: filteredIds.map((item) => ({
      field: item.field,
      value: item.value,
      expectedPrefix: item.expectedPrefix,
    })),
    shapeRepairedEntries: repairedEntries.map((entry) => ({
      index: entry.index,
      fromFields: [...entry.fromFields],
    })),
  };

  let validated: z.infer<typeof StateAccountantResultSchema>;
  try {
    validated = StateAccountantResultSchema.parse(repairedJson);
  } catch (error) {
    const validationError = toAccountantValidationError(error, rawResponse);
    if (repairSummary.idRepairsApplied > 0 || repairSummary.shapeRepairsApplied > 0) {
      throw new LLMError(validationError.message, validationError.code, validationError.retryable, {
        ...(validationError.context ?? {}),
        repairSummary,
      });
    }
    throw validationError;
  }

  try {
    return {
      stateIntents: normalizeStateIntents(validated.stateIntents),
      rawResponse,
    };
  } catch (error) {
    const validationError = toAccountantValidationError(error, rawResponse);
    if (repairSummary.idRepairsApplied > 0 || repairSummary.shapeRepairsApplied > 0) {
      throw new LLMError(validationError.message, validationError.code, validationError.retryable, {
        ...(validationError.context ?? {}),
        repairSummary,
      });
    }
    throw validationError;
  }
}

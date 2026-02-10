import { ZodError, type ZodIssue } from 'zod';
import type { WriterResult } from '../types.js';
import {
  STATE_ID_PREFIXES,
  STATE_ID_RULE_KEYS,
  validateIdOnlyField,
  validateNoIdLikeAdditions,
} from './state-id-prefixes.js';

export const WRITER_OUTPUT_RULE_KEYS = {
  DUPLICATE_CHOICE_PAIR: 'writer_output.choice_pair.duplicate',
  PROTAGONIST_AFFECT_REQUIRED: 'writer_output.protagonist_affect.required_non_empty',
  SCHEMA_VALIDATION_ERROR: 'writer_output.schema.validation_error',
} as const;

export type WriterOutputRuleKey =
  | (typeof WRITER_OUTPUT_RULE_KEYS)[keyof typeof WRITER_OUTPUT_RULE_KEYS]
  | (typeof STATE_ID_RULE_KEYS)[keyof typeof STATE_ID_RULE_KEYS];

export interface WriterOutputValidationIssue {
  readonly ruleKey: WriterOutputRuleKey;
  readonly fieldPath: string;
  readonly message: string;
  readonly value?: string;
  readonly expectedPrefix?: string;
}

export class WriterOutputValidationError extends Error {
  constructor(public readonly issues: readonly WriterOutputValidationIssue[]) {
    super(`Deterministic writer output validation failed (${issues.length} issue(s))`);
    this.name = 'WriterOutputValidationError';
  }
}

function addIssue(
  issues: WriterOutputValidationIssue[],
  ruleKey: WriterOutputRuleKey,
  fieldPath: string,
  message: string,
  value?: string,
  expectedPrefix?: string,
): void {
  issues.push({ ruleKey, fieldPath, message, value, expectedPrefix });
}

function addPrefixedIssues(
  issues: WriterOutputValidationIssue[],
  field: string,
  addPath: (index: number) => string,
  prefixedIssues: ReturnType<typeof validateIdOnlyField>,
): void {
  for (const issue of prefixedIssues) {
    addIssue(
      issues,
      issue.ruleKey,
      addPath(issue.index),
      `Validation failed for ${field}`,
      issue.value,
      issue.expectedPrefix,
    );
  }
}

function validateProtagonistAffect(result: WriterResult, issues: WriterOutputValidationIssue[]): void {
  const requiredFields = [
    { key: 'primaryEmotion', value: result.protagonistAffect.primaryEmotion },
    { key: 'primaryCause', value: result.protagonistAffect.primaryCause },
    { key: 'dominantMotivation', value: result.protagonistAffect.dominantMotivation },
  ] as const;

  for (const field of requiredFields) {
    if (!field.value.trim()) {
      addIssue(
        issues,
        WRITER_OUTPUT_RULE_KEYS.PROTAGONIST_AFFECT_REQUIRED,
        `protagonistAffect.${field.key}`,
        `${field.key} must not be empty`,
        field.value,
      );
    }
  }

  for (const [index, secondary] of result.protagonistAffect.secondaryEmotions.entries()) {
    if (!secondary.emotion.trim()) {
      addIssue(
        issues,
        WRITER_OUTPUT_RULE_KEYS.PROTAGONIST_AFFECT_REQUIRED,
        `protagonistAffect.secondaryEmotions[${index}].emotion`,
        'secondaryEmotions emotion must not be empty',
        secondary.emotion,
      );
    }
    if (!secondary.cause.trim()) {
      addIssue(
        issues,
        WRITER_OUTPUT_RULE_KEYS.PROTAGONIST_AFFECT_REQUIRED,
        `protagonistAffect.secondaryEmotions[${index}].cause`,
        'secondaryEmotions cause must not be empty',
        secondary.cause,
      );
    }
  }
}

function validateChoicePairUniqueness(result: WriterResult, issues: WriterOutputValidationIssue[]): void {
  const seenPairs = new Map<string, number>();

  result.choices.forEach((choice, index) => {
    const pairKey = `${choice.choiceType}::${choice.primaryDelta}`;
    const firstSeenIndex = seenPairs.get(pairKey);
    if (firstSeenIndex !== undefined) {
      addIssue(
        issues,
        WRITER_OUTPUT_RULE_KEYS.DUPLICATE_CHOICE_PAIR,
        `choices[${index}]`,
        `Duplicate (choiceType, primaryDelta) pair also seen at choices[${firstSeenIndex}]`,
        pairKey,
      );
      return;
    }
    seenPairs.set(pairKey, index);
  });
}

export function validateDeterministicWriterOutput(result: WriterResult): WriterOutputValidationIssue[] {
  const issues: WriterOutputValidationIssue[] = [];

  const additionChecks = [
    {
      field: 'threatsAdded',
      values: result.threatsAdded,
      path: (index: number): string => `threatsAdded[${index}]`,
    },
    {
      field: 'constraintsAdded',
      values: result.constraintsAdded,
      path: (index: number): string => `constraintsAdded[${index}]`,
    },
    {
      field: 'inventoryAdded',
      values: result.inventoryAdded,
      path: (index: number): string => `inventoryAdded[${index}]`,
    },
    {
      field: 'healthAdded',
      values: result.healthAdded,
      path: (index: number): string => `healthAdded[${index}]`,
    },
    {
      field: 'threadsAdded',
      values: result.threadsAdded.map(thread => thread.text),
      path: (index: number): string => `threadsAdded[${index}].text`,
    },
  ] as const;

  for (const check of additionChecks) {
    addPrefixedIssues(
      issues,
      check.field,
      check.path,
      validateNoIdLikeAdditions(check.values, check.field),
    );
  }

  const idOnlyChecks = [
    {
      field: 'threatsRemoved',
      values: result.threatsRemoved,
      prefix: STATE_ID_PREFIXES.threats,
      path: (index: number): string => `threatsRemoved[${index}]`,
    },
    {
      field: 'constraintsRemoved',
      values: result.constraintsRemoved,
      prefix: STATE_ID_PREFIXES.constraints,
      path: (index: number): string => `constraintsRemoved[${index}]`,
    },
    {
      field: 'threadsResolved',
      values: result.threadsResolved,
      prefix: STATE_ID_PREFIXES.threads,
      path: (index: number): string => `threadsResolved[${index}]`,
    },
    {
      field: 'inventoryRemoved',
      values: result.inventoryRemoved,
      prefix: STATE_ID_PREFIXES.inventory,
      path: (index: number): string => `inventoryRemoved[${index}]`,
    },
    {
      field: 'healthRemoved',
      values: result.healthRemoved,
      prefix: STATE_ID_PREFIXES.health,
      path: (index: number): string => `healthRemoved[${index}]`,
    },
    {
      field: 'characterStateChangesRemoved',
      values: result.characterStateChangesRemoved,
      prefix: STATE_ID_PREFIXES.characterState,
      path: (index: number): string => `characterStateChangesRemoved[${index}]`,
    },
  ] as const;

  for (const check of idOnlyChecks) {
    addPrefixedIssues(
      issues,
      check.field,
      check.path,
      validateIdOnlyField(check.values, check.field, check.prefix),
    );
  }

  validateChoicePairUniqueness(result, issues);
  validateProtagonistAffect(result, issues);

  return issues;
}

function toFieldPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return '$';
  }

  let out = '';
  path.forEach((part, index) => {
    if (typeof part === 'number') {
      out += `[${part}]`;
      return;
    }
    if (typeof part === 'symbol') {
      out += '[symbol]';
      return;
    }
    if (index === 0) {
      out += part;
      return;
    }
    out += `.${part}`;
  });

  return out;
}

function mapZodIssue(issue: ZodIssue): WriterOutputValidationIssue {
  const ruleKeyFromParams = (issue as { params?: { ruleKey?: string } }).params?.ruleKey;
  const ruleKey =
    ruleKeyFromParams && typeof ruleKeyFromParams === 'string'
      ? (ruleKeyFromParams as WriterOutputRuleKey)
      : WRITER_OUTPUT_RULE_KEYS.SCHEMA_VALIDATION_ERROR;

  return {
    ruleKey,
    fieldPath: toFieldPath(issue.path),
    message: issue.message,
  };
}

export function extractWriterValidationIssues(error: unknown): WriterOutputValidationIssue[] {
  if (error instanceof WriterOutputValidationError) {
    return [...error.issues];
  }

  if (error instanceof ZodError) {
    return error.issues.map(mapZodIssue);
  }

  return [];
}

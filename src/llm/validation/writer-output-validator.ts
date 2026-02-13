import { ZodError, type ZodIssue } from 'zod';
import type { PageWriterResult } from '../writer-types.js';

export const WRITER_OUTPUT_RULE_KEYS = {
  DUPLICATE_CHOICE_PAIR: 'writer_output.choice_pair.duplicate',
  PROTAGONIST_AFFECT_REQUIRED: 'writer_output.protagonist_affect.required_non_empty',
  SCHEMA_VALIDATION_ERROR: 'writer_output.schema.validation_error',
} as const;

export type WriterOutputRuleKey =
  (typeof WRITER_OUTPUT_RULE_KEYS)[keyof typeof WRITER_OUTPUT_RULE_KEYS];

export interface WriterOutputValidationIssue {
  readonly ruleKey: WriterOutputRuleKey;
  readonly fieldPath: string;
  readonly message: string;
  readonly value?: string;
  readonly expectedPrefix?: string;
}

export class WriterOutputValidationError extends Error {
  constructor(public readonly issues: readonly WriterOutputValidationIssue[]) {
    super(`Writer output validation failed (${issues.length} issue(s))`);
    this.name = 'WriterOutputValidationError';
  }
}

function addIssue(
  issues: WriterOutputValidationIssue[],
  ruleKey: WriterOutputRuleKey,
  fieldPath: string,
  message: string,
  value?: string,
  expectedPrefix?: string
): void {
  issues.push({ ruleKey, fieldPath, message, value, expectedPrefix });
}

function validateProtagonistAffect(
  result: PageWriterResult,
  issues: WriterOutputValidationIssue[]
): void {
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
        field.value
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
        secondary.emotion
      );
    }
    if (!secondary.cause.trim()) {
      addIssue(
        issues,
        WRITER_OUTPUT_RULE_KEYS.PROTAGONIST_AFFECT_REQUIRED,
        `protagonistAffect.secondaryEmotions[${index}].cause`,
        'secondaryEmotions cause must not be empty',
        secondary.cause
      );
    }
  }
}

function validateChoicePairUniqueness(
  result: PageWriterResult,
  issues: WriterOutputValidationIssue[]
): void {
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
        pairKey
      );
      return;
    }
    seenPairs.set(pairKey, index);
  });
}

export function validateWriterOutput(result: PageWriterResult): WriterOutputValidationIssue[] {
  const issues: WriterOutputValidationIssue[] = [];

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

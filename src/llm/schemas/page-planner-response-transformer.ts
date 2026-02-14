import { z } from 'zod';
import {
  PAGE_PLANNER_REQUIRED_FIELDS,
  PAGE_PLANNER_WRITER_BRIEF_REQUIRED_FIELDS,
} from '../page-planner-contract.js';
import type { ReducedPagePlanGenerationResult } from '../planner-types.js';
import { LLMError } from '../llm-client-types.js';
import { PagePlannerResultSchema } from './page-planner-validation-schema.js';

function normalizeStringArray(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function trimRequiredField<T extends Record<string, unknown>, TKey extends keyof T>(
  source: T,
  key: TKey
): string {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
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
      ruleKey:
        typeof issue === 'object' && issue !== null && 'params' in issue
          ? (issue as { params?: Record<string, unknown> }).params?.['ruleKey']
          : undefined,
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

function toPlannerValidationError(error: unknown, rawResponse: string): LLMError {
  const validationIssues = toValidationIssues(error);
  const message =
    error instanceof Error ? error.message : 'Failed to validate page planner structured response';

  return new LLMError(message, 'VALIDATION_ERROR', false, {
    rawResponse,
    validationIssues,
    ruleKeys: [...new Set(validationIssues.map((issue) => issue.ruleKey).filter(Boolean))],
  });
}

export function validatePagePlannerResponse(
  rawJson: unknown,
  rawResponse: string
): ReducedPagePlanGenerationResult {
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

  let validated: z.infer<typeof PagePlannerResultSchema>;
  try {
    validated = PagePlannerResultSchema.parse(parsed);
  } catch (error) {
    throw toPlannerValidationError(error, rawResponse);
  }

  try {
    const [sceneIntentField, continuityAnchorsField, writerBriefField, dramaticQuestionField] =
      PAGE_PLANNER_REQUIRED_FIELDS;
    const [openingLineDirectiveField, mustIncludeBeatsField, forbiddenRecapsField] =
      PAGE_PLANNER_WRITER_BRIEF_REQUIRED_FIELDS;

    return {
      sceneIntent: trimRequiredField(validated, sceneIntentField),
      continuityAnchors: normalizeStringArray(validated[continuityAnchorsField]),
      writerBrief: {
        openingLineDirective: trimRequiredField(
          validated[writerBriefField],
          openingLineDirectiveField
        ),
        mustIncludeBeats: normalizeStringArray(validated[writerBriefField][mustIncludeBeatsField]),
        forbiddenRecaps: normalizeStringArray(validated[writerBriefField][forbiddenRecapsField]),
      },
      dramaticQuestion: trimRequiredField(validated, dramaticQuestionField),
      choiceIntents: validated.choiceIntents.map((intent) => ({
        hook: intent.hook.trim(),
        choiceType: intent.choiceType,
        primaryDelta: intent.primaryDelta,
      })),
      rawResponse,
    };
  } catch (error) {
    throw toPlannerValidationError(error, rawResponse);
  }
}

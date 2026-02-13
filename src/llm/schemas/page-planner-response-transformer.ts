import { z } from 'zod';
import type { PagePlanGenerationResult } from '../planner-types.js';
import { LLMError } from '../llm-client-types.js';
import { PagePlannerResultSchema } from './page-planner-validation-schema.js';

const THREAD_TAXONOMY_RULE_KEY = 'planner.thread_taxonomy.invalid_enum';

function normalizeStringArray(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function hasThreadTaxonomyPath(path: readonly PropertyKey[]): boolean {
  if (path[0] !== 'stateIntents' || path[1] !== 'threads') {
    return false;
  }

  const last = path[path.length - 1];
  if (last !== 'threadType' && last !== 'urgency') {
    return false;
  }

  if (path[2] === 'add') {
    return true;
  }

  return path[2] === 'replace' && path[4] === 'add';
}

function resolvePlannerRuleKey(issue: z.ZodIssue): unknown {
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
      ruleKey: resolvePlannerRuleKey(issue),
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
): PagePlanGenerationResult {
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
    return {
      sceneIntent: validated.sceneIntent.trim(),
      continuityAnchors: normalizeStringArray(validated.continuityAnchors),
      stateIntents: {
        currentLocation: validated.stateIntents.currentLocation.trim(),
        threats: {
          add: validated.stateIntents.threats.add
            .map((entry) => ({
              text: entry.text.trim(),
              threatType: entry.threatType,
            }))
            .filter((entry) => entry.text),
          removeIds: normalizeStringArray(validated.stateIntents.threats.removeIds),
        },
        constraints: {
          add: validated.stateIntents.constraints.add
            .map((entry) => ({
              text: entry.text.trim(),
              constraintType: entry.constraintType,
            }))
            .filter((entry) => entry.text),
          removeIds: normalizeStringArray(validated.stateIntents.constraints.removeIds),
        },
        threads: {
          add: validated.stateIntents.threads.add
            .map((entry) => ({
              text: entry.text.trim(),
              threadType: entry.threadType,
              urgency: entry.urgency,
            }))
            .filter((entry) => entry.text),
          resolveIds: normalizeStringArray(validated.stateIntents.threads.resolveIds),
        },
        inventory: {
          add: normalizeStringArray(validated.stateIntents.inventory.add),
          removeIds: normalizeStringArray(validated.stateIntents.inventory.removeIds),
        },
        health: {
          add: normalizeStringArray(validated.stateIntents.health.add),
          removeIds: normalizeStringArray(validated.stateIntents.health.removeIds),
        },
        characterState: {
          add: validated.stateIntents.characterState.add
            .map((entry) => ({
              characterName: entry.characterName.trim(),
              states: normalizeStringArray(entry.states),
            }))
            .filter((entry) => entry.characterName && entry.states.length > 0),
          removeIds: normalizeStringArray(validated.stateIntents.characterState.removeIds),
        },
        canon: {
          worldAdd: normalizeStringArray(validated.stateIntents.canon.worldAdd),
          characterAdd: validated.stateIntents.canon.characterAdd
            .map((entry) => ({
              characterName: entry.characterName.trim(),
              facts: normalizeStringArray(entry.facts),
            }))
            .filter((entry) => entry.characterName && entry.facts.length > 0),
        },
      },
      writerBrief: {
        openingLineDirective: validated.writerBrief.openingLineDirective.trim(),
        mustIncludeBeats: normalizeStringArray(validated.writerBrief.mustIncludeBeats),
        forbiddenRecaps: normalizeStringArray(validated.writerBrief.forbiddenRecaps),
      },
      dramaticQuestion: validated.dramaticQuestion.trim(),
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

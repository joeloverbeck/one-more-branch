import { z } from 'zod';
import type { PagePlanGenerationResult } from '../types.js';
import { LLMError } from '../types.js';
import { PagePlannerResultSchema } from './page-planner-validation-schema.js';

function normalizeStringArray(values: readonly string[]): string[] {
  return values.map(value => value.trim()).filter(Boolean);
}

function toValidationIssues(error: unknown): Array<{
  path: string;
  code: string;
  message: string;
  ruleKey?: unknown;
}> {
  if (error instanceof z.ZodError) {
    return error.issues.map(issue => ({
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
    ruleKeys: [...new Set(validationIssues.map(issue => issue.ruleKey).filter(Boolean))],
  });
}

export function validatePagePlannerResponse(
  rawJson: unknown,
  rawResponse: string,
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
        threats: {
          add: normalizeStringArray(validated.stateIntents.threats.add),
          removeIds: normalizeStringArray(validated.stateIntents.threats.removeIds),
          replace: validated.stateIntents.threats.replace
            .map((entry) => ({
              removeId: entry.removeId.trim(),
              addText: entry.addText.trim(),
            }))
            .filter(entry => entry.removeId && entry.addText),
        },
        constraints: {
          add: normalizeStringArray(validated.stateIntents.constraints.add),
          removeIds: normalizeStringArray(validated.stateIntents.constraints.removeIds),
          replace: validated.stateIntents.constraints.replace
            .map((entry) => ({
              removeId: entry.removeId.trim(),
              addText: entry.addText.trim(),
            }))
            .filter(entry => entry.removeId && entry.addText),
        },
        threads: {
          add: validated.stateIntents.threads.add
            .map((entry) => ({
              text: entry.text.trim(),
              threadType: entry.threadType,
              urgency: entry.urgency,
            }))
            .filter(entry => entry.text),
          resolveIds: normalizeStringArray(validated.stateIntents.threads.resolveIds),
          replace: validated.stateIntents.threads.replace
            .map((entry) => ({
              resolveId: entry.resolveId.trim(),
              add: {
                text: entry.add.text.trim(),
                threadType: entry.add.threadType,
                urgency: entry.add.urgency,
              },
            }))
            .filter(entry => entry.resolveId && entry.add.text),
        },
        inventory: {
          add: normalizeStringArray(validated.stateIntents.inventory.add),
          removeIds: normalizeStringArray(validated.stateIntents.inventory.removeIds),
          replace: validated.stateIntents.inventory.replace
            .map((entry) => ({
              removeId: entry.removeId.trim(),
              addText: entry.addText.trim(),
            }))
            .filter(entry => entry.removeId && entry.addText),
        },
        health: {
          add: normalizeStringArray(validated.stateIntents.health.add),
          removeIds: normalizeStringArray(validated.stateIntents.health.removeIds),
          replace: validated.stateIntents.health.replace
            .map((entry) => ({
              removeId: entry.removeId.trim(),
              addText: entry.addText.trim(),
            }))
            .filter(entry => entry.removeId && entry.addText),
        },
        characterState: {
          add: validated.stateIntents.characterState.add
            .map((entry) => ({
              characterName: entry.characterName.trim(),
              states: normalizeStringArray(entry.states),
            }))
            .filter(entry => entry.characterName && entry.states.length > 0),
          removeIds: normalizeStringArray(validated.stateIntents.characterState.removeIds),
          replace: validated.stateIntents.characterState.replace
            .map((entry) => ({
              removeId: entry.removeId.trim(),
              add: {
                characterName: entry.add.characterName.trim(),
                states: normalizeStringArray(entry.add.states),
              },
            }))
            .filter(entry => entry.removeId && entry.add.characterName && entry.add.states.length > 0),
        },
        canon: {
          worldAdd: normalizeStringArray(validated.stateIntents.canon.worldAdd),
          characterAdd: validated.stateIntents.canon.characterAdd
            .map((entry) => ({
              characterName: entry.characterName.trim(),
              facts: normalizeStringArray(entry.facts),
            }))
            .filter(entry => entry.characterName && entry.facts.length > 0),
        },
      },
      writerBrief: {
        openingLineDirective: validated.writerBrief.openingLineDirective.trim(),
        mustIncludeBeats: normalizeStringArray(validated.writerBrief.mustIncludeBeats),
        forbiddenRecaps: normalizeStringArray(validated.writerBrief.forbiddenRecaps),
      },
      rawResponse,
    };
  } catch (error) {
    throw toPlannerValidationError(error, rawResponse);
  }
}

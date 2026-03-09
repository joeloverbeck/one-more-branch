import { CHOICE_TYPE_VALUES, PRIMARY_DELTA_VALUES } from '../../models/choice-enums.js';
import { getStageModel } from '../../config/stage-model.js';
import { logger } from '../../logging/index.js';
import { logPrompt } from '../../logging/prompt-formatter.js';
import {
  OPENROUTER_API_URL,
  readJsonResponse,
  extractResponseContent,
  parseMessageJsonContent,
} from '../http-client.js';
import {
  WRITER_CHOICE_TYPE_ENUM,
  WRITER_PRIMARY_DELTA_ENUM,
  WRITER_CHOICE_SHAPE_ENUM,
} from '../writer-contract.js';
import type { GenerationObservabilityContext } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';

const CHOICE_TYPE_SET = new Set<string>(CHOICE_TYPE_VALUES);
const PRIMARY_DELTA_SET = new Set<string>(PRIMARY_DELTA_VALUES);
const MAX_NARRATIVE_CHARS = 2000;
const MAX_SUPPLEMENTARY_CHOICES = 4;
const SUPPLEMENTARY_MAX_TOKENS = 500;

export interface ChoiceInsufficientRepairResult {
  readonly repairedJson: unknown;
  readonly repaired: boolean;
  readonly repairDetails?: string;
}

interface SupplementaryChoice {
  readonly text: string;
  readonly choiceType: string;
  readonly primaryDelta: string;
  readonly choiceSubtype?: string;
  readonly choiceShape?: string;
}

const SUPPLEMENTARY_CHOICES_SCHEMA = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'supplementary_choices',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        choices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              choiceType: { type: 'string', enum: WRITER_CHOICE_TYPE_ENUM },
              primaryDelta: { type: 'string', enum: WRITER_PRIMARY_DELTA_ENUM },
              choiceSubtype: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              choiceShape: {
                anyOf: [
                  { type: 'string', enum: WRITER_CHOICE_SHAPE_ENUM },
                  { type: 'null' },
                ],
              },
            },
            required: [
              'text',
              'choiceType',
              'primaryDelta',
              'choiceSubtype',
              'choiceShape',
            ],
            additionalProperties: false,
          },
        },
      },
      required: ['choices'],
      additionalProperties: false,
    },
  },
};

export function needsChoiceRepair(rawJson: unknown): boolean {
  if (typeof rawJson !== 'object' || rawJson === null || Array.isArray(rawJson)) {
    return false;
  }

  const source = rawJson as Record<string, unknown>;
  const choices = source['choices'];
  if (!Array.isArray(choices)) {
    return false;
  }

  return choices.length === 1;
}

function truncateNarrative(narrative: string): string {
  if (narrative.length <= MAX_NARRATIVE_CHARS) {
    return narrative;
  }
  const truncated = narrative.slice(narrative.length - MAX_NARRATIVE_CHARS);
  const firstSpace = truncated.indexOf(' ');
  return firstSpace > 0 ? '...' + truncated.slice(firstSpace) : '...' + truncated;
}

export function buildSupplementaryMessages(
  narrative: string,
  sceneSummary: string,
  existingChoices: readonly Record<string, unknown>[]
): ChatMessage[] {
  const truncatedNarrative = truncateNarrative(narrative);
  const existingChoicesSummary = existingChoices
    .map((c, i) => `  ${i + 1}. "${String(c['text'])}" (${String(c['choiceType'])} / ${String(c['primaryDelta'])})`)
    .join('\n');

  const systemMessage: ChatMessage = {
    role: 'system',
    content:
      'You generate supplementary choices for an interactive branching story. ' +
      'Each choice must have a different choiceType and primaryDelta from the existing choice(s). ' +
      'Choices must be meaningful, distinct alternatives that branch the story differently.',
  };

  const userMessage: ChatMessage = {
    role: 'user',
    content:
      `Scene summary: ${sceneSummary}\n\n` +
      `Recent narrative:\n${truncatedNarrative}\n\n` +
      `Existing choice(s):\n${existingChoicesSummary}\n\n` +
      'Generate exactly 2 additional choices with different choiceType and primaryDelta tags ' +
      'from the existing choice(s). Each choice must present a meaningfully different path.',
  };

  return [systemMessage, userMessage];
}

function isValidSupplementaryChoice(candidate: unknown): candidate is SupplementaryChoice {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const obj = candidate as Record<string, unknown>;
  const text = obj['text'];
  const choiceType = obj['choiceType'];
  const primaryDelta = obj['primaryDelta'];
  const choiceSubtype = obj['choiceSubtype'];
  const choiceShape = obj['choiceShape'];
  return (
    typeof text === 'string' &&
    text.trim().length >= 3 &&
    typeof choiceType === 'string' &&
    CHOICE_TYPE_SET.has(choiceType) &&
    typeof primaryDelta === 'string' &&
    PRIMARY_DELTA_SET.has(primaryDelta) &&
    (choiceSubtype === undefined || choiceSubtype === null || typeof choiceSubtype === 'string') &&
    (choiceShape === undefined || choiceShape === null || typeof choiceShape === 'string')
  );
}

export function validateSupplementaryResponse(
  rawChoices: unknown
): SupplementaryChoice[] | null {
  if (!Array.isArray(rawChoices)) {
    return null;
  }

  const valid: SupplementaryChoice[] = [];
  for (const candidate of rawChoices) {
    if (valid.length >= MAX_SUPPLEMENTARY_CHOICES) {
      break;
    }
    if (isValidSupplementaryChoice(candidate)) {
      valid.push({
        text: candidate.text.trim(),
        choiceType: candidate.choiceType,
        primaryDelta: candidate.primaryDelta,
        ...(candidate.choiceSubtype != null ? { choiceSubtype: candidate.choiceSubtype } : {}),
        ...(candidate.choiceShape != null ? { choiceShape: candidate.choiceShape } : {}),
      });
    }
  }

  return valid.length > 0 ? valid : null;
}

async function callSupplementaryChoices(
  messages: ChatMessage[],
  apiKey: string,
  model: string
): Promise<SupplementaryChoice[] | null> {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'One More Branch',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: SUPPLEMENTARY_MAX_TOKENS,
        response_format: SUPPLEMENTARY_CHOICES_SCHEMA,
      }),
    });

    if (!response.ok) {
      logger.warn('Supplementary choices LLM call failed', {
        status: response.status,
      });
      return null;
    }

    const data = await readJsonResponse(response);
    const content = extractResponseContent(data, 'writer-choice-repair', model, SUPPLEMENTARY_MAX_TOKENS);
    const parsedMessage = parseMessageJsonContent(content);
    const parsed = parsedMessage.parsed;

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const choicesArray = parsed['choices'];
    return validateSupplementaryResponse(choicesArray);
  } catch (error) {
    logger.warn('Supplementary choices call error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function repairInsufficientChoices(
  rawJson: unknown,
  apiKey: string,
  model: string | undefined,
  observability: GenerationObservabilityContext | undefined
): Promise<ChoiceInsufficientRepairResult> {
  if (!needsChoiceRepair(rawJson)) {
    return { repairedJson: rawJson, repaired: false };
  }

  const source = rawJson as Record<string, unknown>;
  const narrative = source['narrative'];
  const sceneSummary = source['sceneSummary'];
  const choices = source['choices'] as unknown[];

  if (typeof narrative !== 'string' || typeof sceneSummary !== 'string') {
    return { repairedJson: rawJson, repaired: false };
  }

  const resolvedModel = model ?? getStageModel('writer');
  const messages = buildSupplementaryMessages(
    narrative,
    sceneSummary,
    choices as readonly Record<string, unknown>[]
  );

  logPrompt(logger, 'writerChoiceRepair', messages);

  const supplementary = await callSupplementaryChoices(messages, apiKey, resolvedModel);
  if (!supplementary) {
    logger.warn('Writer choice insufficiency repair failed: no valid supplementary choices', {
      storyId: observability?.storyId ?? null,
      pageId: observability?.pageId ?? null,
    });
    return { repairedJson: rawJson, repaired: false };
  }

  const mergedChoices = [...choices, ...supplementary];
  const repaired = { ...source, choices: mergedChoices };
  return {
    repairedJson: repaired,
    repaired: true,
    repairDetails: `Added ${supplementary.length} supplementary choice(s) via LLM call (${choices.length} original + ${supplementary.length} new = ${mergedChoices.length} total)`,
  };
}

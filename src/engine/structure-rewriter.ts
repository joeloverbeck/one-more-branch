import { getConfig } from '../config';
import { logger, logPrompt } from '../logging';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from '../llm/http-client';
import { buildStructureRewritePrompt } from '../llm/prompts/structure-rewrite-prompt';
import { STRUCTURE_GENERATION_SCHEMA } from '../llm/schemas/structure-schema';
import { ChatMessage, CompletedBeat, LLMError, StructureRewriteContext, StructureRewriteResult } from '../llm/types';
import { BeatRole, StoryAct, StoryBeat, StoryStructure } from '../models/story-arc';
import { createStoryStructure } from './structure-factory';
import type { StructureGenerationResult } from './structure-types';

export interface StructureRewriter {
  rewriteStructure(context: StructureRewriteContext, apiKey: string): Promise<StructureRewriteResult>;
}

export type StructureRewriteGenerator = (
  messages: ChatMessage[],
  apiKey: string,
) => Promise<StructureGenerationResult>;

const VALID_BEAT_ROLES: readonly BeatRole[] = ['setup', 'escalation', 'turning_point', 'resolution'];

function parseBeatRole(role: string): BeatRole {
  if (VALID_BEAT_ROLES.includes(role as BeatRole)) {
    return role as BeatRole;
  }
  return 'escalation';
}

function parseBeatNumber(beatId: string, actIndex: number): number | null {
  const match = /^(\d+)\.(\d+)$/.exec(beatId);
  if (!match) {
    return null;
  }

  const parsedAct = Number(match[1]);
  const parsedBeat = Number(match[2]);
  if (
    !Number.isInteger(parsedAct) ||
    !Number.isInteger(parsedBeat) ||
    parsedAct !== actIndex + 1 ||
    parsedBeat <= 0
  ) {
    return null;
  }

  return parsedBeat;
}

export function createStructureRewriter(
  generator: StructureRewriteGenerator = generateRewrittenStructure,
): StructureRewriter {
  return {
    async rewriteStructure(context: StructureRewriteContext, apiKey: string): Promise<StructureRewriteResult> {
      const messages = buildStructureRewritePrompt(context);
      logPrompt(logger, 'structure-rewrite', messages);
      const regenerated = await generator(messages, apiKey);
      const regeneratedStructure = createStoryStructure(regenerated);
      const structure = mergePreservedWithRegenerated(
        context.completedBeats,
        regeneratedStructure,
        context.originalTheme,
      );

      return {
        structure,
        preservedBeatIds: context.completedBeats.map(beat => beat.beatId),
        rawResponse: regenerated.rawResponse,
      };
    },
  };
}

export function mergePreservedWithRegenerated(
  preservedBeats: readonly CompletedBeat[],
  regeneratedStructure: StoryStructure,
  originalTheme: string,
): StoryStructure {
  const preservedByAct = new Map<number, CompletedBeat[]>();
  for (const beat of preservedBeats) {
    const beatsInAct = preservedByAct.get(beat.actIndex) ?? [];
    beatsInAct.push(beat);
    preservedByAct.set(beat.actIndex, beatsInAct);
  }

  const mergedActs: StoryAct[] = [];

  for (let actIndex = 0; actIndex < 3; actIndex += 1) {
    const regeneratedAct = regeneratedStructure.acts[actIndex];
    const preservedInAct = (preservedByAct.get(actIndex) ?? []).slice().sort((a, b) => {
      return a.beatIndex - b.beatIndex;
    });

    const mergedBeats: StoryBeat[] = preservedInAct.map(beat => ({
      id: beat.beatId,
      name: beat.name,
      description: beat.description,
      objective: beat.objective,
      role: parseBeatRole(beat.role),
    }));

    let nextBeatNumber = mergedBeats.reduce((max, beat) => {
      const beatNumber = parseBeatNumber(beat.id, actIndex);
      if (beatNumber === null) {
        return max;
      }
      return Math.max(max, beatNumber);
    }, 0);

    const seenBeatSignature = new Set(
      mergedBeats.map(beat => `${beat.description}\n${beat.objective}`),
    );

    for (const beat of regeneratedAct?.beats ?? []) {
      const signature = `${beat.description}\n${beat.objective}`;
      if (seenBeatSignature.has(signature)) {
        continue;
      }

      mergedBeats.push({
        id: `${actIndex + 1}.${nextBeatNumber + 1}`,
        name: beat.name,
        description: beat.description,
        objective: beat.objective,
        role: beat.role,
      });
      nextBeatNumber += 1;
      seenBeatSignature.add(signature);
    }

    if (mergedBeats.length === 0) {
      throw new Error(`Merged structure is missing beats for act ${actIndex + 1}`);
    }

    mergedActs.push({
      id: String(actIndex + 1),
      name: regeneratedAct?.name ?? `Act ${actIndex + 1}`,
      objective: regeneratedAct?.objective ?? '',
      stakes: regeneratedAct?.stakes ?? '',
      entryCondition: regeneratedAct?.entryCondition ?? 'Continuing from prior act',
      beats: mergedBeats,
    });
  }

  return {
    acts: mergedActs,
    overallTheme: originalTheme,
    premise: regeneratedStructure.premise,
    pacingBudget: regeneratedStructure.pacingBudget,
    generatedAt: new Date(),
  };
}

function parseStructureResponse(responseText: string): Omit<StructureGenerationResult, 'rawResponse'> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText) as unknown;
  } catch {
    throw new LLMError('Invalid JSON response from OpenRouter', 'INVALID_JSON', true);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Structure response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (typeof data['overallTheme'] !== 'string') {
    throw new LLMError('Structure response missing overallTheme', 'STRUCTURE_PARSE_ERROR', true);
  }

  if (!Array.isArray(data['acts']) || data['acts'].length !== 3) {
    const received = Array.isArray(data['acts']) ? data['acts'].length : typeof data['acts'];
    throw new LLMError(
      `Structure response must include exactly 3 acts (received: ${received})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const acts = data['acts'].map((act, actIndex) => {
    if (typeof act !== 'object' || act === null || Array.isArray(act)) {
      throw new LLMError(
        `Structure act ${actIndex + 1} must be an object`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    const actData = act as Record<string, unknown>;
    if (
      typeof actData['name'] !== 'string' ||
      typeof actData['objective'] !== 'string' ||
      typeof actData['stakes'] !== 'string' ||
      typeof actData['entryCondition'] !== 'string'
    ) {
      throw new LLMError(
        `Structure act ${actIndex + 1} is missing required fields`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    if (!Array.isArray(actData['beats']) || actData['beats'].length < 2 || actData['beats'].length > 4) {
      const received = Array.isArray(actData['beats']) ? actData['beats'].length : typeof actData['beats'];
      throw new LLMError(
        `Structure act ${actIndex + 1} must have 2-4 beats (received: ${received})`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }

    const beats = actData['beats'].map((beat, beatIndex) => {
      if (typeof beat !== 'object' || beat === null || Array.isArray(beat)) {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} must be an object`,
          'STRUCTURE_PARSE_ERROR',
          true,
        );
      }

      const beatData = beat as Record<string, unknown>;
      if (
        typeof beatData['name'] !== 'string' ||
        typeof beatData['description'] !== 'string' ||
        typeof beatData['objective'] !== 'string'
      ) {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} is missing required fields`,
          'STRUCTURE_PARSE_ERROR',
          true,
        );
      }

      const role = typeof beatData['role'] === 'string' ? beatData['role'] : 'escalation';

      return {
        name: beatData['name'],
        description: beatData['description'],
        objective: beatData['objective'],
        role,
      };
    });

    return {
      name: actData['name'],
      objective: actData['objective'],
      stakes: actData['stakes'],
      entryCondition: actData['entryCondition'],
      beats,
    };
  });

  const premise = typeof data['premise'] === 'string' ? data['premise'] : data['overallTheme'];
  const rawBudget = data['pacingBudget'];
  const pacingBudget =
    typeof rawBudget === 'object' && rawBudget !== null
      ? {
          targetPagesMin: typeof (rawBudget as Record<string, unknown>)['targetPagesMin'] === 'number'
            ? ((rawBudget as Record<string, unknown>)['targetPagesMin'] as number)
            : 15,
          targetPagesMax: typeof (rawBudget as Record<string, unknown>)['targetPagesMax'] === 'number'
            ? ((rawBudget as Record<string, unknown>)['targetPagesMax'] as number)
            : 50,
        }
      : { targetPagesMin: 15, targetPagesMax: 50 };

  return {
    overallTheme: data['overallTheme'],
    premise,
    pacingBudget,
    acts,
  };
}

async function generateRewrittenStructure(
  messages: ChatMessage[],
  apiKey: string,
): Promise<StructureGenerationResult> {
  const config = getConfig().llm;
  const model = config.defaultModel;
  const temperature = config.temperature;
  const maxTokens = config.maxTokens;

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
      temperature,
      max_tokens: maxTokens,
      response_format: STRUCTURE_GENERATION_SCHEMA,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorDetails.message, `HTTP_${response.status}`, retryable, {
      httpStatus: response.status,
      model,
      rawErrorBody: errorDetails.rawBody,
      parsedError: errorDetails.parsedError,
    });
  }

  const data = await readJsonResponse(response);
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new LLMError('Empty response from OpenRouter', 'EMPTY_RESPONSE', true);
  }

  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  try {
    const parsed = parseStructureResponse(responseText);
    return { ...parsed, rawResponse: responseText };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

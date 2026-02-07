import { getConfig } from '../config';
import { logger, logPrompt } from '../logging';
import { extractOutputFromCoT } from '../llm/cot-parser';
import { OPENROUTER_API_URL, readErrorDetails, readJsonResponse } from '../llm/http-client';
import { buildStructureRewritePrompt } from '../llm/prompts/structure-rewrite-prompt';
import { STRUCTURE_GENERATION_SCHEMA } from '../llm/schemas/structure-schema';
import { ChatMessage, CompletedBeat, LLMError, StructureRewriteContext, StructureRewriteResult } from '../llm/types';
import { StoryAct, StoryBeat, StoryStructure } from '../models/story-arc';
import { createStoryStructure } from './structure-factory';
import type { StructureGenerationResult } from './structure-types';

export interface StructureRewriter {
  rewriteStructure(context: StructureRewriteContext, apiKey: string): Promise<StructureRewriteResult>;
}

export type StructureRewriteGenerator = (
  messages: ChatMessage[],
  apiKey: string,
) => Promise<StructureGenerationResult>;

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

    const mergedBeats: StoryBeat[] = preservedInAct.map((beat, index) => ({
      id: `${actIndex + 1}.${index + 1}`,
      description: beat.description,
      objective: beat.objective,
    }));

    const seenBeatSignature = new Set(
      mergedBeats.map(beat => `${beat.description}\n${beat.objective}`),
    );

    for (const beat of regeneratedAct?.beats ?? []) {
      const signature = `${beat.description}\n${beat.objective}`;
      if (seenBeatSignature.has(signature)) {
        continue;
      }

      mergedBeats.push({
        id: `${actIndex + 1}.${mergedBeats.length + 1}`,
        description: beat.description,
        objective: beat.objective,
      });
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
    throw new LLMError('Structure response must include exactly 3 acts', 'STRUCTURE_PARSE_ERROR', true);
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
      throw new LLMError(
        `Structure act ${actIndex + 1} must have 2-4 beats`,
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
      if (typeof beatData['description'] !== 'string' || typeof beatData['objective'] !== 'string') {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} is missing required fields`,
          'STRUCTURE_PARSE_ERROR',
          true,
        );
      }

      return {
        description: beatData['description'],
        objective: beatData['objective'],
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

  return {
    overallTheme: data['overallTheme'],
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

  const responseText = config.promptOptions.enableChainOfThought ? extractOutputFromCoT(content) : content;
  const parsed = parseStructureResponse(responseText);

  return {
    ...parsed,
    rawResponse: responseText,
  };
}

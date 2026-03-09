import { getConfig } from '../config';
import { getStageModel, getStageMaxTokens } from '../config/stage-model';
import { logger, logPrompt } from '../logging';
import {
  OPENROUTER_API_URL,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from '../llm/http-client';
import { buildStructureRewritePrompt } from '../llm/prompts/structure-rewrite-prompt';
import { STRUCTURE_GENERATION_SCHEMA } from '../llm/schemas/structure-schema';
import { ChatMessage, LLMError } from '../llm/llm-client-types';
import { parseStructureResponseObject } from '../llm/structure-response-parser';
import type {
  CompletedBeat,
  StructureRewriteContext,
  StructureRewriteResult,
} from '../llm/structure-rewrite-types';
import { BEAT_ROLES, BeatRole, StoryAct, StoryBeat, StoryStructure } from '../models/story-arc';
import {
  createStoryStructure,
  parseApproachVectors,
  parseCrisisType,
  parseEscalationType,
  parseGapMagnitude,
  parseMidpointType,
} from './structure-factory';
import type { StructureGenerationResult } from './structure-types';

export interface StructureRewriter {
  rewriteStructure(
    context: StructureRewriteContext,
    apiKey: string
  ): Promise<StructureRewriteResult>;
}

export type StructureRewriteGenerator = (
  messages: ChatMessage[],
  apiKey: string
) => Promise<StructureGenerationResult>;

function parseBeatRole(role: string): BeatRole {
  if (BEAT_ROLES.includes(role as BeatRole)) {
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

function beatSignature(description: string, objective: string): string {
  const normalizedDesc = description.trim().replace(/\s+/g, ' ');
  const normalizedObj = objective.trim().replace(/\s+/g, ' ');
  return `${normalizedDesc}\n${normalizedObj}`;
}

export function createStructureRewriter(
  generator: StructureRewriteGenerator = generateRewrittenStructure
): StructureRewriter {
  return {
    async rewriteStructure(
      context: StructureRewriteContext,
      apiKey: string
    ): Promise<StructureRewriteResult> {
      const messages = buildStructureRewritePrompt(context);
      logPrompt(logger, 'structureRewrite', messages);
      const regenerated = await generator(messages, apiKey);
      const regeneratedStructure = createStoryStructure(regenerated);
      const structure = mergePreservedWithRegenerated(
        context.completedBeats,
        regeneratedStructure,
        context.originalTheme,
        context.originalOpeningImage
      );

      return {
        structure,
        preservedBeatIds: context.completedBeats.map((beat) => beat.beatId),
        rawResponse: regenerated.rawResponse,
      };
    },
  };
}

export function mergePreservedWithRegenerated(
  preservedBeats: readonly CompletedBeat[],
  regeneratedStructure: StoryStructure,
  originalTheme: string,
  originalOpeningImage: string
): StoryStructure {
  const preservedByAct = new Map<number, CompletedBeat[]>();
  for (const beat of preservedBeats) {
    const beatsInAct = preservedByAct.get(beat.actIndex) ?? [];
    beatsInAct.push(beat);
    preservedByAct.set(beat.actIndex, beatsInAct);
  }

  const mergedActs: StoryAct[] = [];

  for (let actIndex = 0; actIndex < regeneratedStructure.acts.length; actIndex += 1) {
    const regeneratedAct = regeneratedStructure.acts[actIndex];
    const preservedInAct = (preservedByAct.get(actIndex) ?? []).slice().sort((a, b) => {
      return a.beatIndex - b.beatIndex;
    });

    const mergedBeats: StoryBeat[] = preservedInAct.map((beat) => {
      const isMidpoint = beat.isMidpoint === true;
      const midpointType = parseMidpointType(beat.midpointType);
      if (isMidpoint && midpointType === null) {
        throw new Error(
          `Preserved beat ${beat.beatId} is midpoint-tagged but missing midpointType`
        );
      }
      if (!isMidpoint && midpointType !== null) {
        throw new Error(`Preserved beat ${beat.beatId} has midpointType but isMidpoint is false`);
      }

      return {
        id: beat.beatId,
        name: beat.name,
        description: beat.description,
        objective: beat.objective,
        causalLink: beat.causalLink,
        role: parseBeatRole(beat.role),
        escalationType: parseEscalationType(beat.escalationType),
        secondaryEscalationType: parseEscalationType(beat.secondaryEscalationType),
        crisisType: parseCrisisType(beat.crisisType),
        expectedGapMagnitude: parseGapMagnitude(beat.expectedGapMagnitude),
        isMidpoint,
        midpointType,
        uniqueScenarioHook: beat.uniqueScenarioHook,
        approachVectors: parseApproachVectors(beat.approachVectors),
        setpieceSourceIndex: beat.setpieceSourceIndex,
        obligatorySceneTag: beat.obligatorySceneTag,
      };
    });

    let nextBeatNumber = mergedBeats.reduce((max, beat) => {
      const beatNumber = parseBeatNumber(beat.id, actIndex);
      if (beatNumber === null) {
        return max;
      }
      return Math.max(max, beatNumber);
    }, 0);

    const seenBeatSignature = new Set(
      mergedBeats.map((beat) => beatSignature(beat.description, beat.objective))
    );

    for (const beat of regeneratedAct?.beats ?? []) {
      const signature = beatSignature(beat.description, beat.objective);
      if (seenBeatSignature.has(signature)) {
        continue;
      }

      mergedBeats.push({
        id: `${actIndex + 1}.${nextBeatNumber + 1}`,
        name: beat.name,
        description: beat.description,
        objective: beat.objective,
        causalLink: beat.causalLink,
        role: beat.role,
        escalationType: beat.escalationType,
        secondaryEscalationType: beat.secondaryEscalationType,
        crisisType: beat.crisisType,
        expectedGapMagnitude: beat.expectedGapMagnitude,
        isMidpoint: beat.isMidpoint,
        midpointType: beat.midpointType,
        uniqueScenarioHook: beat.uniqueScenarioHook,
        approachVectors: beat.approachVectors ?? null,
        setpieceSourceIndex: beat.setpieceSourceIndex ?? null,
        obligatorySceneTag: beat.obligatorySceneTag ?? null,
      });
      nextBeatNumber += 1;
      seenBeatSignature.add(signature);
    }

    if (mergedBeats.length === 0) {
      throw new Error(`Merged structure is missing beats for act ${actIndex + 1}`);
    }

    const actMidpoints = mergedBeats.filter((beat) => beat.isMidpoint).length;
    if (actMidpoints > 1) {
      throw new Error(`Merged act ${actIndex + 1} has multiple midpoint beats`);
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

  const totalMidpoints = mergedActs.reduce(
    (sum, act) => sum + act.beats.filter((beat) => beat.isMidpoint).length,
    0
  );
  if (totalMidpoints > 1) {
    throw new Error(
      `Merged structure contains multiple midpoint beats (received: ${totalMidpoints})`
    );
  }

  return {
    acts: mergedActs,
    overallTheme: originalTheme,
    premise: regeneratedStructure.premise,
    openingImage: originalOpeningImage,
    closingImage: regeneratedStructure.closingImage,
    pacingBudget: regeneratedStructure.pacingBudget,
    generatedAt: new Date(),
  };
}

async function generateRewrittenStructure(
  messages: ChatMessage[],
  apiKey: string
): Promise<StructureGenerationResult> {
  const model = getStageModel('structureRewrite');
  const maxTokens = getStageMaxTokens('structureRewrite');
  const temperature = getConfig().llm.temperature;

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
    const parsed = parseStructureResponseObject(parsedMessage.parsed);
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

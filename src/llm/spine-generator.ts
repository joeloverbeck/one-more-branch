import { getStageModel } from '../config/stage-model.js';
import { getConfig } from '../config/index.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import {
  OPENROUTER_API_URL,
  extractResponseContent,
  parseMessageJsonContent,
  readErrorDetails,
  readJsonResponse,
} from './http-client.js';
import { withModelFallback } from './model-fallback.js';
import { withRetry } from './retry.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import type { ChatMessage, JsonSchema } from './llm-client-types.js';
import type {
  StorySpineType,
  ConflictAxis,
  ConflictType,
  CharacterArcType,
  NeedWantDynamic,
} from '../models/story-spine.js';
import {
  isStorySpineType,
  isConflictAxis,
  isConflictType,
  isCharacterArcType,
  isNeedWantDynamic,
} from '../models/story-spine.js';
import type { SpineFoundation, SpineArcEngine } from '../models/spine-foundation.js';
import type { SpinePromptContext } from './prompts/spine-prompt.js';
import { buildSpineFoundationPrompt } from './prompts/spine-foundation-prompt.js';
import { buildSpineArcEnginePrompt } from './prompts/spine-arc-engine-prompt.js';
import { buildSpineSynthesisPrompt } from './prompts/spine-synthesis-prompt.js';
import { formatStandaloneCharacterSummary } from '../models/standalone-decomposed-character.js';
import { SPINE_FOUNDATION_SCHEMA } from './schemas/spine-foundation-schema.js';
import { SPINE_ARC_ENGINE_SCHEMA } from './schemas/spine-arc-engine-schema.js';
import { SPINE_SYNTHESIS_SCHEMA } from './schemas/spine-synthesis-schema.js';

export interface SpineOption {
  readonly centralDramaticQuestion: string;
  readonly protagonistNeedVsWant: {
    readonly need: string;
    readonly want: string;
    readonly dynamic: NeedWantDynamic;
  };
  readonly primaryAntagonisticForce: {
    readonly description: string;
    readonly pressureMechanism: string;
  };
  readonly storySpineType: StorySpineType;
  readonly conflictAxis: ConflictAxis;
  readonly conflictType: ConflictType;
  readonly characterArcType: CharacterArcType;
  readonly toneFeel: readonly string[];
  readonly toneAvoid: readonly string[];
  readonly wantNeedCollisionPoint: string;
  readonly protagonistDeepestFear: string;
}

export interface SpineGenerationResult {
  readonly options: readonly SpineOption[];
  readonly rawResponse: string;
}

export interface SpinePipelineCallbacks {
  onStageStarted?: (stage: string) => void;
  onStageCompleted?: (stage: string) => void;
}

// --- Generic LLM fetch helper ---

async function fetchStage<T>(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  schema: JsonSchema,
  stageName: string,
  parse: (parsed: unknown) => T,
): Promise<{ result: T; rawResponse: string }> {
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
      response_format: schema,
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
  const content = extractResponseContent(data, stageName, model, maxTokens);
  const parsedMessage = parseMessageJsonContent(content);
  const rawResponse = parsedMessage.rawText;

  try {
    const result = parse(parsedMessage.parsed);
    return { result, rawResponse };
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: rawResponse,
      });
    }
    throw error;
  }
}

// --- Stage 1: Foundation parsing ---

function parseFoundation(raw: unknown, index: number): SpineFoundation {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Foundation ${index + 1} must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = raw as Record<string, unknown>;

  if (!isConflictAxis(data['conflictAxis'])) {
    throw new LLMError(
      `Foundation ${index + 1} invalid conflictAxis: ${String(data['conflictAxis'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (!isCharacterArcType(data['characterArcType'])) {
    throw new LLMError(
      `Foundation ${index + 1} invalid characterArcType: ${String(data['characterArcType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const protagonistDeepestFear =
    typeof data['protagonistDeepestFear'] === 'string' &&
    data['protagonistDeepestFear'].trim().length > 0
      ? data['protagonistDeepestFear'].trim()
      : '';

  const thematicPremise =
    typeof data['thematicPremise'] === 'string' && data['thematicPremise'].trim().length > 0
      ? data['thematicPremise'].trim()
      : '';

  const toneFeel = Array.isArray(data['toneFeel'])
    ? (data['toneFeel'] as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const toneAvoid = Array.isArray(data['toneAvoid'])
    ? (data['toneAvoid'] as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  return {
    conflictAxis: data['conflictAxis'],
    characterArcType: data['characterArcType'],
    protagonistDeepestFear,
    toneFeel,
    toneAvoid,
    thematicPremise,
  };
}

function parseFoundationResponse(parsed: unknown): readonly SpineFoundation[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Foundation response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['foundations'])) {
    throw new LLMError('Foundation response missing foundations array', 'STRUCTURE_PARSE_ERROR', true);
  }

  if (data['foundations'].length < 5 || data['foundations'].length > 6) {
    throw new LLMError(
      `Foundation response must have 5-6 foundations (received: ${data['foundations'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['foundations'].map((f, i) => parseFoundation(f, i));
}

// --- Stage 2: Arc Engine parsing ---

interface ArcEngineElaboration {
  readonly storySpineType: StorySpineType;
  readonly conflictType: ConflictType;
  readonly protagonistNeedVsWant: {
    readonly need: string;
    readonly want: string;
    readonly dynamic: NeedWantDynamic;
  };
}

function parseArcEngineElaboration(raw: unknown, index: number): ArcEngineElaboration {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Arc engine ${index + 1} must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = raw as Record<string, unknown>;

  if (!isStorySpineType(data['storySpineType'])) {
    throw new LLMError(
      `Arc engine ${index + 1} invalid storySpineType: ${String(data['storySpineType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (!isConflictType(data['conflictType'])) {
    throw new LLMError(
      `Arc engine ${index + 1} invalid conflictType: ${String(data['conflictType'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const needVsWant = data['protagonistNeedVsWant'];
  if (typeof needVsWant !== 'object' || needVsWant === null || Array.isArray(needVsWant)) {
    throw new LLMError(
      `Arc engine ${index + 1} missing protagonistNeedVsWant`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  const nw = needVsWant as Record<string, unknown>;
  if (typeof nw['need'] !== 'string' || typeof nw['want'] !== 'string') {
    throw new LLMError(
      `Arc engine ${index + 1} protagonistNeedVsWant missing need/want`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  if (!isNeedWantDynamic(nw['dynamic'])) {
    throw new LLMError(
      `Arc engine ${index + 1} invalid need-want dynamic: ${String(nw['dynamic'])}`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    storySpineType: data['storySpineType'],
    conflictType: data['conflictType'],
    protagonistNeedVsWant: {
      need: nw['need'],
      want: nw['want'],
      dynamic: nw['dynamic'],
    },
  };
}

function parseArcEngineResponse(
  parsed: unknown,
  expectedCount: number,
): readonly ArcEngineElaboration[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Arc engine response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['elaborations'])) {
    throw new LLMError(
      'Arc engine response missing elaborations array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['elaborations'].length !== expectedCount) {
    throw new LLMError(
      `Arc engine response must have exactly ${expectedCount} elaborations (received: ${data['elaborations'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['elaborations'].map((e, i) => parseArcEngineElaboration(e, i));
}

// --- Stage 3: Synthesis parsing ---

interface SynthesisResult {
  readonly primaryAntagonisticForce: {
    readonly description: string;
    readonly pressureMechanism: string;
  };
  readonly centralDramaticQuestion: string;
  readonly wantNeedCollisionPoint: string;
}

function parseSynthesis(raw: unknown, index: number): SynthesisResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Synthesis ${index + 1} must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = raw as Record<string, unknown>;

  if (typeof data['centralDramaticQuestion'] !== 'string') {
    throw new LLMError(
      `Synthesis ${index + 1} missing centralDramaticQuestion`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const antag = data['primaryAntagonisticForce'];
  if (typeof antag !== 'object' || antag === null || Array.isArray(antag)) {
    throw new LLMError(
      `Synthesis ${index + 1} missing primaryAntagonisticForce`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }
  const af = antag as Record<string, unknown>;
  if (typeof af['description'] !== 'string' || typeof af['pressureMechanism'] !== 'string') {
    throw new LLMError(
      `Synthesis ${index + 1} primaryAntagonisticForce missing fields`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const wantNeedCollisionPoint =
    typeof data['wantNeedCollisionPoint'] === 'string' &&
    data['wantNeedCollisionPoint'].trim().length > 0
      ? data['wantNeedCollisionPoint'].trim()
      : '';

  return {
    primaryAntagonisticForce: {
      description: af['description'],
      pressureMechanism: af['pressureMechanism'],
    },
    centralDramaticQuestion: data['centralDramaticQuestion'],
    wantNeedCollisionPoint,
  };
}

function parseSynthesisResponse(
  parsed: unknown,
  expectedCount: number,
): readonly SynthesisResult[] {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Synthesis response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data['syntheses'])) {
    throw new LLMError(
      'Synthesis response missing syntheses array',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  if (data['syntheses'].length !== expectedCount) {
    throw new LLMError(
      `Synthesis response must have exactly ${expectedCount} syntheses (received: ${data['syntheses'].length})`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return data['syntheses'].map((s, i) => parseSynthesis(s, i));
}

// --- Assembly ---

function assembleSpineOptions(
  foundations: readonly SpineFoundation[],
  arcEngines: readonly ArcEngineElaboration[],
  syntheses: readonly SynthesisResult[],
): readonly SpineOption[] {
  return foundations.map((foundation, i) => {
    const arcEngine = arcEngines[i]!;
    const synthesis = syntheses[i]!;
    return {
      centralDramaticQuestion: synthesis.centralDramaticQuestion,
      protagonistNeedVsWant: arcEngine.protagonistNeedVsWant,
      primaryAntagonisticForce: synthesis.primaryAntagonisticForce,
      storySpineType: arcEngine.storySpineType,
      conflictAxis: foundation.conflictAxis,
      conflictType: arcEngine.conflictType,
      characterArcType: foundation.characterArcType,
      toneFeel: foundation.toneFeel,
      toneAvoid: foundation.toneAvoid,
      wantNeedCollisionPoint: synthesis.wantNeedCollisionPoint,
      protagonistDeepestFear: foundation.protagonistDeepestFear,
    };
  });
}

function mergeFoundationAndArcEngine(
  foundation: SpineFoundation,
  arcEngine: ArcEngineElaboration,
): SpineArcEngine {
  return {
    ...foundation,
    storySpineType: arcEngine.storySpineType,
    conflictType: arcEngine.conflictType,
    protagonistNeedVsWant: arcEngine.protagonistNeedVsWant,
  };
}

// --- Public API ---

export async function generateStorySpines(
  context: SpinePromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
  callbacks?: SpinePipelineCallbacks,
): Promise<SpineGenerationResult> {
  const config = getConfig().llm;
  const temperature = options?.temperature ?? config.temperature;
  const maxTokens = options?.maxTokens ?? config.maxTokens;
  const rawResponses: string[] = [];

  // Compute protagonist summary once for downstream stages
  const protagonistSummary = context.decomposedCharacters?.[0]
    ? formatStandaloneCharacterSummary(context.decomposedCharacters[0])
    : context.characterConcept ?? '';

  // --- Stage 1: Thematic Foundation Ideation ---
  callbacks?.onStageStarted?.('GENERATING_SPINE_FOUNDATION');
  const foundationModel = options?.model ?? getStageModel('spineFoundation');
  const foundationMessages = buildSpineFoundationPrompt(context);
  logPrompt(logger, 'spineFoundation', foundationMessages);

  const foundationResult = await withRetry(() =>
    withModelFallback(
      (m) =>
        fetchStage(
          apiKey,
          m,
          foundationMessages,
          temperature,
          maxTokens,
          SPINE_FOUNDATION_SCHEMA,
          'spineFoundation',
          parseFoundationResponse,
        ),
      foundationModel,
      'spineFoundation',
    ),
  );
  logResponse(logger, 'spineFoundation', foundationResult.rawResponse);
  rawResponses.push(foundationResult.rawResponse);
  const foundations = foundationResult.result;
  callbacks?.onStageCompleted?.('GENERATING_SPINE_FOUNDATION');

  // --- Stage 2: Arc Engine Elaboration ---
  callbacks?.onStageStarted?.('GENERATING_SPINE_ARC_ENGINE');
  const arcEngineModel = options?.model ?? getStageModel('spineArcEngine');
  const arcEngineMessages = buildSpineArcEnginePrompt({
    characterConcept: context.characterConcept,
    protagonistSummary,
    tone: context.tone,
    foundations,
    conceptSpec: context.conceptSpec,
    conceptVerification: context.conceptVerification,
  });
  logPrompt(logger, 'spineArcEngine', arcEngineMessages);

  const arcEngineResult = await withRetry(() =>
    withModelFallback(
      (m) =>
        fetchStage(
          apiKey,
          m,
          arcEngineMessages,
          temperature,
          maxTokens,
          SPINE_ARC_ENGINE_SCHEMA,
          'spineArcEngine',
          (parsed) => parseArcEngineResponse(parsed, foundations.length),
        ),
      arcEngineModel,
      'spineArcEngine',
    ),
  );
  logResponse(logger, 'spineArcEngine', arcEngineResult.rawResponse);
  rawResponses.push(arcEngineResult.rawResponse);
  const arcEngines = arcEngineResult.result;
  callbacks?.onStageCompleted?.('GENERATING_SPINE_ARC_ENGINE');

  // --- Stage 3: Dramatic Synthesis ---
  callbacks?.onStageStarted?.('SYNTHESIZING_SPINE');
  const synthesisModel = options?.model ?? getStageModel('spineSynthesis');
  const spineArcEngines = foundations.map((f, i) => mergeFoundationAndArcEngine(f, arcEngines[i]!));
  const synthesisMessages = buildSpineSynthesisPrompt({
    characterConcept: context.characterConcept,
    protagonistSummary,
    tone: context.tone,
    arcEngines: spineArcEngines,
    storyKernel: context.storyKernel,
    conceptVerification: context.conceptVerification,
  });
  logPrompt(logger, 'spineSynthesis', synthesisMessages);

  const synthesisResult = await withRetry(() =>
    withModelFallback(
      (m) =>
        fetchStage(
          apiKey,
          m,
          synthesisMessages,
          temperature,
          maxTokens,
          SPINE_SYNTHESIS_SCHEMA,
          'spineSynthesis',
          (parsed) => parseSynthesisResponse(parsed, foundations.length),
        ),
      synthesisModel,
      'spineSynthesis',
    ),
  );
  logResponse(logger, 'spineSynthesis', synthesisResult.rawResponse);
  rawResponses.push(synthesisResult.rawResponse);
  const syntheses = synthesisResult.result;
  callbacks?.onStageCompleted?.('SYNTHESIZING_SPINE');

  // --- Assemble final SpineOptions ---
  const spineOptions = assembleSpineOptions(foundations, arcEngines, syntheses);

  return {
    options: spineOptions,
    rawResponse: rawResponses.join('\n---\n'),
  };
}

import {
  isRiskAppetite,
  type TasteDistillerContext,
  type TasteDistillerResult,
  type TasteProfile,
} from '../models/content-packet.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import { runLlmStage } from './llm-stage-runner.js';
import { buildContentTasteDistillerPrompt } from './prompts/content-taste-distiller-prompt.js';
import { buildContentTasteDistillerSchema } from './schemas/content-taste-distiller-schema.js';

const TASTE_PROFILE_STRING_ARRAY_FIELDS = [
  'collisionPatterns',
  'favoredMechanisms',
  'humanAnchors',
  'socialEngines',
  'toneBlend',
  'sceneAppetites',
  'antiPatterns',
  'surfaceDoNotRepeat',
] as const;

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
}

export function parseTasteDistillerResponse(parsed: unknown): TasteProfile {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Taste distiller response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const data = parsed as Record<string, unknown>;
  const profile = data['tasteProfile'];

  if (typeof profile !== 'object' || profile === null || Array.isArray(profile)) {
    throw new LLMError(
      'Taste distiller response missing tasteProfile object',
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  const profileData = profile as Record<string, unknown>;

  for (const field of TASTE_PROFILE_STRING_ARRAY_FIELDS) {
    if (!isNonEmptyStringArray(profileData[field])) {
      throw new LLMError(
        `tasteProfile.${field} must be a non-empty array of non-empty strings`,
        'STRUCTURE_PARSE_ERROR',
        true,
      );
    }
  }

  if (!isRiskAppetite(profileData['riskAppetite'])) {
    throw new LLMError(
      `tasteProfile.riskAppetite must be one of LOW, MEDIUM, HIGH, MAXIMAL`,
      'STRUCTURE_PARSE_ERROR',
      true,
    );
  }

  return {
    collisionPatterns: profileData['collisionPatterns'] as readonly string[],
    favoredMechanisms: profileData['favoredMechanisms'] as readonly string[],
    humanAnchors: profileData['humanAnchors'] as readonly string[],
    socialEngines: profileData['socialEngines'] as readonly string[],
    toneBlend: profileData['toneBlend'] as readonly string[],
    sceneAppetites: profileData['sceneAppetites'] as readonly string[],
    antiPatterns: profileData['antiPatterns'] as readonly string[],
    surfaceDoNotRepeat: profileData['surfaceDoNotRepeat'] as readonly string[],
    riskAppetite: profileData['riskAppetite'],
  };
}

export async function generateTasteProfile(
  context: TasteDistillerContext,
  apiKey: string,
  options?: Partial<GenerationOptions>,
): Promise<TasteDistillerResult> {
  const messages = buildContentTasteDistillerPrompt(context);
  const result = await runLlmStage({
    stageModel: 'contentTasteDistiller',
    promptType: 'contentTasteDistiller',
    apiKey,
    options,
    schema: buildContentTasteDistillerSchema(),
    messages,
    parseResponse: parseTasteDistillerResponse,
  });

  return {
    tasteProfile: result.parsed,
    rawResponse: result.rawResponse,
  };
}

import type { SpeechFingerprint } from '../models/decomposed-character.js';
import type {
  RelationSpecificVariant,
  TextualPresentation,
} from '../models/character-pipeline-types.js';
import { isVoiceRegister } from '../models/character-enums.js';
import {
  SPEECH_ARRAY_FIELDS,
  SPEECH_STRING_FIELDS,
} from './entity-decomposition-contract.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { LLMError } from './llm-client-types.js';
import {
  buildCharPresentationPrompt,
  type CharPresentationPromptContext,
} from './prompts/char-presentation-prompt.js';
import { CHAR_PRESENTATION_GENERATION_SCHEMA } from './schemas/char-presentation-schema.js';
import { runLlmStage } from './llm-stage-runner.js';

export interface CharPresentationGenerationResult {
  readonly textualPresentation: TextualPresentation;
  readonly rawResponse: string;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(
      `Textual presentation response missing ${fieldName}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return value.trim();
}

function parseStringArray(raw: Record<string, unknown>, key: keyof SpeechFingerprint): string[] {
  const value = raw[key];
  if (!Array.isArray(value)) {
    throw new LLMError(
      `Textual presentation response speechFingerprint.${key} must be an array`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return value.map((item) => parseRequiredString(item, `speechFingerprint.${key} item`));
}

function parseSpeechFingerprint(value: unknown): SpeechFingerprint {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(
      'Textual presentation response missing speechFingerprint',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = value as Record<string, unknown>;
  const speech = {} as Record<keyof SpeechFingerprint, string | string[]>;

  for (const field of SPEECH_STRING_FIELDS) {
    speech[field] = parseRequiredString(data[field], `speechFingerprint.${field}`);
  }

  for (const field of SPEECH_ARRAY_FIELDS) {
    speech[field] = parseStringArray(data, field);
  }

  return speech as SpeechFingerprint;
}

function parseCharPresentationResponse(parsed: unknown): TextualPresentation {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Textual presentation response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;

  if (!isVoiceRegister(data['voiceRegister'])) {
    throw new LLMError(
      `Textual presentation response invalid voiceRegister: ${String(data['voiceRegister'])}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const rawStress = data['stressVariants'];
  if (typeof rawStress !== 'object' || rawStress === null || Array.isArray(rawStress)) {
    throw new LLMError(
      'Textual presentation response missing stressVariants',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const stressData = rawStress as Record<string, unknown>;
  const stressVariants = {
    underThreat: parseRequiredString(stressData['underThreat'], 'stressVariants.underThreat'),
    inIntimacy: parseRequiredString(stressData['inIntimacy'], 'stressVariants.inIntimacy'),
    whenLying: parseRequiredString(stressData['whenLying'], 'stressVariants.whenLying'),
    whenAshamed: parseRequiredString(stressData['whenAshamed'], 'stressVariants.whenAshamed'),
    whenWinning: parseRequiredString(stressData['whenWinning'], 'stressVariants.whenWinning'),
  };

  const rawRelVariants = Array.isArray(data['relationSpecificVariants'])
    ? data['relationSpecificVariants']
    : [];
  const relationSpecificVariants: RelationSpecificVariant[] = rawRelVariants
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v))
    .map((v) => ({
      towardCharacter: parseRequiredString(v['towardCharacter'], 'relationSpecificVariants.towardCharacter'),
      registerShift: parseRequiredString(v['registerShift'], 'relationSpecificVariants.registerShift'),
      emotionalLeakage: parseRequiredString(v['emotionalLeakage'], 'relationSpecificVariants.emotionalLeakage'),
    }));

  return {
    characterName: parseRequiredString(data['characterName'], 'characterName'),
    voiceRegister: data['voiceRegister'],
    speechFingerprint: parseSpeechFingerprint(data['speechFingerprint']),
    appearance: parseRequiredString(data['appearance'], 'appearance'),
    knowledgeBoundaries: parseRequiredString(data['knowledgeBoundaries'], 'knowledgeBoundaries'),
    conflictPriority: parseRequiredString(data['conflictPriority'], 'conflictPriority'),
    stressVariants,
    relationSpecificVariants,
  };
}

export async function generateCharPresentation(
  context: CharPresentationPromptContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharPresentationGenerationResult> {
  const messages = buildCharPresentationPrompt(context);
  const result = await runLlmStage({
    stageModel: 'charPresentation',
    promptType: 'charPresentation',
    apiKey,
    options,
    schema: CHAR_PRESENTATION_GENERATION_SCHEMA,
    messages,
    parseResponse: parseCharPresentationResponse,
  });

  return {
    textualPresentation: result.parsed,
    rawResponse: result.rawResponse,
  };
}

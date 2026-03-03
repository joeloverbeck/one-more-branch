import type { ProtagonistGuidance } from '../../models/protagonist-guidance.js';
import type { SelectedSceneDirection } from '../../models/scene-direction.js';
import {
  isScenePurpose,
  isValuePolarityShift,
  isPacingMode,
} from '../../models/scene-direction-taxonomy.js';

/**
 * Extracts a single string from a route param value that may be `string | string[]`
 * (Express 5 ParamsDictionary). Returns the first element if array.
 */
export function flattenParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export const MAX_GUIDANCE_FIELD_LENGTH = 500;
export const MAX_SCENE_DIRECTION_TEXT_LENGTH = 2000;
export const MAX_CUSTOM_CHOICE_TEXT_LENGTH = 500;

export function parseProgressId(input: unknown): string | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBoundedText(input: unknown, maxLength: number): string | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

export function normalizeProtagonistGuidance(rawGuidance: unknown): ProtagonistGuidance | undefined {
  if (!rawGuidance || typeof rawGuidance !== 'object' || Array.isArray(rawGuidance)) {
    return undefined;
  }

  const guidance = rawGuidance as Record<string, unknown>;
  const normalized: ProtagonistGuidance = {
    suggestedEmotions: normalizeBoundedText(
      guidance['suggestedEmotions'],
      MAX_GUIDANCE_FIELD_LENGTH
    ),
    suggestedThoughts: normalizeBoundedText(
      guidance['suggestedThoughts'],
      MAX_GUIDANCE_FIELD_LENGTH
    ),
    suggestedSpeech: normalizeBoundedText(guidance['suggestedSpeech'], MAX_GUIDANCE_FIELD_LENGTH),
  };

  if (
    !normalized.suggestedEmotions &&
    !normalized.suggestedThoughts &&
    !normalized.suggestedSpeech
  ) {
    return undefined;
  }

  return normalized;
}

export function parseRequestedPageId(pageQuery: unknown): number {
  const pageInput =
    typeof pageQuery === 'string' || typeof pageQuery === 'number' ? String(pageQuery) : '';
  const parsed = Number.parseInt(pageInput, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function parseCustomChoiceText(input: unknown): { value?: string; error?: string } {
  if (typeof input !== 'string') {
    return { error: 'Missing pageId or choiceText' };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { error: 'Choice text cannot be empty' };
  }

  if (trimmed.length > MAX_CUSTOM_CHOICE_TEXT_LENGTH) {
    return {
      error: `Choice text must be ${MAX_CUSTOM_CHOICE_TEXT_LENGTH} characters or fewer`,
    };
  }

  return { value: trimmed };
}

export function normalizeSelectedSceneDirection(
  raw: unknown
): SelectedSceneDirection | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  const obj = raw as Record<string, unknown>;

  const scenePurpose = typeof obj['scenePurpose'] === 'string' ? obj['scenePurpose'] : '';
  const valuePolarityShift =
    typeof obj['valuePolarityShift'] === 'string' ? obj['valuePolarityShift'] : '';
  const pacingMode = typeof obj['pacingMode'] === 'string' ? obj['pacingMode'] : '';

  if (!isScenePurpose(scenePurpose)) {
    return undefined;
  }
  if (!isValuePolarityShift(valuePolarityShift)) {
    return undefined;
  }
  if (!isPacingMode(pacingMode)) {
    return undefined;
  }

  const sceneDirection =
    typeof obj['sceneDirection'] === 'string'
      ? obj['sceneDirection'].trim().slice(0, MAX_SCENE_DIRECTION_TEXT_LENGTH)
      : '';
  const dramaticJustification =
    typeof obj['dramaticJustification'] === 'string'
      ? obj['dramaticJustification'].trim().slice(0, MAX_SCENE_DIRECTION_TEXT_LENGTH)
      : '';

  if (sceneDirection.length === 0 || dramaticJustification.length === 0) {
    return undefined;
  }

  return {
    scenePurpose,
    valuePolarityShift,
    pacingMode,
    sceneDirection,
    dramaticJustification,
  };
}

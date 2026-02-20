import type { ProtagonistGuidance } from '../../models/protagonist-guidance.js';

export const MAX_GUIDANCE_FIELD_LENGTH = 500;
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

/**
 * System prompt builder module.
 * Composes system prompts (creative persona only) and data rules (for user message).
 * System message = creative persona; data/schema rules go in the user message.
 */

import type { GenreFrame } from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';

// Shared sections
import {
  STORYTELLING_GUIDELINES,
  ENDING_GUIDELINES,
  CONTINUITY_CONTEXT_USAGE,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
  PROTAGONIST_AFFECT,
  buildToneDirective,
} from './sections/shared/index.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';

// Continuation-specific sections
import {
  CONTINUATION_CONTINUITY_RULES,
  CONTINUATION_CONTINUITY_RULES_BIBLE,
  CHARACTER_CANON_VS_STATE,
} from './sections/continuation/index.js';

/**
 * Introduction establishing the LLM's role as a storyteller.
 */
const SYSTEM_INTRO = `You are an expert interactive fiction storyteller and Dungeon Master. Your role is to craft immersive, engaging narratives that respond to player choices while maintaining consistency with established world facts and character traits.`;

import { STRICT_CHOICE_GUIDELINES } from './sections/shared/choice-guidelines.js';
// Re-export for backward compatibility with any external consumers.
export { STRICT_CHOICE_GUIDELINES };

/**
 * Creative sections that belong in the system message.
 * These define persona, prose style, and creative guidelines.
 */
const CREATIVE_SECTIONS = [STORYTELLING_GUIDELINES, ENDING_GUIDELINES] as const;

/**
 * Shared data-schema sections used by both prompt types.
 * These define state tracking, inventory, health, and field separation rules.
 */
const SHARED_DATA_SECTIONS = [
  CONTINUITY_CONTEXT_USAGE,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
  PROTAGONIST_AFFECT,
] as const;

/**
 * Opening-specific data sections.
 */
const OPENING_DATA_SECTIONS = [] as const;

export interface ToneParams {
  tone: string;
  toneFeel?: readonly string[];
  toneAvoid?: readonly string[];
  genreFrame?: GenreFrame;
}

/**
 * Composes the creative system prompt (shared by both opening and continuation).
 * Contains persona, tone block (first position after intro), content policy,
 * prose style, and ending guidelines.
 */
export function composeCreativeSystemPrompt(toneParams?: ToneParams): string {
  const sections: string[] = [SYSTEM_INTRO];

  if (toneParams) {
    sections.push(buildToneDirective(toneParams.tone, toneParams.toneFeel, toneParams.toneAvoid));
  }

  const conventionsBlock = buildGenreConventionsSection(toneParams?.genreFrame);
  if (conventionsBlock) {
    sections.push(conventionsBlock);
  }

  sections.push(CONTENT_POLICY, ...CREATIVE_SECTIONS);
  return sections.join('\n\n');
}

/**
 * Composes the data rules for opening prompts.
 * These go in the user message, not the system message.
 */
export function composeOpeningDataRules(): string {
  const sections: string[] = [...SHARED_DATA_SECTIONS, ...OPENING_DATA_SECTIONS];
  return sections.join('\n\n');
}

/**
 * Composes the data rules for continuation prompts.
 * These go in the user message, not the system message.
 */
export function composeContinuationDataRules(options?: {
  hasStoryBible?: boolean;
}): string {
  const continuationSections = options?.hasStoryBible
    ? [CONTINUATION_CONTINUITY_RULES_BIBLE]
    : [CONTINUATION_CONTINUITY_RULES, CHARACTER_CANON_VS_STATE];

  const sections: string[] = [...SHARED_DATA_SECTIONS, ...continuationSections];
  return sections.join('\n\n');
}

/**
 * Builds the complete opening system prompt.
 * Contains creative persona only — data rules are in the user message.
 */
export function buildOpeningSystemPrompt(toneParams?: ToneParams): string {
  return composeCreativeSystemPrompt(toneParams);
}

/**
 * Builds the complete continuation system prompt.
 * Contains creative persona only — data rules are in the user message.
 */
export function buildContinuationSystemPrompt(toneParams?: ToneParams): string {
  return composeCreativeSystemPrompt(toneParams);
}

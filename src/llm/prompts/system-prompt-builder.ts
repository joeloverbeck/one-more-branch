/**
 * System prompt builder module.
 * Composes system prompts (creative persona only) and data rules (for user message).
 * System message = creative persona; data/schema rules go in the user message.
 */

import { CONTENT_POLICY } from '../content-policy.js';

// Shared sections
import {
  STORYTELLING_GUIDELINES,
  ENDING_GUIDELINES,
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
  PROTAGONIST_AFFECT,
} from './sections/shared/index.js';

// Opening-specific sections
import {
  OPENING_ESTABLISHMENT_RULES,
  OPENING_CHARACTER_CANON_GUIDANCE,
  OPENING_ACTIVE_STATE_QUALITY,
  OPENING_CANON_QUALITY,
} from './sections/opening/index.js';

// Continuation-specific sections
import {
  CONTINUATION_CONTINUITY_RULES,
  CHARACTER_CANON_VS_STATE,
  CONTINUATION_ACTIVE_STATE_QUALITY,
  CONTINUATION_CANON_QUALITY,
} from './sections/continuation/index.js';

/**
 * Introduction establishing the LLM's role as a storyteller.
 */
const SYSTEM_INTRO = `You are an expert interactive fiction storyteller and Dungeon Master. Your role is to craft immersive, engaging narratives that respond to player choices while maintaining consistency with established world facts and character traits.`;

/**
 * Strict choice guidelines for enforcing high-quality divergent choices.
 */
export const STRICT_CHOICE_GUIDELINES = `
CHOICE REQUIREMENTS:
Each choice should satisfy all of the following:

1. IN-CHARACTER: The protagonist would genuinely consider this action given their personality and situation
2. CONSEQUENTIAL: The choice meaningfully changes the story direction
3. DIVERGENT: Each choice leads to a DIFFERENT storyline - not variations of the same outcome
4. ACTIONABLE: Describes a concrete action with active verbs (not "think about" or "consider")
5. BALANCED: Mix of cautious, bold, and creative options when appropriate
6. VERB-FIRST: Start each choice with a clear immediate action verb (e.g., "Demand", "Flee", "Accept", "Attack")
7. SCENE-HOOKING: Each choice must introduce a distinct next-scene hook (new obstacle, new lead, new commitment, or changed relationship)

FORBIDDEN CHOICE PATTERNS:
- "Do nothing" / "Wait and see" (unless dramatically appropriate)
- Choices that contradict established character traits without justification
- Choices so similar they effectively lead to the same path
- Meta-choices like "See what happens" or "Continue exploring"
- Passive phrasing: "Consider talking to..." instead of "Talk to..."

DIVERGENCE ENFORCEMENT:
Each choice should change at least one of the following:
(1) Location, (2) Immediate goal, (3) NPC relationship or stance,
(4) Time pressure or urgency, (5) Control of a key item,
(6) Heat/attention level, (7) Injury or condition,
(8) Information revealed or thread advanced.
Each choice should change a different element from the list above.
If you cannot produce 2-3 choices that each change a different element, consider making this an ENDING.

CHOICE FORMATTING:
✅ GOOD: "Demand to know who the target is before agreeing" (verb-first, specific, creates negotiation scene)
✅ GOOD: "Flee through the back door before reinforcements arrive" (verb-first, changes location, creates chase scene)
❌ BAD: "Think about whether to trust him" (passive, no immediate action)
❌ BAD: "You could try to negotiate" (passive voice, vague)`;

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
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
  PROTAGONIST_AFFECT,
] as const;

/**
 * Opening-specific data sections.
 */
const OPENING_DATA_SECTIONS = [
  OPENING_ESTABLISHMENT_RULES,
  OPENING_CHARACTER_CANON_GUIDANCE,
  OPENING_ACTIVE_STATE_QUALITY,
  OPENING_CANON_QUALITY,
] as const;

/**
 * Continuation-specific data sections.
 */
const CONTINUATION_DATA_SECTIONS = [
  CONTINUATION_CONTINUITY_RULES,
  CHARACTER_CANON_VS_STATE,
  CONTINUATION_ACTIVE_STATE_QUALITY,
  CONTINUATION_CANON_QUALITY,
] as const;

/**
 * Composes the creative system prompt (shared by both opening and continuation).
 * Contains only persona, content policy, prose style, and ending guidelines.
 */
export function composeCreativeSystemPrompt(): string {
  return [SYSTEM_INTRO, CONTENT_POLICY, ...CREATIVE_SECTIONS].join('\n\n');
}

/**
 * Composes the data rules for opening prompts.
 * These go in the user message, not the system message.
 */
export function composeOpeningDataRules(options?: { choiceGuidance?: 'basic' | 'strict' }): string {
  const sections: string[] = [...SHARED_DATA_SECTIONS, ...OPENING_DATA_SECTIONS];

  if (options?.choiceGuidance === 'strict') {
    sections.push(STRICT_CHOICE_GUIDELINES);
  }

  return sections.join('\n\n');
}

/**
 * Composes the data rules for continuation prompts.
 * These go in the user message, not the system message.
 */
export function composeContinuationDataRules(options?: { choiceGuidance?: 'basic' | 'strict' }): string {
  const sections: string[] = [...SHARED_DATA_SECTIONS, ...CONTINUATION_DATA_SECTIONS];

  if (options?.choiceGuidance === 'strict') {
    sections.push(STRICT_CHOICE_GUIDELINES);
  }

  return sections.join('\n\n');
}

/**
 * Builds the complete opening system prompt.
 * Contains creative persona only — data rules are in the user message.
 */
export function buildOpeningSystemPrompt(): string {
  return composeCreativeSystemPrompt();
}

/**
 * Builds the complete continuation system prompt.
 * Contains creative persona only — data rules are in the user message.
 */
export function buildContinuationSystemPrompt(): string {
  return composeCreativeSystemPrompt();
}

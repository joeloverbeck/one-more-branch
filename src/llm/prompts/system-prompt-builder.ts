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

// Continuation-specific sections
import {
  CONTINUATION_CONTINUITY_RULES,
  CHARACTER_CANON_VS_STATE,
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
Each choice is a structured object with text, choiceType, and primaryDelta.
Each choice should satisfy all of the following:

1. IN-CHARACTER: The protagonist would genuinely consider this action given their personality and situation
2. CONSEQUENTIAL: The choice meaningfully changes the story direction
3. DIVERGENT: Each choice MUST have a different choiceType OR primaryDelta from all other choices
4. ACTIONABLE: Describes a concrete action with active verbs (not "think about" or "consider")
5. BALANCED: Mix of cautious, bold, and creative options when appropriate
6. VERB-FIRST: Start each choice text with a clear immediate action verb (e.g., "Demand", "Flee", "Accept", "Attack")
7. SCENE-HOOKING: Each choice must introduce a distinct next-scene hook

CHOICE TYPE VALUES (what the choice is ABOUT):
- TACTICAL_APPROACH: Choosing a method or tactic to accomplish the current objective
- MORAL_DILEMMA: A value conflict where each option has genuine ethical costs
- IDENTITY_EXPRESSION: Defining or revealing who the protagonist is
- RELATIONSHIP_SHIFT: Changing how the protagonist relates to another character
- RESOURCE_COMMITMENT: Spending, risking, or giving up something scarce
- INVESTIGATION: Choosing what to examine, learn, reveal, or conceal
- PATH_DIVERGENCE: Committing to a fundamentally different story direction
- CONFRONTATION: Choosing to engage, fight, threaten, or stand ground
- AVOIDANCE_RETREAT: Choosing to flee, hide, de-escalate, or avoid

PRIMARY DELTA VALUES (what the choice CHANGES in the world):
- LOCATION_CHANGE: Protagonist moves to a different place
- GOAL_SHIFT: Protagonist's immediate objective changes
- RELATIONSHIP_CHANGE: NPC stance/trust/dynamic shifts
- URGENCY_CHANGE: Time pressure increases or decreases
- ITEM_CONTROL: Possession of a significant object shifts
- EXPOSURE_CHANGE: How much attention/suspicion protagonist draws
- CONDITION_CHANGE: Physical condition, injury, or ailment gained/lost
- INFORMATION_REVEALED: New knowledge gained, mystery advances
- THREAT_SHIFT: Active danger introduced, escalated, or neutralized
- CONSTRAINT_CHANGE: Limitation on protagonist imposed or lifted

DIVERGENCE ENFORCEMENT:
Each choice MUST have a different choiceType OR a different primaryDelta from all other choices.
Do not repeat the same (choiceType, primaryDelta) combination across choices.
If you cannot produce at least 2 choices with different tags, consider making this an ENDING.

FORBIDDEN CHOICE PATTERNS:
- "Do nothing" / "Wait and see" (unless dramatically appropriate)
- Choices that contradict established character traits without justification
- Choices so similar they effectively lead to the same path
- Meta-choices like "See what happens" or "Continue exploring"
- Passive phrasing: "Consider talking to..." instead of "Talk to..."

CHOICE FORMATTING EXAMPLE:
{
  "text": "Demand to know who the target is before agreeing",
  "choiceType": "CONFRONTATION",
  "primaryDelta": "INFORMATION_REVEALED"
}`;

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
const OPENING_DATA_SECTIONS = [] as const;

/**
 * Continuation-specific data sections.
 */
const CONTINUATION_DATA_SECTIONS = [
  CONTINUATION_CONTINUITY_RULES,
  CHARACTER_CANON_VS_STATE,
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

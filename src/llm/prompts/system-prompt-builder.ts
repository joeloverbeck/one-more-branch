/**
 * System prompt builder module.
 * Composes the full system prompt from modular sections.
 * Provides separate builders for opening and continuation prompts.
 */

import { CONTENT_POLICY } from '../content-policy.js';
import type { PromptOptions } from '../types.js';

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

CHOICE REQUIREMENTS (CRITICAL):
Each choice MUST satisfy ALL of the following:

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
Each choice MUST change at least ONE of the following:
(1) Location, (2) Immediate goal, (3) NPC relationship or stance,
(4) Time pressure or urgency, (5) Control of a key item,
(6) Heat/attention level, (7) Injury or condition.
If you cannot produce 2-3 choices that each change a different element, consider making this an ENDING.

CHOICE FORMATTING:
✅ GOOD: "Demand to know who the target is before agreeing" (verb-first, specific, creates negotiation scene)
✅ GOOD: "Flee through the back door before reinforcements arrive" (verb-first, changes location, creates chase scene)
❌ BAD: "Think about whether to trust him" (passive, no immediate action)
❌ BAD: "You could try to negotiate" (passive voice, vague)`;

/**
 * Chain-of-thought reasoning instructions for narrative generation.
 */
export const COT_SYSTEM_ADDITION = `

REASONING PROCESS:
Before generating your response, think through your approach inside <thinking> tags:
1. Consider character motivations and current emotional state
2. Plan how this scene advances toward the story arc
3. Brainstorm 3-4 potential choices, then select the best 3 (add a 4th only if the situation truly warrants another distinct, meaningful path)
4. Verify each choice is in-character, consequential, and divergent

Format your response as:
<thinking>[your reasoning]</thinking>
<output>{JSON response}</output>

IMPORTANT: Your final JSON must be inside <output> tags.`;

/**
 * Shared narrative sections used by both prompt types.
 */
const SHARED_SECTIONS = [
  STORYTELLING_GUIDELINES,
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
  PROTAGONIST_AFFECT,
  ENDING_GUIDELINES,
] as const;

/**
 * Opening-specific narrative sections.
 */
const OPENING_SECTIONS = [
  OPENING_ESTABLISHMENT_RULES,
  OPENING_CHARACTER_CANON_GUIDANCE,
  OPENING_ACTIVE_STATE_QUALITY,
  OPENING_CANON_QUALITY,
] as const;

/**
 * Continuation-specific narrative sections.
 */
const CONTINUATION_SECTIONS = [
  CONTINUATION_CONTINUITY_RULES,
  CHARACTER_CANON_VS_STATE,
  CONTINUATION_ACTIVE_STATE_QUALITY,
  CONTINUATION_CANON_QUALITY,
] as const;

/**
 * Composes the opening system prompt from all relevant sections.
 * Focuses on establishment and character concept fidelity.
 */
export function composeOpeningSystemPrompt(): string {
  return [SYSTEM_INTRO, CONTENT_POLICY, ...SHARED_SECTIONS, ...OPENING_SECTIONS].join('\n\n');
}

/**
 * Composes the continuation system prompt from all relevant sections.
 * Focuses on continuity and consistency with established facts.
 */
export function composeContinuationSystemPrompt(): string {
  return [SYSTEM_INTRO, CONTENT_POLICY, ...SHARED_SECTIONS, ...CONTINUATION_SECTIONS].join('\n\n');
}

/**
 * Builds the complete opening system prompt with optional enhancements.
 * Use this for generating the first page of a story.
 */
export function buildOpeningSystemPrompt(options?: PromptOptions): string {
  let prompt = composeOpeningSystemPrompt();

  // Add strict choice guidelines if requested
  if (options?.choiceGuidance === 'strict') {
    prompt += STRICT_CHOICE_GUIDELINES;
  }

  // Add CoT instructions if enabled
  if (options?.enableChainOfThought) {
    prompt += COT_SYSTEM_ADDITION;
  }

  return prompt;
}

/**
 * Builds the complete continuation system prompt with optional enhancements.
 * Use this for generating subsequent pages of a story.
 */
export function buildContinuationSystemPrompt(options?: PromptOptions): string {
  let prompt = composeContinuationSystemPrompt();

  // Add strict choice guidelines if requested
  if (options?.choiceGuidance === 'strict') {
    prompt += STRICT_CHOICE_GUIDELINES;
  }

  // Add CoT instructions if enabled
  if (options?.enableChainOfThought) {
    prompt += COT_SYSTEM_ADDITION;
  }

  return prompt;
}

/**
 * @deprecated Use buildOpeningSystemPrompt or buildContinuationSystemPrompt instead.
 * This function is kept for backward compatibility and defaults to the continuation prompt.
 */
export function buildSystemPrompt(options?: PromptOptions): string {
  return buildContinuationSystemPrompt(options);
}

/**
 * @deprecated Use composeContinuationSystemPrompt instead.
 * This function is kept for backward compatibility.
 */
export function composeSystemPrompt(): string {
  return composeContinuationSystemPrompt();
}

// Re-export constants for backward compatibility
export { SYSTEM_INTRO, SHARED_SECTIONS as NARRATIVE_SECTIONS };

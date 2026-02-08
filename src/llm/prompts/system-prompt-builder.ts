/**
 * System prompt builder module.
 * Composes the full system prompt from modular sections.
 */

import { CONTENT_POLICY } from '../content-policy.js';
import type { PromptOptions } from '../types.js';
import {
  STORYTELLING_GUIDELINES,
  CONTINUITY_RULES,
  ENDING_GUIDELINES,
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
  CHARACTER_CANON_VS_STATE,
  PROTAGONIST_AFFECT,
  ACTIVE_STATE_QUALITY,
  CANON_QUALITY,
} from './sections/index.js';

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
 * All narrative sections in their proper order.
 * This tuple type ensures no section is accidentally omitted.
 */
const NARRATIVE_SECTIONS = [
  STORYTELLING_GUIDELINES,
  CONTINUITY_RULES,
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
  CHARACTER_CANON_VS_STATE,
  PROTAGONIST_AFFECT,
  ACTIVE_STATE_QUALITY,
  CANON_QUALITY,
  ENDING_GUIDELINES,
] as const;

/**
 * Composes the base system prompt from all sections.
 * This is the core prompt without any optional enhancements.
 */
export function composeSystemPrompt(): string {
  return [SYSTEM_INTRO, CONTENT_POLICY, ...NARRATIVE_SECTIONS].join('\n\n');
}

/**
 * Builds the complete system prompt with optional enhancements.
 */
export function buildSystemPrompt(options?: PromptOptions): string {
  let prompt = composeSystemPrompt();

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

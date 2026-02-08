/**
 * System prompt exports for narrative generation.
 * Delegates to the modular system-prompt-builder for composition.
 */

import { CONTENT_POLICY } from '../content-policy.js';
import type { PromptOptions } from '../types.js';

export {
  buildSystemPrompt,
  composeSystemPrompt,
  STRICT_CHOICE_GUIDELINES,
  COT_SYSTEM_ADDITION,
} from './system-prompt-builder.js';

import { composeSystemPrompt } from './system-prompt-builder.js';

/**
 * The complete system prompt for narrative page generation.
 * Includes all sections for storytelling, state management, and quality criteria.
 */
export const SYSTEM_PROMPT = composeSystemPrompt();

/**
 * Minimal system prompt for structure generation.
 * Does NOT include state/inventory/health management or choice guidelines
 * since structure generation only produces story arcs, not narrative pages.
 */
export const STRUCTURE_SYSTEM_PROMPT = `You are an expert interactive fiction storyteller specializing in story structure and dramatic arc design.

${CONTENT_POLICY}

STRUCTURE DESIGN GUIDELINES:
- Create compelling three-act dramatic structures.
- Design beats as flexible milestones that allow branching paths.
- Ensure stakes escalate naturally through the narrative.
- Make entry conditions clear but not overly prescriptive.
- Balance setup, confrontation, and resolution across acts.
- Consider pacing suitable for 15-50 page interactive stories.`;

/**
 * Builds the system prompt for structure generation with optional enhancements.
 * Uses a minimal prompt focused only on structure design.
 */
export function buildStructureSystemPrompt(options?: PromptOptions): string {
  let prompt = STRUCTURE_SYSTEM_PROMPT;

  if (options?.enableChainOfThought) {
    prompt += `

REASONING PROCESS:
Before generating your response, think through your approach inside <thinking> tags:
1. Consider how the character concept drives the story
2. Plan dramatic arc and escalation
3. Design beats that allow for player agency and branching

Format your response as:
<thinking>[your reasoning]</thinking>
<output>{JSON response}</output>

IMPORTANT: Your final JSON must be inside <output> tags.`;
  }

  return prompt;
}

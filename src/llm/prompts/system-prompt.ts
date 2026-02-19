/**
 * System prompt exports for narrative generation.
 * Delegates to the modular system-prompt-builder for composition.
 */

import { CONTENT_POLICY } from '../content-policy.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

export {
  buildOpeningSystemPrompt,
  buildContinuationSystemPrompt,
  composeCreativeSystemPrompt,
  composeOpeningDataRules,
  composeContinuationDataRules,
  STRICT_CHOICE_GUIDELINES,
} from './system-prompt-builder.js';

const STRUCTURE_ROLE_INTRO = `You are an expert interactive fiction storyteller specializing in story structure and dramatic arc design.`;

const STRUCTURE_DESIGN_GUIDELINES = `STRUCTURE DESIGN GUIDELINES:
- Create compelling dramatic structures (typically three-act).
- Design beats as flexible milestones that allow branching paths.
- Ensure stakes escalate naturally through the narrative.
- Make entry conditions clear but not overly prescriptive.
- Balance setup, confrontation, and resolution across acts.
- Consider pacing suitable for 15-50 page interactive stories.`;

/**
 * Builds the system prompt for structure generation.
 * Accepts tone to inject a tone block at the top of the prompt.
 */
export function buildStructureSystemPrompt(tone?: string): string {
  const sections: string[] = [STRUCTURE_ROLE_INTRO];

  if (tone) {
    sections.push(buildToneDirective(tone));
  }

  sections.push(CONTENT_POLICY);
  sections.push(STRUCTURE_DESIGN_GUIDELINES);

  return sections.join('\n\n');
}

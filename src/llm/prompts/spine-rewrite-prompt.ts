import type { StorySpine } from '../../models/story-spine.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildToneDirective } from './sections/shared/tone-block.js';
import { buildSpineSection } from './sections/shared/spine-section.js';

export interface SpineRewriteContext {
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: string;
  readonly currentSpine: StorySpine;
  readonly invalidatedElement: 'dramatic_question' | 'antagonistic_force' | 'need_want';
  readonly deviationReason: string;
  readonly narrativeSummary: string;
}

const SPINE_REWRITE_ROLE = `You are a story architect performing emergency spine surgery on interactive branching fiction. The story's thematic backbone has been irreversibly broken by player choices, and you must design a NEW spine that:
1. Honors everything that has already happened in the narrative
2. Provides fresh dramatic tension and a new central question
3. Creates a new need-want gap for the protagonist to navigate
4. Introduces or transforms the antagonistic force to create renewed pressure`;

const SPINE_REWRITE_GUIDELINES = `SPINE REWRITE GUIDELINES:
- The new spine must feel like a natural evolution from the story so far, not a hard reset.
- The invalidated element MUST change meaningfully. Other elements may stay the same if they still work.
- The new central dramatic question must arise organically from what has already happened.
- The new need-want dynamic should reflect how the protagonist has been changed by their journey.
- The storySpineType, conflictAxis, and conflictType CAN change if the narrative warrants it, but don't change them arbitrarily.
- The characterArcType SHOULD change if the protagonist's trajectory has fundamentally shifted.`;

export function buildSpineRewritePrompt(context: SpineRewriteContext): ChatMessage[] {
  const systemSections: string[] = [SPINE_REWRITE_ROLE];

  if (context.tone) {
    systemSections.push(buildToneDirective(context.tone));
  }

  systemSections.push(CONTENT_POLICY);
  systemSections.push(SPINE_REWRITE_GUIDELINES);

  const currentSpineSection = buildSpineSection(context.currentSpine);

  const invalidatedLabel =
    context.invalidatedElement === 'dramatic_question'
      ? 'Central Dramatic Question'
      : context.invalidatedElement === 'antagonistic_force'
        ? 'Primary Antagonistic Force'
        : 'Protagonist Need vs Want';

  const userPrompt = `The story spine has been irreversibly broken. Rewrite it to accommodate the narrative direction.

CHARACTER CONCEPT:
${context.characterConcept}

WORLDBUILDING:
${context.worldbuilding}

CURRENT (BROKEN) SPINE:
${currentSpineSection}
INVALIDATED ELEMENT: ${invalidatedLabel}
REASON: ${context.deviationReason}

NARRATIVE SUMMARY (what has happened so far):
${context.narrativeSummary}

Generate a single new spine that evolves naturally from this narrative state. The ${invalidatedLabel.toLowerCase()} MUST change meaningfully. Other fields may remain if they still serve the story.`;

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userPrompt },
  ];
}

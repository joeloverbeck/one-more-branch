import { formatProtagonistAffect, type ProtagonistAffect } from '../../../models/protagonist-affect.js';
import type { AncestorSummary } from '../../types.js';

/**
 * Builds the protagonist's current emotional state section for continuation prompts.
 * This shows the LLM how the protagonist is feeling at the start of this scene
 * (carried over from the previous page's protagonistAffect).
 */
export function buildProtagonistAffectSection(affect: ProtagonistAffect | undefined): string {
  if (!affect) {
    return '';
  }
  return `PROTAGONIST'S CURRENT EMOTIONAL STATE:
${formatProtagonistAffect(affect)}

`;
}

/**
 * Builds extended scene context with hierarchical depth:
 * - Structured summaries for older ancestors (oldest-first)
 * - Full text for grandparent scene (style continuity)
 * - Full text for parent/previous scene (style continuity)
 */
export function buildSceneContextSection(
  previousNarrative: string,
  grandparentNarrative: string | null,
  ancestorSummaries: readonly AncestorSummary[],
): string {
  let result = '';

  if (ancestorSummaries.length > 0) {
    result += `EARLIER SCENE SUMMARIES (for factual/thematic continuity):\n`;
    for (let i = 0; i < ancestorSummaries.length; i++) {
      result += `[Scene ${i + 1}] ${ancestorSummaries[i]!.summary}\n`;
    }
    result += '\n';
  }

  if (grandparentNarrative) {
    result += `SCENE BEFORE LAST (full text for style continuity):
${grandparentNarrative}

`;
  }

  result += `PREVIOUS SCENE (full text for style continuity):
${previousNarrative}

`;

  return result;
}

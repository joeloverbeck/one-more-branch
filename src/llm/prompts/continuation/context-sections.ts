import { formatProtagonistAffect, type ProtagonistAffect } from '../../../models/protagonist-affect.js';

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
 * Builds extended scene context with both previous and grandparent narratives.
 */
export function buildSceneContextSection(
  previousNarrative: string,
  grandparentNarrative: string | null,
): string {
  let result = '';

  if (grandparentNarrative) {
    result += `SCENE BEFORE LAST:
${grandparentNarrative}

`;
  }

  result += `PREVIOUS SCENE:
${previousNarrative}

`;

  return result;
}

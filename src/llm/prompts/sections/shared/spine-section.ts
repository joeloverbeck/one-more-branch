import type { StorySpine } from '../../../../models/story-spine.js';

/**
 * Builds a STORY SPINE section for prompt injection.
 * Returns empty string if no spine is available.
 *
 * This section communicates the invariant narrative backbone to any prompt
 * that needs to maintain thematic coherence: structure, planner, lorekeeper,
 * writer, and analyst prompts all receive the same spine context.
 */
export function buildSpineSection(spine?: StorySpine): string {
  if (!spine) {
    return '';
  }

  return `STORY SPINE (invariant narrative backbone — every scene must serve this):
Story Pattern: ${spine.storySpineType}
Conflict Axis: ${spine.conflictType}
Character Arc: ${spine.characterArcType}
Central Dramatic Question: ${spine.centralDramaticQuestion}
Protagonist Need: ${spine.protagonistNeedVsWant.need}
Protagonist Want: ${spine.protagonistNeedVsWant.want}
Need–Want Dynamic: ${spine.protagonistNeedVsWant.dynamic}
Antagonistic Force: ${spine.primaryAntagonisticForce.description}
Pressure Mechanism: ${spine.primaryAntagonisticForce.pressureMechanism}
Every act must advance or complicate the protagonist's relationship to the central dramatic question.

`;
}

import type { BeatRole, StoryAct, StoryBeat, StoryStructure } from '../models/story-arc';
import type { StructureGenerationResult } from './structure-types';

const VALID_BEAT_ROLES: readonly string[] = ['setup', 'escalation', 'turning_point', 'resolution'];

function parseBeatRole(role: string): BeatRole {
  if (VALID_BEAT_ROLES.includes(role)) {
    return role as BeatRole;
  }
  return 'escalation';
}

/**
 * Creates StoryStructure from raw generation result.
 * Assigns hierarchical IDs to beats (e.g., "1.1", "1.2", "2.1").
 */
export function createStoryStructure(result: StructureGenerationResult): StoryStructure {
  const acts: StoryAct[] = result.acts.map((actData, actIndex) => {
    const actId = String(actIndex + 1);
    const beats: StoryBeat[] = actData.beats.map((beatData, beatIndex) => ({
      id: `${actId}.${beatIndex + 1}`,
      name: beatData.name,
      description: beatData.description,
      objective: beatData.objective,
      role: parseBeatRole(beatData.role),
    }));

    return {
      id: actId,
      name: actData.name,
      objective: actData.objective,
      stakes: actData.stakes,
      entryCondition: actData.entryCondition,
      beats,
    };
  });

  return {
    acts,
    overallTheme: result.overallTheme,
    premise: result.premise,
    pacingBudget: result.pacingBudget,
    generatedAt: new Date(),
  };
}
